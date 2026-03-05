import * as schema from './schema';

// 检查是否在构建时
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    (process.env.VERCEL === '1' && !process.env.DATABASE_URL);

// 导出数据库客户端（从 client.ts 导入，它已经处理了构建时的情况）
export * from "./client";

// 导出所有模式
export * from './schema';

// 导出查询构建器（延迟初始化）
export const query = {
  user: {
    findFirst: async (params: { where: any }) => {
      if (isBuildTime) {
        console.warn('Warning: Attempting to query database during build time.');
        return null;
      }
      const { db } = await import('./client');
      const result = await db.select().from(schema.user).where(params.where).limit(1);
      return result[0];
    }
  },
  order: {
    findFirst: async (params: { where: any }) => {
      if (isBuildTime) {
        console.warn('Warning: Attempting to query database during build time.');
        return null;
      }
      const { db } = await import('./client');
      const result = await db.select().from(schema.order).where(params.where).limit(1);
      return result[0];
    }
  }
};

// 为了保持向后兼容，直接导出常用的表
export const {
  user,
  order,
  subscription,
  // 从 auth.ts 导出的表
  account,
  session,
  verification
} = schema; 