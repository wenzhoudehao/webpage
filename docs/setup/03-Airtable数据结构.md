# Airtable 数据结构文档

本文档记录"收款核销"功能涉及的 Airtable 表结构，用于项目开发参考。

---

## 一、核心表概览

| 表名 | 用途 | 主键 | Base |
|------|------|------|------|
| **PO表** | 订单数据 | Airtable Record ID | 订单 Base |
| **收款登记表** | 收款记录 | Airtable Record ID | 订单 Base |
| **收款_中间表** | 核销记录（关联订单和收款） | Airtable Record ID | 订单 Base |

### 表关系图

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  PO 表      │◄────────│ 收款_中间表  │─────────►│ 收款登记表  │
│  (Orders)   │         │ (Allocations)│         │  (Payments) │
└─────────────┘         └──────────────┘         └─────────────┘
      ▲                        ▲                       ▲
      │                        │                       │
   未结欠款              本次分配金额            待分配余额
```

---

## 二、PO 表（订单表）

### 字段定义

| 字段名 | 类型 | 说明 | 同步到缓存 |
|--------|------|------|-----------|
| Record ID | ID | 主键 (recXXXXXXXXXXXXXX) | ✅ id |
| **PI号** | Text | 外部沟通用 | ✅ pi_no |
| **生产单号** | Text | 内部沟通用 | ✅ production_no |
| 客户名称 | Text/Linked | 客户名称 | ✅ customer_name |
| 订单总金额 | Currency | 订单金额 | ✅ total_amount |
| 已收总额 | Rollup | 从中间表汇总 | ❌ (可计算) |
| 未结欠款 | Formula | `订单总金额 - 已收总额` | ✅ outstanding_balance |
| 核销状态 | Select | 支付状态 | ✅ verification_status |
| 出货状况 | Select | 出货进度 | ✅ shipping_status |
| 订单日期 | Date | 下单日期 | ✅ order_date |
| 备注 | Text | 备注信息 | ✅ remarks |

### 状态枚举

**核销状态 (verification_status)**
| 值 | 显示名 | 说明 |
|----|--------|------|
| pending | 待支付 | 未收到任何款项 |
| partial | 部分支付 | 已收到部分款项 |
| completed | 已清账 | 款项已全部结清 |
| overpaid | 超额支付 | 收款超过订单金额 |

**出货状况 (shipping_status)**
| 值 | 显示名 | 说明 |
|----|--------|------|
| pending | 待出货 | 订单待生产 |
| partial | 部分出货 | 部分货物已发出 |
| shipped | 已出货 | 货物已全部发出 |
| cancelled | 作废 | 订单已取消 |

---

## 三、收款登记表

### 字段定义

| 字段名 | 类型 | 说明 | 同步到缓存 |
|--------|------|------|-----------|
| Record ID | ID | 主键 | ✅ id |
| 收款编号 | Text | 如 "CR260228收" | ✅ payment_no |
| 客户名称 | Text/Linked | 客户名称 | ✅ customer_name |
| 实收金额 | Currency | 银行到账金额 | ✅ received_amount |
| 已核销总额 | Rollup | 从中间表汇总 | ❌ (可计算) |
| 待分配余额 | Formula | `实收金额 - 已核销总额` | ✅ unallocated_balance |
| 收款方式 | Select | 支付渠道 | ✅ payment_method |
| 到账日期 | Date | 实际到账日期 | ✅ received_date |
| 收款账户 | Text | 银行账户信息 | ✅ bank_account |
| 备注 | Text | 备注信息 | ✅ remarks |

### 收款方式枚举

**payment_method**
| 值 | 显示名 |
|----|--------|
| bank_transfer | 银行转账 |
| cash | 现金 |
| alipay | 支付宝 |
| wechat | 微信 |
| check | 支票 |
| other | 其他 |

---

## 四、收款_中间表（Function Table）

### 字段定义

| 字段名 | 类型 | 说明 | 同步到缓存 |
|--------|------|------|-----------|
| Record ID | ID | 主键 | ✅ id |
| 关联订单 | Linked Record | → PO表 | ✅ po_id |
| 关联收款 | Linked Record | → 收款登记表 | ✅ payment_id |
| 本次分配金额 | Currency | 核销金额 | ✅ allocated_amount |
| 核销类型 | Select | 款项类型 | ✅ verification_type |
| 核销日期 | Date | 确认时间 | ✅ verification_date |
| 备注 | Text | 备注信息 | ✅ remarks |

### 核销类型枚举

**verification_type**
| 值 | 显示名 |
|----|--------|
| normal | 正常核销 |
| advance | 预收款 |
| refund | 退款 |
| adjustment | 调整 |

---

## 五、PI 号与生产单号规则

### PI 号（外部沟通用）

**格式**: `年份 + DH + 月份 + 序列号`

**示例**: `26DH01001`

| 部分 | 说明 | 示例值 |
|------|------|--------|
| 年份 | 两位年份数字 | 26 (2026年) |
| DH | 公司名称"德皓" | DH |
| 月份 | 两位月份（进单月份） | 01 (1月) |
| 序列号 | 三位年度序列号 | 001 (第1单) |

**用途**: 与客户沟通、合同、发票等外部文档

### 生产单号（内部沟通用）

**格式**: `年份 + 序列号 + [字母]`

**示例**: `26001` 或 `26001A`

| 部分 | 说明 | 示例值 |
|------|------|--------|
| 年份 | 两位年份数字 | 26 (2026年) |
| 序列号 | 三位年度序列号 | 001 (第1单) |
| 字母 | 子订单后缀（可选） | A, B, C... |

**子订单说明**:
- 当客户订单被拆分为多个子订单时，添加字母后缀
- 例如：`26001A` 和 `26001B` 是两个独立运行的子订单

**用途**: 与生产部门、供应商沟通

---

## 六、View 设计建议

### API 专用视图

建议在 Airtable 中创建以下视图，用于 API 同步：

| View 名称 | 用途 | 筛选条件 |
|-----------|------|----------|
| **API_Sync_Active** | 同步活跃订单 | `出货状况 != 作废` AND `未结欠款 > 0` |
| **API_Sync_All** | 同步所有订单 | 无筛选 |
| **API_Pending_Verification** | 待核销订单 | `核销状态 = 待支付 OR 部分支付` |

### View ID 获取方式

1. 打开 Airtable 对应视图
2. 查看浏览器 URL：`https://airtable.com/appXXX/tblXXX/viw1234567890ABCD`
3. 复制 `viw` 开头的字符串即为 View ID

