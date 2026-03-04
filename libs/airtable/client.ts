/**
 * Airtable 客户端实现
 *
 * 支持多 Base：订单、样品、客户
 */

import { config } from '@config';
import type {
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
} from './types';

const airtableConfig = config.airtable;

/**
 * Airtable API 错误
 */
export class AirtableApiError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AirtableApiError';
  }
}

/**
 * 解析 Airtable API 错误
 */
function parseError(response: Response, data: unknown): AirtableApiError {
  const errorData = data as AirtableError | undefined;
  const type = errorData?.error?.type || 'UNKNOWN_ERROR';
  const message = errorData?.error?.message || `HTTP ${response.status}`;

  return new AirtableApiError(message, type, response.status);
}

/**
 * 检查 Airtable 是否已配置
 */
export function isAirtableConfigured(): boolean {
  return airtableConfig.isConfigured;
}

/**
 * 客户端配置选项
 */
export interface AirtableClientOptions {
  /** 指定 Base: 'order' | 'sample' | 'customer' */
  base?: 'order' | 'sample' | 'customer';
}

/**
 * Airtable 客户端实现类
 */
class AirtableClientImpl<T> implements AirtableClient<T> {
  private readonly tableName: string;
  private readonly baseId: string;
  private readonly baseUrl: string;

  constructor(tableName: string, options?: AirtableClientOptions) {
    if (!airtableConfig.isConfigured) {
      throw new AirtableApiError(
        'Airtable is not configured. Please set AIRTABLE_API_KEY and at least one BASE ID.',
        'CONFIGURATION_ERROR'
      );
    }

    if (!tableName) {
      throw new AirtableApiError(
        'Table name is required.',
        'INVALID_REQUEST'
      );
    }

    // 获取指定 Base 的 ID
    const baseType = options?.base || 'order';
    const baseId = airtableConfig.getBaseId(baseType);

    if (!baseId) {
      throw new AirtableApiError(
        `Base ID not configured for '${baseType}'. Please set AIRTABLE_BASE_${baseType.toUpperCase()} in .env`,
        'CONFIGURATION_ERROR'
      );
    }

    this.tableName = tableName;
    this.baseId = baseId;
    this.baseUrl = `${airtableConfig.apiUrl}/${baseId}/${encodeURIComponent(tableName)}`;
  }

