/**
 * Airtable 缓存表 Schema
 *
 * 用于缓存 Airtable 订单/收款/核销数据到 Supabase
 * 采用方案 A+：缓存读取 + 实时写入
 *
 * 设计原则：
 * - 字段精简：只包含前端 GUI 必需的字段
 * - Record ID：保留 Airtable Record ID 用于实时写入
 * - 索引优化：高频查询字段添加索引
 * - 宽松约束：允许关联不完整的记录（业务实际情况）
 *
 * 数据流：
 * - 读取：Airtable View → Supabase 缓存 → 应用
 * - 写入：应用 → Airtable API → Airtable
 *
 * 业务说明：
 * - 订单（PI号）是核心，先有订单
 * - 收款登记和核销中间表是独立的，没有强制依赖
 * - 可能存在：客人迟迟没付款、业务员忘记分配、客人提早付款等情况
 */

import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pgTable, text, timestamp, numeric, jsonb, index } from "drizzle-orm/pg-core";

// ============================================================================
// 常量定义（状态枚举）
// ============================================================================

/**
 * 订单核销状态
 * 对应 Airtable PO 表的「核销状态」字段
 */
export const poVerificationStatus = {
  PENDING: "pending",       // 待支付
  PARTIAL: "partial",       // 部分支付
  COMPLETED: "completed",   // 已清账
  OVERPAID: "overpaid",     // 超额支付
} as const;

/**
 * 订单出货状态
 * 对应 Airtable PO 表的「出货状况」字段
 */
export const poShippingStatus = {
  PENDING: "pending",       // 待出货
  PARTIAL: "partial",       // 部分出货
  SHIPPED: "shipped",       // 已出货
  CANCELLED: "cancelled",   // 作废
} as const;

/**
 * 收款方式
 * 对应 Airtable 收款登记表的「收款方式」字段
 */
export const paymentMethodType = {
  BANK_TRANSFER: "bank_transfer",  // 银行转账
  CASH: "cash",                    // 现金
  ALIPAY: "alipay",                // 支付宝
  WECHAT: "wechat",                // 微信
  CHECK: "check",                  // 支票
  OTHER: "other",                  // 其他
} as const;

/**
 * 核销类型
 * 对应 Airtable 收款_中间表的「核销类型」字段
 */
export const verificationType = {
  NORMAL: "normal",         // 正常核销
  ADVANCE: "advance",       // 预收款
  REFUND: "refund",         // 退款
  ADJUSTMENT: "adjustment", // 调整
} as const;

// ============================================================================
// PO 表（订单缓存）
// ============================================================================

/**
 * PO 表 - 订单缓存
 *
 * Airtable 原表名：PO表
 * 主键：Airtable Record ID (recXXXXXXXXXXXXXX)
 *
 * PI号规则：年份(2位) + DH + 月份(2位) + 序列号(3位)
 * 示例：26DH01001 = 2026年德皓1月第001单
 *
 * 生产单号规则：年份(2位) + 序列号(3位) + [字母]
 * 示例：26001 = 2026年第001单，26001A = 子订单A
 */
export const cachedPO = pgTable("cached_po", {
  // 主键：Airtable Record ID（用于实时写入定位）
  id: text("id").primaryKey(),

  // === 核心业务字段 ===
  /** PI号 - 外部沟通用，格式：年份+DH+月份+序列号，如 26DH01001 */
  piNo: text("pi_no").notNull(),

  /** 生产单号 - 内部沟通用，格式：年份+序列号[字母]，如 26001 或 26001A */
  productionNo: text("production_no").notNull(),

  /** 客户名称 - Airtable 字段：客户名称 */
  customerName: text("customer_name").notNull(),

  /** 订单总金额 - Airtable 字段：订单总金额 */
  totalAmount: numeric("total_amount").notNull(),

  /** 未结欠款 - Airtable 字段：未结欠款 */
  outstandingBalance: numeric("outstanding_balance").notNull(),

  /** 核销状态 - Airtable 字段：核销状态 */
  verificationStatus: text("verification_status").notNull().default(poVerificationStatus.PENDING),

  /** 出货状况 - Airtable 字段：出货状况 */
  shippingStatus: text("shipping_status").default(poShippingStatus.PENDING),

  /** 订单日期 - Airtable 字段：订单日期 */
  orderDate: timestamp("order_date", { withTimezone: true }),

  /** 备注 - Airtable 字段：备注 */
  remarks: text("remarks"),

  // === 系统字段 ===
  /** 同步时间 */
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),

  /** 原始数据（调试用，存储完整的 Airtable 记录） */
  rawData: jsonb("raw_data"),

  /** 创建时间 */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /** 更新时间 */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // PI号索引（精确查询）
  index("idx_cached_po_pi_no").on(table.piNo),
  // 生产单号索引（内部沟通高频使用）
  index("idx_cached_po_production_no").on(table.productionNo),
  // 客户名称索引（按客户筛选）
  index("idx_cached_po_customer").on(table.customerName),
  // 核销状态索引（按状态筛选）
  index("idx_cached_po_verification_status").on(table.verificationStatus),
  // 同步时间索引（增量同步）
  index("idx_cached_po_synced_at").on(table.syncedAt),
]);

// ============================================================================
// 收款登记表（收款缓存）
// ============================================================================

/**
 * 收款登记表 - 收款记录缓存
 *
 * Airtable 原表名：收款登记表
 * 主键：Airtable Record ID (recXXXXXXXXXXXXXX)
 *
 * 注意：收款记录可以独立存在，不一定需要关联订单
 * （例如：客人提早付款，业务员还没创建订单）
 */
