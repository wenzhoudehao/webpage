import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';

// 检查是否在构建时（Vercel 构建阶段或没有数据库 URL）
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    (process.env.VERCEL === '1' && !process.env.DATABASE_URL);

// 延迟初始化连接池，避免在构建时创建连接
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return _pool;
}

function getDb() {
  if (!_db) {
    _db = drizzle(getPool());
  }
  return _db;
}

// 创建一个空的数据库操作对象，用于构建时
function createNoOpDb() {
  return new Proxy({} as ReturnType<typeof drizzle>, {
    get(target, prop) {
      // 返回一个异步函数，返回空数组或 undefined
      return async (...args: any[]) => {
        console.warn(`Warning: Attempting to use database method "${String(prop)}" during build time.`);
        return Array.isArray(args[0]) ? [] : undefined;
      };
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

// 导出 Drizzle 客户端（延迟初始化）
export const db = isBuildTime
  ? createNoOpDb()
  : new Proxy({} as ReturnType<typeof drizzle>, {
      get(target, prop) {
        const actualDb = getDb();
        const value = actualDb[prop as keyof typeof actualDb];
        if (typeof value === 'function') {
          return value.bind(actualDb);
        }
        return value;
      }
    }); 