  /**
   * 发送 API 请求
   */
  private async request<TResponse>(
    method: string,
    path: string = '',
    body?: unknown
  ): Promise<TResponse> {
    const url = path ? `${this.baseUrl}/${path}` : this.baseUrl;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${airtableConfig.apiKey}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), airtableConfig.requestTimeout);
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw parseError(response, errorData);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AirtableApiError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AirtableApiError('Request timeout', 'TIMEOUT');
        }
        throw new AirtableApiError(error.message, 'NETWORK_ERROR');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 查询记录列表
   */
  async list(options: AirtableQueryOptions = {}): Promise<AirtableListResult<T>> {
    const params = new URLSearchParams();

    if (options.maxRecords) {
      params.set('maxRecords', String(Math.min(options.maxRecords, 100)));
    }
    if (options.offset) {
      params.set('offset', options.offset);
    }
    if (options.view) {
      params.set('view', options.view);
    }
    if (options.filterByFormula) {
      params.set('filterByFormula', options.filterByFormula);
    }
    if (options.sort?.length) {
      options.sort.forEach((s, i) => {
        params.set(`sort[${i}][field]`, s.field);
        if (s.direction) {
          params.set(`sort[${i}][direction]`, s.direction);
        }
      });
    }
    if (options.fields?.length) {
      options.fields.forEach((f) => {
        params.append('fields[]', f);
      });
    }
    if (options.timeZone) {
      params.set('timeZone', options.timeZone);
    }
    if (options.userLocale) {
      params.set('userLocale', options.userLocale);
    }

    const queryString = params.toString();
    const path = queryString ? `?${queryString}` : '';

    return this.request<AirtableListResult<T>>('GET', path);
  }

  /**
   * 获取单条记录
   */
  async find(id: string): Promise<AirtableRecord<T>> {
    if (!id) {
      throw new AirtableApiError('Record ID is required', 'INVALID_REQUEST');
    }
    return this.request<AirtableRecord<T>>('GET', id);
  }

  /**
   * 创建记录
   */
  async create(params: AirtableCreateParams<T>): Promise<AirtableRecord<T>> {
    const response = await this.request<{ records: AirtableRecord<T>[] }>('POST', '', {
      records: [{ fields: params.fields }],
      typecast: params.typecast,
    });

    return response.records[0];
  }

  /**
   * 更新记录
   */
  async update(params: AirtableUpdateParams<T>): Promise<AirtableRecord<T>> {
    if (!params.id) {
      throw new AirtableApiError('Record ID is required', 'INVALID_REQUEST');
    }

    const path = params.replace ? `${params.id}?replace=true` : params.id;

    const response = await this.request<{ records: AirtableRecord<T>[] }>('PATCH', path, {
      records: [{ id: params.id, fields: params.fields }],
    });

    return response.records[0];
  }

  /**
   * 删除记录
   */
  async destroy(id: string): Promise<{ id: string; deleted: boolean }> {
    if (!id) {
      throw new AirtableApiError('Record ID is required', 'INVALID_REQUEST');
    }

    const response = await this.request<{
      records: Array<{ id: string; deleted: boolean }>;
    }>('DELETE', id);

    return response.records[0];
  }

  /**
   * 批量创建记录（最多 10 条）
   */
  async batchCreate(params: AirtableBatchCreateParams<T>): Promise<AirtableBatchResult<T>> {
    if (!params.records?.length) {
      throw new AirtableApiError('Records array is required', 'INVALID_REQUEST');
    }

    if (params.records.length > 10) {
      throw new AirtableApiError(
        'Maximum 10 records per batch create request',
        'INVALID_REQUEST'
      );
    }

    return this.request<AirtableBatchResult<T>>('POST', '', {
      records: params.records,
      typecast: params.typecast,
    });
  }

  /**
   * 批量更新记录（最多 10 条）
   */
  async batchUpdate(params: AirtableBatchUpdateParams<T>): Promise<AirtableBatchResult<T>> {
    if (!params.records?.length) {
      throw new AirtableApiError('Records array is required', 'INVALID_REQUEST');
    }

    if (params.records.length > 10) {
      throw new AirtableApiError(
        'Maximum 10 records per batch update request',
        'INVALID_REQUEST'
      );
    }

    const path = params.replace ? '?replace=true' : '';

    return this.request<AirtableBatchResult<T>>('PATCH', path, {
      records: params.records,
    });
  }

  /**
   * 批量删除记录（最多 10 条）
   */
  async batchDestroy(ids: string[]): Promise<{ records: Array<{ id: string; deleted: boolean }> }> {
    if (!ids?.length) {
      throw new AirtableApiError('IDs array is required', 'INVALID_REQUEST');
    }

    if (ids.length > 10) {
      throw new AirtableApiError(
        'Maximum 10 records per batch delete request',
        'INVALID_REQUEST'
      );
    }

    const params = new URLSearchParams();
    ids.forEach((id) => params.append('records[]', id));

    return this.request<{ records: Array<{ id: string; deleted: boolean }> }>(
      'DELETE',
      `?${params.toString()}`
    );
  }
}

/**
 * 创建 Airtable 客户端实例
 *
 * @param tableName 表名（支持表名或 Table ID）
 * @param options 配置选项，可指定 Base
 *
 * @example
 * ```typescript
 * // 订单 Base
 * const poTable = createAirtableClient('PO表');
 * const poTable2 = createAirtableClient('PO表', { base: 'order' });
 *
 * // 样品 Base
 * const sampleTable = createAirtableClient('样品表', { base: 'sample' });
 *
 * // 客户 Base
 * const customerTable = createAirtableClient('客户信息', { base: 'customer' });
 *
 * // 使用 Table ID（更稳定，表名变了也不会出错）
 * const table = createAirtableClient('tbl9E2gMZJD0LfdBJ', { base: 'order' });
 * ```
 */
export function createAirtableClient<T = Record<string, unknown>>(
  tableName: string,
  options?: AirtableClientOptions
): AirtableClient<T> {
  return new AirtableClientImpl<T>(tableName, options);
}
