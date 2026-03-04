/**
 * Airtable 同步服务
 *
 * 负责将 Airtable 数据同步到 Supabase 缓存表
 *
 * 设计原则：
 * - 使用 Field ID 代替字段名，确保字段重命名时代码仍然有效
 * - 使用 View 控制同步范围
 * - 遵守 Airtable API 频率限制（5 请求/秒）
 * - 使用 upsert 实现增量同步
 * - 响应式错误处理：只有当 Airtable 报错时才分析错误并告警
 *
 * @example
 * ```typescript
 * import { airtableSyncService } from '@libs/airtable';
 *
 * // 同步所有表
 * const result = await airtableSyncService.syncAll();
 *
 * // 只同步 PO 表
 * const result = await airtableSyncService.syncAll({ tables: ['po'] });
 * ```
 */

import { db } from '@libs/database';
import {
  cachedPO,
  cachedPayment,
  cachedVerification,
  type NewCachedPO,
  type NewCachedPayment,
  type NewCachedVerification,
} from '@libs/database/schema/airtable-cache';
import {
  syncLog,
  type NewSyncLog,
  syncStatus,
  triggerType,
  syncType,
} from '@libs/database/schema/sync-log';
import { createAirtableClient, isAirtableConfigured, AirtableApiError } from './client';
import { collectAll } from './utils';
import { desc, eq } from 'drizzle-orm';
import {
  PO_FIELDS,
  PAYMENT_FIELDS,
  VERIFICATION_FIELDS,
  parseAirtableError,
} from './field-mappings';
import { nanoid } from 'nanoid';

// ========== 类型定义 ==========

/**
 * 同步统计信息
 */
export interface SyncStats {
  /** 表名 */
  table: string;
  /** 总记录数 */
  total: number;
  /** 新增记录数 */
  inserted: number;
  /** 更新记录数 */
  updated: number;
  /** 删除记录数 */
  deleted: number;
  /** 错误数 */
  errors: number;
  /** 耗时（毫秒） */
  duration: number;
  /** API 调用次数（Airtable 每次最多返回 100 条） */
  apiCalls: number;
}

/**
 * 同步选项
 */
export interface SyncOptions {
  /** 是否全量同步（默认增量） */
  fullSync?: boolean;
  /** 指定要同步的表 */
  tables?: ('po' | 'payment' | 'verification')[];
  /** Airtable View 名称 */
  view?: string;
  /** 触发方式 */
  triggerType?: 'manual' | 'scheduled';
  /** 触发用户 ID */
  triggeredBy?: string;
}

/**
 * 同步结果
 */
export interface SyncResult {
  /** 是否成功 */
  success: boolean;
  /** 各表同步统计 */
  stats: SyncStats[];
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 错误信息列表 */
  errors: string[];
  /** 同步完成时间 */
  syncedAt: Date;
}

// ========== Airtable 字段类型定义 ==========
// 使用 Field ID 作为 key，类型定义保持兼容

/**
 * PO 表字段类型
 */
type POFields = Record<string, unknown>;

/**
 * 收款表字段类型
 */
type PaymentFields = Record<string, unknown>;

/**
 * 核销表字段类型
 */
type VerificationFields = Record<string, unknown>;

// ========== 频率限制常量 ==========

/**
 * Airtable API 频率限制延迟
 * 250ms = 4 请求/秒（留余量，Airtable 限制 5 请求/秒）
 */
const RATE_LIMIT_DELAY = 250;

/**
 * 延迟函数
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ========== 工具函数 ==========

/**
 * 解析 Airtable 日期字符串为 Date 对象
 */
function parseDate(dateStr: unknown): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const date = new Date(String(dateStr));
  return isNaN(date.getTime()) ? null : date;
}

/**
 * 解析数字字段
 */
function parseNumber(value: unknown): string {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'number') return String(value);
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? '0' : String(parsed);
}

/**
 * 从数组或单值中提取字符串
 */
function extractString(value: unknown): string {
  if (Array.isArray(value)) {
    return value[0] ? String(value[0]) : '';
  }
  return value ? String(value) : '';
}

// ========== 同步服务类 ==========

/**
 * Airtable 同步服务
 */
export class AirtableSyncService {
  /** 默认 View 名称 */
  private readonly defaultView = 'API_Sync_Active';

  /**
   * 同步所有表
   */
  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const stats: SyncStats[] = [];
    const logId = nanoid();

    // 创建同步日志记录
    const logData: NewSyncLog = {
      id: logId,
      syncType: syncType.AIRTABLE,
      status: syncStatus.RUNNING,
      triggerType: options.triggerType || triggerType.MANUAL,
      triggeredBy: options.triggeredBy || null,
      options: {
        tables: options.tables,
        view: options.view,
        fullSync: options.fullSync,
      },
      startedAt: new Date(),
    };

