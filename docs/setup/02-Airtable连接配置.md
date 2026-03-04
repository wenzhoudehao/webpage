# Airtable 连接配置

本文档说明如何配置 Airtable API 集成，用于"收款核销"等功能的数据源。

## 架构说明

采用 **方案 A+（缓存读取 + 实时写入）** 架构：

| 操作 | 数据流向 | 说明 |
|------|----------|------|
| **读取** | Airtable View → Supabase 缓存 → 应用 | 通过 View 控制同步范围 |
| **写入** | 应用 → Airtable API → Airtable | 实时更新源数据 |

---

## 环境变量配置

在项目根目录的 `.env` 文件中配置：

```env
# Airtable API Key（一个 Key 可访问所有 Base）
AIRTABLE_API_KEY="patXXXXXXXXXXXXXX"

# 多 Base 配置
AIRTABLE_BASE_ORDER="appXXX"      # 订单 Base
AIRTABLE_BASE_SAMPLE="appXXX"     # 样品 Base
AIRTABLE_BASE_CUSTOMER="appXXX"   # 客户 Base

# 默认 Base（可选，默认为 order）
AIRTABLE_DEFAULT_BASE="order"
```

### 获取配置信息

#### 1. 获取 API Key

1. 访问 [Airtable Create Tokens](https://airtable.com/create/tokens)
2. 点击 **"Create new token"**
3. 配置权限：
   - **Data access**: `data.records:read` + `data.records:write`
   - **Access**: 添加所有需要访问的 Base（订单、样品、客户）
4. 复制 Token

#### 2. 获取 Base ID

打开 Airtable Base，URL 格式：`https://airtable.com/[BASE_ID]/...`

```
https://airtable.com/appCkvqCpKZR66zLL/tblXXX...
                    ↑ Base ID (app 开头)
```

---

## 多 Base 使用方式

```typescript
import { createAirtableClient } from '@libs/airtable';

// 订单 Base（默认）
const poTable = createAirtableClient('PO表');
const poTable2 = createAirtableClient('PO表', { base: 'order' });

// 样品 Base
const sampleTable = createAirtableClient('样品表', { base: 'sample' });

// 客户 Base
const customerTable = createAirtableClient('客户信息', { base: 'customer' });
```

---

## View 控制同步（推荐）

通过 Airtable 的 **View（视图）** 控制哪些数据需要同步到 Supabase。

### 推荐的 View 设计

在 Airtable 表中创建以下视图：

| View 名称 | 用途 | 筛选条件示例 |
|-----------|------|-------------|
| **全部数据** | 查看所有记录 | 无筛选 |
| **待同步** | 需要同步到 Supabase | `同步状态 = 空` |
| **已同步** | 已同步的记录 | `同步状态 = 已同步` |
| **待核销** | 收款核销功能使用 | `核销状态 = 待核销` |

### 代码中使用 View

```typescript
const poTable = createAirtableClient('PO表', { base: 'order' });

// 获取待同步的数据
const { records } = await poTable.list({
  view: '待同步',
  maxRecords: 100
});

// 获取待核销的订单
const { records: pendingOrders } = await poTable.list({
  view: '待核销'
});

// 同步完成后，更新 Airtable 中的状态
await poTable.update({
  id: record.id,
  fields: { 同步状态: '已同步' }
});
```

### View 方案的优势

1. **无代码控制**：在 Airtable 界面中调整同步范围，无需改代码
2. **灵活性高**：可以根据业务需要创建多个 View
3. **可视化**：直观看到哪些数据会被同步
4. **安全性**：避免意外同步不需要的数据

---

## Table ID vs 表名

代码中可以使用表名或 Table ID：

```typescript
// 使用表名（推荐，更直观）
createAirtableClient('PO表');

// 使用 Table ID（更稳定，表名改了也不影响）
createAirtableClient('tbl9E2gMZJD0LfdBJ');
```

| 方式 | 优点 | 缺点 |
|------|------|------|
| 表名 | 直观易读 | 表名改了需要改代码 |
| Table ID | 表名变了也不影响 | 不直观，需要查 |

**建议**：开发阶段用表名，稳定后可以考虑换成 Table ID。

---

## 完整示例

```typescript
import {
  createAirtableClient,
  buildFilter,
  collectAll,
  isAirtableConfigured
} from '@libs/airtable';

// 检查配置
if (!isAirtableConfigured()) {
  throw new Error('Airtable 未配置');
}

// 定义记录类型
interface PORecord {
  订单号: string;
  金额: number;
  客户名称: string;
  核销状态: string;
  同步状态: string;
}

// 创建客户端
const poTable = createAirtableClient<PORecord>('PO表', { base: 'order' });

// 方式1：通过 View 获取数据
const { records } = await poTable.list({ view: '待核销' });

// 方式2：通过公式过滤
const { records: filtered } = await poTable.list({
  filterByFormula: buildFilter({
    and: [
      { field: '核销状态', operator: '=', value: '待核销' },
      { field: '金额', operator: '>', value: 1000 }
    ]
  })
});

// 方式3：获取所有分页数据
const allRecords = await collectAll(poTable, { view: '待同步' });

// 更新记录
await poTable.update({
  id: records[0].id,
  fields: { 核销状态: '已核销' }
});
```

---

## API 限制

| 限制 | 说明 |
|------|------|
| 速率限制 | 5 请求/秒 |
| 单页记录 | 最多 100 条 |
| 批量操作 | 最多 10 条/请求 |

这也是采用 **Supabase 缓存 + View 过滤** 策略的原因。

---

*文档更新时间: 2025-03-02*
