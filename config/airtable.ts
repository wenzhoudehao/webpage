/**
 * Airtable Configuration
 *
 * 支持多 Base 配置：订单、样品、客户
 */
import { getEnv, getEnvForService } from './utils';

/**
 * Base 类型定义
 */
export type AirtableBaseType = 'order' | 'sample' | 'customer';

/**
 * Base ID 映射
 */
const BASE_ID_MAP: Record<AirtableBaseType, string> = {
  order: 'AIRTABLE_BASE_ORDER',
  sample: 'AIRTABLE_BASE_SAMPLE',
  customer: 'AIRTABLE_BASE_CUSTOMER',
};

/**
 * 获取指定 Base 的 ID
 */
function getBaseId(base: AirtableBaseType): string | undefined {
  const envKey = BASE_ID_MAP[base];
  return getEnv(envKey);
}

export const airtableConfig = {
  /**
   * Airtable Personal Access Token
   * 获取方式: https://airtable.com/create/tokens
   */
  get apiKey() {
    return getEnvForService('AIRTABLE_API_KEY', 'Airtable');
  },

  /**
   * 获取指定 Base 的 ID
   */
  getBaseId(base: AirtableBaseType): string | undefined {
    return getBaseId(base);
  },

  /**
   * 获取默认 Base ID
   */
  get defaultBaseId(): string | undefined {
    const defaultBase = (getEnv('AIRTABLE_DEFAULT_BASE') || 'order') as AirtableBaseType;
    return getBaseId(defaultBase);
  },

  /**
   * 订单 Base ID
   */
  get orderBaseId() {
    return getBaseId('order');
  },

  /**
   * 样品 Base ID
   */
  get sampleBaseId() {
    return getBaseId('sample');
  },

  /**
   * 客户 Base ID
   */
  get customerBaseId() {
    return getBaseId('customer');
  },

  /**
   * API 请求超时时间（毫秒）
   */
  get requestTimeout() {
    return 30000;
  },

  /**
   * 检查 Airtable 是否已配置
   */
  get isConfigured() {
    return !!(this.apiKey && (this.orderBaseId || this.sampleBaseId || this.customerBaseId));
  },

  /**
   * Airtable API 基础 URL
   */
  get apiUrl() {
    return 'https://api.airtable.com/v0';
  },
} as const;