    try {
      await db.insert(syncLog).values(logData);
    } catch {
      // 日志创建失败不影响同步
      console.warn('[Airtable Sync] 无法创建同步日志记录');
    }

    // 全量同步：先清空缓存表
    if (options.fullSync) {
      console.log('[Airtable Sync] 执行全量同步，清空缓存表...');
      try {
        await this.clearCache();
        console.log('[Airtable Sync] 缓存表已清空');
      } catch (error) {
        console.error('[Airtable Sync] 清空缓存表失败:', error);
        errors.push('清空缓存表失败');
      }
    }

    // 检查配置
    if (!isAirtableConfigured()) {
      const result: SyncResult = {
        success: false,
        stats: [],
        totalDuration: 0,
        errors: ['Airtable is not configured. Please set AIRTABLE_API_KEY and BASE IDs.'],
        syncedAt: new Date(),
      };

      await this.updateLog(logId, {
        status: syncStatus.FAILED,
        duration: 0,
        stats: [],
        errors: result.errors,
        success: false,
      });

      return result;
    }

    // 确定要同步的表
    const tablesToSync = options.tables || ['po', 'payment', 'verification'];
    const view = options.view || this.defaultView;

    try {
      // 按顺序同步各表，遵守频率限制
      for (const table of tablesToSync) {
        await delay(RATE_LIMIT_DELAY);

        let stat: SyncStats;
        try {
          switch (table) {
            case 'po':
              stat = await this.syncPO({ ...options, view });
              break;
            case 'payment':
              stat = await this.syncPayment({ ...options, view });
              break;
            case 'verification':
              stat = await this.syncVerification({ ...options, view });
              break;
            default:
              continue;
          }
        } catch (error) {
          // 捕获 Airtable API 错误并转换为用户友好的错误消息
          const errorMessage = parseAirtableError(error);
          errors.push(`[${table}] ${errorMessage}`);
          stat = {
            table,
            total: 0,
            inserted: 0,
            updated: 0,
            deleted: 0,
            errors: 1,
            duration: 0,
            apiCalls: 0,
          };
        }

        stats.push(stat);
        if (stat.errors > 0 && !errors.some(e => e.includes(table))) {
          errors.push(`${table} 表同步有 ${stat.errors} 条记录失败`);
        }
      }

      const result: SyncResult = {
        success: errors.length === 0,
        stats,
        totalDuration: Date.now() - startTime,
        errors,
        syncedAt: new Date(),
      };

      // 更新同步日志
      await this.updateLog(logId, {
        status: result.success ? syncStatus.SUCCESS : syncStatus.PARTIAL,
        duration: result.totalDuration,
        stats: result.stats,
        errors: result.errors,
        success: result.success,
      });

      return result;
    } catch (error) {
      const errorMessage = parseAirtableError(error);
      errors.push(errorMessage);

      const result: SyncResult = {
        success: false,
        stats,
        totalDuration: Date.now() - startTime,
        errors,
        syncedAt: new Date(),
      };

      // 更新同步日志
      await this.updateLog(logId, {
        status: syncStatus.FAILED,
        duration: result.totalDuration,
        stats: result.stats,
        errors: result.errors,
        success: false,
      });

      return result;
    }
  }

  /**
   * 更新同步日志
   */
  private async updateLog(logId: string, data: {
    status: string;
    duration: number;
    stats: SyncStats[];
    errors: string[];
    success: boolean;
  }): Promise<void> {
    try {
      await db
        .update(syncLog)
        .set({
          status: data.status,
          duration: data.duration,
          stats: data.stats,
          errors: data.errors,
          success: data.success,
          completedAt: new Date(),
        })
        .where(eq(syncLog.id, logId));
    } catch (error) {
      console.warn('[Airtable Sync] 无法更新同步日志记录:', error);
    }
  }

  /**
   * 同步 PO 表
   */
  private async syncPO(options: SyncOptions): Promise<SyncStats> {
    const startTime = Date.now();
    const stats: SyncStats = {
      table: 'PO',
      total: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      duration: 0,
      apiCalls: 0,
    };

    // 使用 Field ID 指定要获取的字段（API 请求用 Field ID，返回数据用字段名）
    const fieldsToFetch = [
      PO_FIELDS.PI,              // PI
      PO_FIELDS.PRODUCTION_NO,   // 生产单
      PO_FIELDS.CUSTOMER,        // 客户
      PO_FIELDS.TOTAL_AMOUNT,    // 订单总金额
      PO_FIELDS.PAYMENT_COMPLETE,// 收款完成
      PO_FIELDS.SHIPPED,         // 出货
      PO_FIELDS.CREATED_TIME,    // 创建时间
      PO_FIELDS.REMARKS,         // 备注
    ];

    const client = createAirtableClient<POFields>('PO', { base: 'order' });
    const { records, apiCalls } = await collectAll(client, { view: options.view, fields: fieldsToFetch });

    stats.total = records.length;
    stats.apiCalls = apiCalls;

    for (const record of records) {
      try {
        const fields = record.fields;

        // 注意：Airtable API 返回的字段 key 是字段名，不是 Field ID
        // Field ID 只用于 fields 参数过滤，读取数据要用字段名

        // 转换核销状态：checkbox → string
        const verificationStatus = fields['收款完成'] === true
          ? 'completed'
          : 'pending';

        // 转换出货状态：checkbox → string
        const shippingStatus = fields['出货'] === true
          ? 'shipped'
          : 'pending';

        // 客户名称可能是数组或字符串
        const customerName = extractString(fields['客户']);

        const data: NewCachedPO = {
          id: record.id,
          piNo: extractString(fields['PI']),
          productionNo: extractString(fields['生产单']),
          customerName,
          totalAmount: parseNumber(fields['订单总金额']),
          outstandingBalance: '0', // 未结欠款需要从其他地方计算
          verificationStatus,
          shippingStatus,
          orderDate: parseDate(fields['创建时间']),
          remarks: fields['备注'] ? String(fields['备注']) : null,
          rawData: fields,
          syncedAt: new Date(),
          updatedAt: new Date(),
        };

        await db
          .insert(cachedPO)
          .values(data)
          .onConflictDoUpdate({
            target: cachedPO.id,
            set: {
              piNo: data.piNo,
              productionNo: data.productionNo,
              customerName: data.customerName,
              totalAmount: data.totalAmount,
              outstandingBalance: data.outstandingBalance,
              verificationStatus: data.verificationStatus,
              shippingStatus: data.shippingStatus,
              orderDate: data.orderDate,
              remarks: data.remarks,
              rawData: data.rawData,
              syncedAt: data.syncedAt,
              updatedAt: data.updatedAt,
            },
          });

        stats.inserted++;
      } catch (error) {
        stats.errors++;
        console.error(`[Airtable Sync] PO 记录 ${record.id} 同步失败:`, error);
      }
    }

    stats.duration = Date.now() - startTime;
    return stats;
  }

  /**
   * 同步收款表
   */
  private async syncPayment(options: SyncOptions): Promise<SyncStats> {
    const startTime = Date.now();
    const stats: SyncStats = {
      table: '收款登记',
      total: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      duration: 0,
      apiCalls: 0,
    };

    // 使用 Field ID 指定要获取的字段
    const fieldsToFetch = [
      PAYMENT_FIELDS.PAYMENT_ID,         // 收款ID
      PAYMENT_FIELDS.CUSTOMER,           // 客户名称
      PAYMENT_FIELDS.RECEIVED_AMOUNT,    // 实收金额
      PAYMENT_FIELDS.UNALLOCATED_BALANCE,// 待分配余额
      PAYMENT_FIELDS.PAYMENT_TYPE,       // 付款类型
      PAYMENT_FIELDS.PAYMENT_DATE,       // 收款日期
      PAYMENT_FIELDS.BANK_ACCOUNT,       // 收款账户
      PAYMENT_FIELDS.BANK_NOTICE,        // 银行收款通知
      PAYMENT_FIELDS.REMARKS,            // 备注
    ];

    const client = createAirtableClient<PaymentFields>('收款登记', { base: 'order' });
    const { records, apiCalls } = await collectAll(client, { view: options.view, fields: fieldsToFetch });

    stats.total = records.length;
    stats.apiCalls = apiCalls;

    for (const record of records) {
      try {
        const fields = record.fields;

        // 注意：Airtable API 返回的字段 key 是字段名，不是 Field ID
        const data: NewCachedPayment = {
          id: record.id,
          paymentNo: extractString(fields['收款ID']),
          customerName: extractString(fields['客户名称']),
          receivedAmount: parseNumber(fields['实收金额（自动提取）']),
          unallocatedBalance: parseNumber(fields['待分配余额']),
          paymentMethod: extractString(fields['付款类型']),
          receivedDate: parseDate(fields['收款日期']),
          bankAccount: extractString(fields['收款账户']),
          bankNotice: fields['银行收款通知'] ? String(fields['银行收款通知']) : null,
          remarks: fields['备注'] ? String(fields['备注']) : null,
          rawData: fields,
          syncedAt: new Date(),
          updatedAt: new Date(),
        };

        await db
          .insert(cachedPayment)
          .values(data)
          .onConflictDoUpdate({
            target: cachedPayment.id,
            set: {
              paymentNo: data.paymentNo,
              customerName: data.customerName,
              receivedAmount: data.receivedAmount,
              unallocatedBalance: data.unallocatedBalance,
              paymentMethod: data.paymentMethod,
              receivedDate: data.receivedDate,
              bankAccount: data.bankAccount,
              bankNotice: data.bankNotice,
              remarks: data.remarks,
              rawData: data.rawData,
              syncedAt: data.syncedAt,
              updatedAt: data.updatedAt,
            },
          });

        stats.inserted++;
      } catch (error) {
        stats.errors++;
        console.error(`[Airtable Sync] 收款记录 ${record.id} 同步失败:`, error);
      }
    }

    stats.duration = Date.now() - startTime;
    return stats;
  }

  /**
   * 同步核销表
   */
  private async syncVerification(options: SyncOptions): Promise<SyncStats> {
    const startTime = Date.now();
    const stats: SyncStats = {
      table: '收款_中间表',
      total: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      duration: 0,
      apiCalls: 0,
    };

    // 注意：Airtable API 返回的字段 key 是字段名，    // 字段名: 关联订单, 关联收款记录, 本次分配金额, 核销类型, 收款日期, 预收款分配备注
    const client = createAirtableClient<VerificationFields>('收款_中间表', { base: 'order' });
    const { records, apiCalls } = await collectAll(client, { view: options.view });

    stats.total = records.length;
    stats.apiCalls = apiCalls;

    for (const record of records) {
      try {
        const fields = record.fields;

        // 注意：使用字段名访问数据（Airtable API 返回的 key 是字段名）
        // 字段名 -> Field ID 映射见 field-mappings.ts
        const poIds = (fields['关联订单'] || fields[VERIFICATION_FIELDS.PO_ID]) as string[] | undefined;
        const paymentIds = (fields['关联收款记录'] || fields[VERIFICATION_FIELDS.PAYMENT_ID]) as string[] | undefined;

        // 关联字段可为空，允许同步不完整的记录
        // 业务场景：客人迟迟没付款、业务员忘记分配、客人提早付款等
        const data: NewCachedVerification = {
          id: record.id,
          poId: poIds?.[0] || null,
          paymentId: paymentIds?.[0] || null,
          allocatedAmount: parseNumber(fields['本次分配金额'] ?? fields[VERIFICATION_FIELDS.ALLOCATED_AMOUNT]),
          verificationType: extractString(fields['核销类型'] ?? fields[VERIFICATION_FIELDS.VERIFICATION_TYPE]) || 'normal',
          verificationDate: parseDate(fields['收款日期'] ?? fields[VERIFICATION_FIELDS.VERIFICATION_DATE]),
          remarks: (fields['预收款分配备注'] ?? fields[VERIFICATION_FIELDS.REMARKS]) ? String(fields['预收款分配备注'] ?? fields[VERIFICATION_FIELDS.REMARKS]) : null,
          rawData: fields,
          syncedAt: new Date(),
          updatedAt: new Date(),
        };

        await db
          .insert(cachedVerification)
          .values(data)
          .onConflictDoUpdate({
            target: cachedVerification.id,
            set: {
              poId: data.poId,
              paymentId: data.paymentId,
              allocatedAmount: data.allocatedAmount,
              verificationType: data.verificationType,
              verificationDate: data.verificationDate,
              remarks: data.remarks,
              rawData: data.rawData,
              syncedAt: data.syncedAt,
              updatedAt: data.updatedAt,
            },
          });

        stats.inserted++;
      } catch (error) {
        stats.errors++;
        console.error(`[Airtable Sync] 核销记录 ${record.id} 同步失败:`, error);
      }
    }

    // 注意：现在所有记录都会同步，包括关联不完整的记录
    // errors 只统计真正的同步错误（如数据库写入失败）
    stats.duration = Date.now() - startTime;
    return stats;
  }

  /**
   * 获取最后同步时间
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const result = await db
        .select({ syncedAt: cachedPO.syncedAt })
        .from(cachedPO)
        .orderBy(desc(cachedPO.syncedAt))
        .limit(1);

      return result[0]?.syncedAt || null;
    } catch {
      return null;
    }
  }

  /**
   * 清空缓存表
   */
  async clearCache(): Promise<void> {
    await db.delete(cachedVerification);
    await db.delete(cachedPayment);
    await db.delete(cachedPO);
  }
}

// ========== 导出单例实例 ==========

export const airtableSyncService = new AirtableSyncService();
