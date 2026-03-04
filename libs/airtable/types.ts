/**
 * Airtable 类型定义
 *
 * 定义 Airtable API 相关的核心类型
 */

/**
 * Airtable 记录字段类型
 * 泛型 T 用于指定具体表的字段结构
 */
export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;           // 记录 ID (recXXXXXXXXXXXXXX)
  createdTime: string;  // ISO 8601 格式的创建时间
  fields: T;            // 记录字段
}

/**
 * Airtable 查询选项
 */
export interface AirtableQueryOptions {
  /** 返回的最大记录数 (最大 100) */
  maxRecords?: number;
  /** 分页偏移量 */
  offset?: string;
  /** 视图名称 */
  view?: string;
  /** 过滤公式 (Airtable Formula) */
  filterByFormula?: string;
  /** 排序规则 */
  sort?: Array<{
    field: string;
    direction?: 'asc' | 'desc';
  }>;
  /** 返回的字段列表 */
  fields?: string[];
  /** 时区 (如 'Asia/Shanghai') */
  timeZone?: string;
  /** 用户语言环境 (如 'zh-CN') */
  userLocale?: string;
}

/**
 * Airtable 列表查询结果
 */
export interface AirtableListResult<T = Record<string, unknown>> {
  records: AirtableRecord<T>[];
  offset?: string;  // 用于获取下一页
}

/**
 * 创建记录的参数
 */
export interface AirtableCreateParams<T = Record<string, unknown>> {
  fields: T;
  typecast?: boolean;  // 允许 Airtable 自动转换类型
}

/**
 * 更新记录的参数
 */
export interface AirtableUpdateParams<T = Record<string, unknown>> {
  id: string;
  fields: Partial<T>;
  /** 替换模式：false 为合并，true 为替换 */
  replace?: boolean;
}

/**
 * 批量创建记录的参数
 */
export interface AirtableBatchCreateParams<T = Record<string, unknown>> {
  records: Array<{ fields: T }>;
  typecast?: boolean;
}

/**
 * 批量更新记录的参数
 */
export interface AirtableBatchUpdateParams<T = Record<string, unknown>> {
  records: Array<{
    id: string;
    fields: Partial<T>;
  }>;
  /** 替换模式 */
  replace?: boolean;
}

/**
 * 批量操作结果
 */
export interface AirtableBatchResult<T = Record<string, unknown>> {
  records: AirtableRecord<T>[];
  /** 失败的记录（部分成功时） */
  failedRecords?: Array<{
    id?: string;
    fields?: T | Partial<T>;
    error: {
      type: string;
      message: string;
    };
  }>;
}

/**
 * Airtable 客户端接口
 * 定义与 Airtable 表交互的标准方法
 */
export interface AirtableClient<T = Record<string, unknown>> {
  /**
   * 查询记录列表
   * @param options 查询选项
   */
  list(options?: AirtableQueryOptions): Promise<AirtableListResult<T>>;

  /**
   * 获取单条记录
   * @param id 记录 ID
   */
  find(id: string): Promise<AirtableRecord<T>>;

  /**
   * 创建记录
   * @param params 创建参数
   */
  create(params: AirtableCreateParams<T>): Promise<AirtableRecord<T>>;

  /**
   * 更新记录
   * @param params 更新参数
   */
  update(params: AirtableUpdateParams<T>): Promise<AirtableRecord<T>>;

  /**
   * 删除记录
   * @param id 记录 ID
   */
  destroy(id: string): Promise<{ id: string; deleted: boolean }>;

  /**
   * 批量创建记录（最多 10 条）
   * @param params 批量创建参数
   */
  batchCreate(params: AirtableBatchCreateParams<T>): Promise<AirtableBatchResult<T>>;

  /**
   * 批量更新记录（最多 10 条）
   * @param params 批量更新参数
   */
  batchUpdate(params: AirtableBatchUpdateParams<T>): Promise<AirtableBatchResult<T>>;

  /**
   * 批量删除记录（最多 10 条）
   * @param ids 记录 ID 数组
   */
  batchDestroy(ids: string[]): Promise<{ records: Array<{ id: string; deleted: boolean }> }>;
}

/**
 * Airtable 错误响应
 */
export interface AirtableError {
  error: {
    type: string;
    message: string;
  };
}

/**
 * 过滤公式构建器的值类型
 */
export type FilterValue = string | number | boolean | null | undefined;

/**
 * 过滤公式条件
 */
export interface FilterCondition {
  field: string;
  operator: AirtableOperator;
  value: FilterValue | FilterValue[];
}

/**
 * Airtable 支持的操作符
 */
export type AirtableOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'HAS'
  | 'NOT_HAS'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'IS_NULL'
  | 'IS_NOT_NULL'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY';