### API 调用示例

```typescript
import { createAirtableClient } from '@libs/airtable';

const poTable = createAirtableClient('PO表', { base: 'order' });

// 使用 View + Fields 过滤
const { records } = await poTable.list({
  view: 'viwXXXXXXXXXX',  // View ID（比名称更稳定）
  fields: [
    'PI号',
    '生产单号',
    '客户名称',
    '订单总金额',
    '未结欠款',
    '核销状态',
    '出货状况'
  ],
  // view 过滤行，fields 过滤列，减少返回数据量
});
```

> ⚠️ **注意**: Airtable 的 `view` 参数**只过滤行，不过滤列**。即使视图中隐藏了某些字段，API 仍会返回全部字段。必须使用 `fields` 参数明确指定需要的列。

---

## 七、公式字段说明

### PO 表

```
未结欠款 = 订单总金额 - 已收总额
已收总额 = ROLLUP(收款_中间表, "本次分配金额", SUM)
```

### 收款登记表

```
待分配余额 = 实收金额 - 已核销总额
已核销总额 = ROLLUP(收款_中间表, "本次分配金额", SUM)
```

---

## 八、环境变量配置

```env
# Airtable API Key（一个 Key 可访问所有 Base）
AIRTABLE_API_KEY="patXXXXXXXXXXXXXX"

# 订单 Base ID
AIRTABLE_BASE_ORDER="appCkvqCpKZR66zLL"

# 可选：样品、客户 Base
AIRTABLE_BASE_SAMPLE="appoCM9JVftYuVhuS"
AIRTABLE_BASE_CUSTOMER="appozeqJca7xzB7L0"
```

---

*文档更新时间: 2026-03-03*
