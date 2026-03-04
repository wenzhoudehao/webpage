# Airtable 集成模块

支持多 Base（订单、样品、客户）的 Airtable API 集成。

## 配置

```env
# .env
AIRTABLE_API_KEY="patXXX..."
AIRTABLE_BASE_ORDER="appXXX"      # 订单 Base
AIRTABLE_BASE_SAMPLE="appXXX"     # 样品 Base
AIRTABLE_BASE_CUSTOMER="appXXX"   # 客户 Base
```

## 快速开始

```typescript
import { createAirtableClient, buildFilter, collectAll } from '@libs/airtable';

// 订单 Base
const poTable = createAirtableClient('PO表', { base: 'order' });

// 通过 View 获取数据（推荐）
const { records } = await poTable.list({ view: '待核销' });

// 通过公式过滤
const filtered = await poTable.list({
  filterByFormula: "{核销状态} = '待核销'"
});

// 收集所有分页数据
const allRecords = await collectAll(poTable, { view: '待同步' });
```

## 多 Base 支持

```typescript
// 订单 Base（默认）
const order = createAirtableClient('PO表');

// 指定 Base
const sample = createAirtableClient('样品表', { base: 'sample' });
const customer = createAirtableClient('客户信息', { base: 'customer' });
```

## View 控制同步

在 Airtable 中创建视图来控制同步范围：

| View | 用途 |
|------|------|
| 待同步 | 需要同步到 Supabase |
| 已同步 | 已同步完成 |
| 待核销 | 等待核销的订单 |

```typescript
// 只获取待同步的数据
const { records } = await table.list({ view: '待同步' });
```

## API

### createAirtableClient(tableName, options?)

| 参数 | 类型 | 说明 |
|------|------|------|
| tableName | string | 表名或 Table ID |
| options.base | 'order' \| 'sample' \| 'customer' | 指定 Base |

### 客户端方法

| 方法 | 说明 |
|------|------|
| `list({ view, filterByFormula, maxRecords, sort })` | 查询记录 |
| `find(id)` | 获取单条 |
| `create({ fields })` | 创建记录 |
| `update({ id, fields })` | 更新记录 |
| `destroy(id)` | 删除记录 |
| `batchCreate({ records })` | 批量创建（≤10条）|
| `batchUpdate({ records })` | 批量更新（≤10条）|
| `batchDestroy(ids)` | 批量删除（≤10条）|

### 工具函数

```typescript
import { buildFilter, filterBy, collectAll } from '@libs/airtable';

// 构建过滤公式
const formula = buildFilter({
  and: [
    { field: '状态', operator: '=', value: '待核销' },
    { field: '金额', operator: '>', value: 1000 }
  ]
});

// 简化写法
filterBy('状态', '待核销')           // {状态} = "待核销"
filterBy('金额', '>', 1000)          // {金额} > 1000
filterBy('名称', 'contains', 'test') // FIND("test", {名称}) > 0

// 收集所有记录（自动分页）
const all = await collectAll(table, { view: '待同步' });
```

## API 限制

- 速率：5 请求/秒
- 单页：100 条
- 批量：10 条/次
