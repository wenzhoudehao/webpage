/**
 * Airtable 集成模块
 *
 * 支持多 Base（订单、样品、客户）
 * 支持 View 过滤控制同步数据
 *
 * @example
 * ```typescript
 * import { createAirtableClient, buildFilter, collectAll } from '@libs/airtable';
 *
 * // 订单 Base - PO 表
 * const poTable = createAirtableClient('PO表', { base: 'order' });
 *
 * // 通过 View 获取待同步数据
 * const { records } = await poTable.list({ view: '待同步' });
 *
 * // 样品 Base
 * const sampleTable = createAirtableClient('样品表', { base: 'sample' });
 *
 * // 客户 Base
 * const customerTable = createAirtableClient('客户信息', { base: 'customer' });
 * ```
 */

// 导出客户端
export {
  createAirtableClient,
  isAirtableConfigured,
  AirtableApiError,
  type AirtableClientOptions,
} from './client';

// 导出类型
export type {
  AirtableClient,
  AirtableRecord,
  AirtableQueryOptions,
  AirtableListResult,
  AirtableCreateParams,
  AirtableUpdateParams,
  AirtableBatchCreateParams,
  AirtableBatchUpdateParams,
  AirtableBatchResult,
  AirtableError,
  FilterCondition,
  FilterValue,
  AirtableOperator,
} from './types';

// 导出工具函数
export { buildFilter, collectAll, filterBy, filterAnd, filterOr } from './utils';

// 导出 Base 类型
export type AirtableBaseType = 'order' | 'sample' | 'customer';

// 导出同步服务
export {
  airtableSyncService,
  AirtableSyncService,
  type SyncStats,
  type SyncOptions,
  type SyncResult,
} from './sync-service';

// 导出字段映射和错误解析
export {
  PO_FIELDS,
  PAYMENT_FIELDS,
  VERIFICATION_FIELDS,
  TABLE_IDS,
  AIRTABLE_ERROR_CODES,
  parseAirtableError,
} from './field-mappings';
