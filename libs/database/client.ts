import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';
import * as schema from './schema';

// 定义数据库类型
type Database = NodePgDatabase<typeof schema>;

// 检查是否在构建时（Vercel 构建阶段或没有数据库 URL）
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    (process.env.VERCEL === '1' && !process.env.DATABASE_URL);

// 延迟初始化连接池，避免在构建时创建连接
let _pool: Pool | null = null;
let _db: Database | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return _pool;
}

function getDb(): Database {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// 创建一个返回空结果的 RelationalQueryBuilder mock
function createNoOpQueryBuilder() {
  return new Proxy({} as any, {
    get(target, prop) {
      // findFirst, findMany 等方法返回空结果
      if (prop === 'findFirst' || prop === 'findFirstOrThrow') {
        return async () => {
          console.warn(`Warning: Attempting to query database during build time.`);
          return undefined;
        };
      }
      if (prop === 'findMany' || prop === 'findManyOrThrow') {
        return async () => {
          console.warn(`Warning: Attempting to query database during build time.`);
          return [];
        };
      }
      // 其他属性继续代理
      return createNoOpQueryBuilder();
    }
  });
}

// 创建一个空的数据库操作对象，用于构建时
function createNoOpDb(): Database {
  // 创建模拟的 query 对象，包含所有表
  const mockQuery = new Proxy({} as Database['query'], {
    get(target, prop) {
      // 对于任何表名（order, user, subscription 等），返回一个 query builder
      return createNoOpQueryBuilder();
    }
  });

  return new Proxy({} as Database, {
    get(target, prop) {
      if (prop === 'query') {
        return mockQuery;
      }
      // select, insert, update, delete 等方法
      if (typeof prop === 'string') {
        return async (...args: any[]) => {
          console.warn(`Warning: Attempting to use database method "${prop}" during build time.`);
          return Array.isArray(args[0]) ? [] : undefined;
        };
      }
      return undefined;
    }
  });
}

// 导出数据库连接池（延迟初始化）
export const pool = isBuildTime
  ? ({} as Pool)
  : new Proxy({} as Pool, {
      get(target, prop) {
        const actualPool = getPool();
        const value = actualPool[prop as keyof Pool];
        if (typeof value === 'function') {
          return value.bind(actualPool);
        }
        return value;
      }
    });

// 导出 Drizzle 客户端（延迟初始化，注入 schema）
export const db = isBuildTime
  ? createNoOpDb()
  : new Proxy({} as Database, {
      get(target, prop) {
        const actualDb = getDb();
        const value = actualDb[prop as keyof Database];
        if (typeof value === 'function') {
          return value.bind(actualDb);
        }
        return value;
      }
    });