export const cachedPayment = pgTable("cached_payment", {
  // 主键：Airtable Record ID
  id: text("id").primaryKey(),

  // === 核心业务字段 ===
  /** 收款编号 - Airtable 字段：收款编号，如 "CR260228收" */
  paymentNo: text("payment_no").notNull(),

  /** 客户名称 - Airtable 字段：客户名称 */
  customerName: text("customer_name").notNull(),

  /** 实收金额 - Airtable 字段：实收金额 */
  receivedAmount: numeric("received_amount").notNull(),

  /** 待分配余额 - Airtable 字段：待分配余额 */
  unallocatedBalance: numeric("unallocated_balance").notNull(),

  /** 收款方式 - Airtable 字段：收款方式 */
  paymentMethod: text("payment_method").notNull(),

  /** 到账日期 - Airtable 字段：到账日期 */
  receivedDate: timestamp("received_date", { withTimezone: true }),

  /** 收款账户 - Airtable 字段：收款账户 */
  bankAccount: text("bank_account"),

  /** 备注 - Airtable 字段：备注 */
  remarks: text("remarks"),

  // === 系统字段 ===
  /** 同步时间 */
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),

  /** 原始数据（调试用） */
  rawData: jsonb("raw_data"),

  /** 创建时间 */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /** 更新时间 */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // 收款编号索引
  index("idx_cached_payment_no").on(table.paymentNo),
  // 客户名称索引
  index("idx_cached_payment_customer").on(table.customerName),
  // 到账日期索引（按日期范围查询）
  index("idx_cached_payment_date").on(table.receivedDate),
  // 同步时间索引
  index("idx_cached_payment_synced_at").on(table.syncedAt),
]);

// ============================================================================
// 收款_中间表（核销记录缓存）
// ============================================================================

/**
 * 收款_中间表 - 核销记录缓存
 *
 * Airtable 原表名：收款_中间表
 * 主键：Airtable Record ID (recXXXXXXXXXXXXXX)
 *
 * 关系说明：
 * - 关联到 PO 表（订单）- 可为空，表示还没分配到订单
 * - 关联到收款登记表（收款）- 可为空，表示还没关联收款
 * - 实现订单与收款的灵活关联
 *
 * 业务场景：
 * - 客人迟迟没付款 → 有订单，没收款
 * - 业务员忘记分配 → 有收款，没关联订单
 * - 客人提早付款 → 有收款，订单还没创建
 */
export const cachedVerification = pgTable("cached_verification", {
  // 主键：Airtable Record ID
  id: text("id").primaryKey(),

  // === 关联字段（可为空，无外键约束）===
  /**
   * 关联订单 ID - Airtable 字段：关联订单
   * 可为空：收款还没分配到订单
   */
  poId: text("po_id"),

  /**
   * 关联收款 ID - Airtable 字段：关联收款
   * 可为空：预收款等情况
   */
  paymentId: text("payment_id"),

  // === 核心业务字段 ===
  /** 本次分配金额 - Airtable 字段：本次分配金额 */
  allocatedAmount: numeric("allocated_amount").notNull().default('0'),

  /** 核销类型 - Airtable 字段：核销类型 */
  verificationType: text("verification_type").notNull().default(verificationType.NORMAL),

  /** 核销日期 - Airtable 字段：核销日期 */
  verificationDate: timestamp("verification_date", { withTimezone: true }),

  /** 备注 - Airtable 字段：备注 */
  remarks: text("remarks"),

  // === 系统字段 ===
  /** 同步时间 */
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),

  /** 原始数据（调试用） */
  rawData: jsonb("raw_data"),

  /** 创建时间 */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /** 更新时间 */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // 订单 ID 索引（查询某订单的所有核销记录）
  index("idx_cached_verification_po").on(table.poId),
  // 收款 ID 索引（查询某收款的所有核销记录）
  index("idx_cached_verification_payment").on(table.paymentId),
  // 核销日期索引
  index("idx_cached_verification_date").on(table.verificationDate),
  // 同步时间索引
  index("idx_cached_verification_synced_at").on(table.syncedAt),
]);

// ============================================================================
// 类型导出
// ============================================================================

/** 缓存的订单记录 */
export type CachedPO = InferSelectModel<typeof cachedPO>;
/** 新增订单缓存 */
export type NewCachedPO = InferInsertModel<typeof cachedPO>;

/** 缓存的收款记录 */
export type CachedPayment = InferSelectModel<typeof cachedPayment>;
/** 新增收款缓存 */
export type NewCachedPayment = InferInsertModel<typeof cachedPayment>;

/** 缓存的核销记录 */
export type CachedVerification = InferSelectModel<typeof cachedVerification>;
/** 新增核销缓存 */
export type NewCachedVerification = InferInsertModel<typeof cachedVerification>;

// ============================================================================
// 类型别名（便于业务使用）
// ============================================================================

/** 订单核销状态类型 */
export type POVerificationStatus = typeof poVerificationStatus[keyof typeof poVerificationStatus];

/** 订单出货状态类型 */
export type POShippingStatus = typeof poShippingStatus[keyof typeof poShippingStatus];

/** 收款方式类型 */
export type PaymentMethodType = typeof paymentMethodType[keyof typeof paymentMethodType];

/** 核销类型 */
export type VerificationType = typeof verificationType[keyof typeof verificationType];
