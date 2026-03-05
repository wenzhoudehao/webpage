import * as schema from './schema';

// 导出数据库客户端（这里面包含了真正被正确初始化的 db，而不是假补丁）
export * from "./client";

// 导出所有表结构模式
export * from './schema';

// 为了保持项目中其他文件的向后兼容性，集中导出常用的表
export const {
  user,
  order,
  subscription,
  account,
  session,
  verification
} = schema;