/**
 * 同步日志表 Schema
 *
 * 记录每次 Airtable → Supabase 同步的详细结果
 * 用于排查问题和监控同步状态
 */

import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pgTable, text, timestamp, integer, jsonb, boolean, index } from "drizzle-orm/pg-core";

/**
 * 同步日志表
 */
export const syncLog = pgTable("sync_log", {
  // 主键
  id: text("id").primaryKey(),

  // === 同步信息 ===
  /** 同步类型：airtable */
  syncType: text("sync_type").notNull().default('airtable'),

  /** 同步状态：running, success, failed, partial */
  status: text("status").notNull().default('running'),

  /** 触发方式：manual, scheduled */
  triggerType: text("trigger_type").notNull().default('manual'),

  /** 触发用户 ID */
  triggeredBy: text("triggered_by"),

  // === 同步选项 ===
  /** 同步选项（JSON） */
  options: jsonb("options"),

  // === 同步结果 ===
  /** 总耗时（毫秒） */
  duration: integer("duration").default(0),

  /** 各表同步统计（JSON） */
  stats: jsonb("stats"),

  /** 错误信息列表（JSON） */
  errors: jsonb("errors"),

  /** 是否成功 */
  success: boolean("success").default(false),

  // === 时间戳 ===
  /** 开始时间 */
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),

  /** 完成时间 */
  completedAt: timestamp("completed_at", { withTimezone: true }),

  /** 创建时间 */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // 同步类型索引
  index("idx_sync_log_type").on(table.syncType),
  // 状态索引
  index("idx_sync_log_status").on(table.status),
  // 开始时间索引（查询最近的同步记录）
  index("idx_sync_log_started_at").on(table.startedAt),
  // 触发用户索引
  index("idx_sync_log_triggered_by").on(table.triggeredBy),
]);

// ============================================================================
// 类型导出
// ============================================================================

/** 同步日志记录 */
export type SyncLog = InferSelectModel<typeof syncLog>;
/** 新增同步日志 */
export type NewSyncLog = InferInsertModel<typeof syncLog>;

// ============================================================================
// 状态枚举
// ============================================================================

/** 同步状态 */
export const syncStatus = {
  RUNNING: 'running',     // 同步中
  SUCCESS: 'success',     // 成功
  FAILED: 'failed',       // 失败
  PARTIAL: 'partial',     // 部分成功
} as const;

/** 触发方式 */
export const triggerType = {
  MANUAL: 'manual',       // 手动触发
  SCHEDULED: 'scheduled', // 定时触发
} as const;

/** 同步类型 */
export const syncType = {
  AIRTABLE: 'airtable',   // Airtable 同步
} as const;
