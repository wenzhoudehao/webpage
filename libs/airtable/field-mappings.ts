/**
 * Airtable 字段 ID 映射
 *
 * 使用 Field ID 代替字段名，确保字段重命名时代码仍然有效
 * 注释中标注了对应的字段名（Airtable API 返回数据的 key）
 *
 * 重要说明：
 * - API 请求的 fields 参数：使用 Field ID
 * - API 返回的数据：使用字段名作为 key
 * - 所以读取数据时要用字段名，请求时用 Field ID
 *
 * Table IDs:
 * - PO: tbl9E2gMZJD0LfdBJ
 * - 收款登记: tbln0WKtGWq9NJPuA
 * - 收款_中间表: tblXnQjtGAlAnxPRo
 */

// ========== PO 表字段 ==========
// Field ID 用于 API 请求，字段名用于读取返回数据
export const PO_FIELDS = {
  /** Field ID: PI号 - 读取时用 fields['PI'] */
  PI: 'fldxpDCyogprqJiAd',
  /** Field ID: 生产单号 - 读取时用 fields['生产单'] */
  PRODUCTION_NO: 'fldPlwNlWKaZ9TESs',
  /** Field ID: 客户名称 - 读取时用 fields['客户'] */
  CUSTOMER: 'fldicZvWGsLhbUBEj',
  /** Field ID: 订单总金额 - 读取时用 fields['订单总金额'] */
  TOTAL_AMOUNT: 'fldJ1v2q0lqFEL2xs',
  /** Field ID: 收款完成 - 读取时用 fields['收款完成'] */
  PAYMENT_COMPLETE: 'fldDAQAtlNAF98UIO',
  /** Field ID: 出货 - 读取时用 fields['出货'] */
  SHIPPED: 'fldLrp1cAcX0J58uG',
  /** Field ID: 创建时间 - 读取时用 fields['创建时间'] */
  CREATED_TIME: 'fldevGvteRC6OaQyz',
  /** Field ID: 备注 - 读取时用 fields['备注'] */
  REMARKS: 'fldn3bV45w6PgaYuT',
} as const;

// ========== 收款登记表字段 ==========
export const PAYMENT_FIELDS = {
  /** Field ID: 收款ID - 读取时用 fields['收款ID'] */
  PAYMENT_ID: 'fldN5IzpwsmmfKfIy',
  /** Field ID: 客户名称 - 读取时用 fields['客户'] */
  CUSTOMER: 'fldvsgY2Ff4eeghTX',
  /** Field ID: 实收金额 - 读取时用 fields['实收金额（自动提取）'] */
  RECEIVED_AMOUNT: 'fldio3QZXVmNbzc9E',
  /** Field ID: 待分配余额 - 读取时用 fields['待分配余额'] */
  UNALLOCATED_BALANCE: 'fldnD1veoRfKwLTlH',
  /** Field ID: 付款类型 - 读取时用 fields['付款类型'] */
  PAYMENT_TYPE: 'fldtwcTiYWN2DAPYe',
  /** Field ID: 收款日期 - 读取时用 fields['收款日期'] */
  PAYMENT_DATE: 'fld7qOAwlau1PNgTT',
  /** Field ID: 收款账户 - 读取时用 fields['收款账户'] */
  BANK_ACCOUNT: 'fldYphVrT9wp0wZej',
  /** Field ID: 银行收款通知 - 读取时用 fields['银行收款通知'] */
  BANK_NOTICE: 'fldJkBfgcE4zObpYc',
  /** Field ID: 备注 - 读取时用 fields['备注'] */
  REMARKS: 'fldR0s1mE8cd69aej',
} as const;

// ========== 收款_中间表字段 ==========
export const VERIFICATION_FIELDS = {
  /** 关联订单 */
  PO_ID: 'flddTrnZHYYD8ulXY',
  /** 关联收款记录 */
  PAYMENT_ID: 'fld1tXQbWhVAVm6qg',
  /** 本次分配金额 */
  ALLOCATED_AMOUNT: 'fldK2T8DCkD9NlXVN',
  /** 核销类型 */
  VERIFICATION_TYPE: 'fld9xoxfGEtJYfGx2',
  /** 收款日期 (lookup) */
  VERIFICATION_DATE: 'fld6q7ck4lE6aJhoI',
  /** 预收款分配备注 */
  REMARKS: 'fld7ejHffOLqZNRo7',
} as const;

// ========== 表 ID ==========
export const TABLE_IDS = {
  /** PO表 */
  PO: 'tbl9E2gMZJD0LfdBJ',
  /** 收款登记表 */
  PAYMENT: 'tbln0WKtGWq9NJPuA',
  /** 收款_中间表 */
  VERIFICATION: 'tblXnQjtGAlAnxPRo',
} as const;

// ========== 错误类型 ==========
export const AIRTABLE_ERROR_CODES = {
  /** 字段问题（字段被删除、类型不匹配等） */
  UNPROCESSABLE_ENTITY: 422,
  /** Base 或 Table 不存在 */
  NOT_FOUND: 404,
  /** 频率限制 */
  TOO_MANY_REQUESTS: 429,
  /** 未授权 */
  UNAUTHORIZED: 401,
  /** 禁止访问 */
  FORBIDDEN: 403,
} as const;

/**
 * 解析 Airtable 错误并返回用户友好的错误消息
 */
export function parseAirtableError(error: unknown): string {
  if (!(error instanceof Error)) {
    return '同步失败：未知错误';
  }

  const airtableError = error as Error & { statusCode?: number; type?: string };

  switch (airtableError.statusCode) {
    case AIRTABLE_ERROR_CODES.UNPROCESSABLE_ENTITY:
      return `数据库结构异常：某个字段可能已被删除或类型已更改。详情: ${airtableError.message}`;

    case AIRTABLE_ERROR_CODES.NOT_FOUND:
      return '同步失败：表或 Base 不存在，请检查配置';

    case AIRTABLE_ERROR_CODES.TOO_MANY_REQUESTS:
      return '请求太频繁，请稍后再试（Airtable 频率限制）';

    case AIRTABLE_ERROR_CODES.UNAUTHORIZED:
      return '同步失败：API Key 无效或已过期';

    case AIRTABLE_ERROR_CODES.FORBIDDEN:
      return '同步失败：没有访问权限，请检查 API Key 权限';

    default:
      return `同步失败: ${airtableError.message}`;
  }
}
