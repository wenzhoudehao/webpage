import * as schema from './schema';

// 导出数据库客户端（它会自动连接你在 Vercel 填好的 DATABASE_URL）
export * from "./client";

// 导出所有的表结构模式，让 TypeScript 不再报错
export * from './schema';

// 集中导出德皓系统常用的数据库表，确保其他功能运行正常
export const {
  user,
  order,
  subscription,
  account,
  session,
  verification
} = schema;