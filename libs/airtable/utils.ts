/**
 * Airtable 工具函数
 *
 * 提供过滤公式构建、分页收集等实用功能
 */

import type {
  AirtableClient,
  AirtableQueryOptions,
  AirtableListResult,
  FilterCondition,
  FilterValue,
  AirtableOperator,
} from './types';

/**
 * 转义 Airtable 公式中的特殊字符
 */
function escapeFormulaValue(value: string): string {
  // 转义反斜杠和引号
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * 将值转换为 Airtable 公式格式
 */
function valueToFormula(value: FilterValue): string {
  if (value === null || value === undefined) {
    return 'BLANK()';
  }
  if (typeof value === 'string') {
    return `"${escapeFormulaValue(value)}"`;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE()' : 'FALSE()';
  }
  return `"${escapeFormulaValue(String(value))}"`;
}

/**
 * 构建单个过滤条件公式
 */
function buildConditionFormula(condition: FilterCondition): string {
  const { field, operator, value } = condition;
  const fieldRef = `{${field}}`;

  switch (operator) {
    case '=':
      if (Array.isArray(value)) {
        const conditions = value.map((v) => `${fieldRef} = ${valueToFormula(v)}`);
        return `OR(${conditions.join(', ')})`;
      }
      return `${fieldRef} = ${valueToFormula(value)}`;

    case '!=':
      if (Array.isArray(value)) {
        const conditions = value.map((v) => `${fieldRef} != ${valueToFormula(v)}`);
        return `AND(${conditions.join(', ')})`;
      }
      return `${fieldRef} != ${valueToFormula(value)}`;

    case '>':
      return `${fieldRef} > ${valueToFormula(Array.isArray(value) ? value[0] : value)}`;

    case '>=':
      return `${fieldRef} >= ${valueToFormula(Array.isArray(value) ? value[0] : value)}`;

    case '<':
      return `${fieldRef} < ${valueToFormula(Array.isArray(value) ? value[0] : value)}`;

    case '<=':
      return `${fieldRef} <= ${valueToFormula(Array.isArray(value) ? value[0] : value)}`;

    case 'HAS':
      // 数组包含检查
      if (Array.isArray(value)) {
        const conditions = value.map((v) => `${fieldRef} = ${valueToFormula(v)}`);
        return `OR(${conditions.join(', ')})`;
      }
      return `${fieldRef} = ${valueToFormula(value)}`;

    case 'NOT_HAS':
      if (Array.isArray(value)) {
        const conditions = value.map((v) => `${fieldRef} != ${valueToFormula(v)}`);
        return `AND(${conditions.join(', ')})`;
      }
      return `${fieldRef} != ${valueToFormula(value)}`;

    case 'CONTAINS':
      // 字符串包含
      return `FIND(${valueToFormula(Array.isArray(value) ? value[0] : value)}, ${fieldRef}) > 0`;

    case 'NOT_CONTAINS':
      return `FIND(${valueToFormula(Array.isArray(value) ? value[0] : value)}, ${fieldRef}) = 0`;

    case 'IS_NULL':
    case 'IS_EMPTY':
      return `${fieldRef} = BLANK()`;

    case 'IS_NOT_NULL':
    case 'IS_NOT_EMPTY':
      return `${fieldRef} != BLANK()`;

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * 构建过滤公式
 *
 * @example
 * ```typescript
 * const formula = buildFilter({
 *   and: [
 *     { field: 'Status', operator: '=', value: 'Active' },
 *     { field: 'Amount', operator: '>', value: 1000 }
 *   ]
 * });
 * // 结果: AND({Status} = "Active", {Amount} > 1000)
 * ```
 *
 * @example
 * ```typescript
 * const formula = buildFilter({
 *   or: [
 *     { field: 'Type', operator: '=', value: 'A' },
 *     { field: 'Type', operator: '=', value: 'B' }
 *   ]
 * });
 * // 结果: OR({Type} = "A", {Type} = "B")
 * ```
 */
export function buildFilter(
  conditions:
    | FilterCondition
    | { and: FilterCondition[] }
    | { or: FilterCondition[] }
): string {
  if ('and' in conditions) {
    const formulas = conditions.and.map(buildConditionFormula);
    return `AND(${formulas.join(', ')})`;
  }

  if ('or' in conditions) {
    const formulas = conditions.or.map(buildConditionFormula);
    return `OR(${formulas.join(', ')})`;
  }

  // 单个条件
  return buildConditionFormula(conditions);
}

/**
 * 收集所有分页记录的结果
 */
export interface CollectAllResult<T> {
  /** 所有记录 */
  records: AirtableListResult<T>['records'];
  /** 实际 API 调用次数 */
  apiCalls: number;
}

/**
 * 收集所有分页记录
 *
 * Airtable API 每次最多返回 100 条记录，此函数自动处理分页
 *
 * @param client Airtable 客户端
 * @param options 查询选项（不要设置 offset）
 * @param maxRecords 最大记录数（防止无限循环）
 * @returns 所有记录数组和 API 调用次数
 *
 * @example
 * ```typescript
 * const { records, apiCalls } = await collectAll(table, { filterByFormula: "{Status} = 'Active'" });
 * console.log(`获取 ${records.length} 条记录，消耗 ${apiCalls} 次 API 调用`);
 * ```
 */
export async function collectAll<T>(
  client: AirtableClient<T>,
  options: Omit<AirtableQueryOptions, 'offset' | 'maxRecords'> = {},
  maxRecords = 10000
): Promise<CollectAllResult<T>> {
  const allRecords: AirtableListResult<T>['records'] = [];
  let offset: string | undefined;
  let apiCalls = 0;

  do {
    // 注意：不要在每次请求中设置 maxRecords
    // Airtable 的 maxRecords 是"总共最多返回多少条"，设置后会限制总返回数
    // 我们通过自己检查 totalFetched 来控制最大记录数
    const result = await client.list({
      ...options,
      offset,
    });

    apiCalls++;
    allRecords.push(...result.records);
    offset = result.offset;

    // 达到最大记录数或没有更多数据时停止
  } while (offset && allRecords.length < maxRecords);

  return { records: allRecords, apiCalls };
}

/**
 * 简化的过滤条件构建器
 *
 * @example
 * ```typescript
 * // 简单相等
 * filterBy('Status', 'Active')  // {Status} = "Active"
 *
 * // 大于
 * filterBy('Amount', '>', 1000)  // {Amount} > 1000
 *
 * // 包含
 * filterBy('Name', 'contains', 'test')  // FIND("test", {Name}) > 0
 *
 * // 为空
 * filterBy('Email', 'empty')  // {Email} = BLANK()
 * ```
 */
export function filterBy(
  field: string,
  operatorOrValue: AirtableOperator | FilterValue | 'contains' | 'empty' | 'not_empty',
  value?: FilterValue
): string {
  let operator: AirtableOperator;
  let actualValue: FilterValue;

  if (value === undefined) {
    // 两参数形式: filterBy('Field', 'value')
    if (operatorOrValue === 'empty') {
      return `{${field}} = BLANK()`;
    }
    if (operatorOrValue === 'not_empty') {
      return `{${field}} != BLANK()`;
    }
    operator = '=';
    actualValue = operatorOrValue as FilterValue;
  } else {
    // 三参数形式: filterBy('Field', '>', 100)
    switch (operatorOrValue) {
      case 'contains':
        return `FIND(${valueToFormula(value)}, {${field}}) > 0`;
      case 'empty':
        return `{${field}} = BLANK()`;
      case 'not_empty':
        return `{${field}} != BLANK()`;
      default:
        operator = operatorOrValue as AirtableOperator;
        actualValue = value;
    }
  }

  return buildFilter({ field, operator, value: actualValue });
}

/**
 * AND 组合多个过滤公式
 */
export function filterAnd(...formulas: string[]): string {
  return `AND(${formulas.join(', ')})`;
}

/**
 * OR 组合多个过滤公式
 */
export function filterOr(...formulas: string[]): string {
  return `OR(${formulas.join(', ')})`;
}
