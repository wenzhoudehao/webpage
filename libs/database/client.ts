import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';
import * as schema from './schema';

type Database = NodePgDatabase<typeof schema>;

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

// 使用 Proxy 延迟访问，但保持正确的类型
// [KEEP-MY-CHANGE] 修复 Vercel 构建错误：延迟初始化避免模块加载时创建连接
export const db: Database = new Proxy({} as Database, {
  get(target, prop) {
    const actualDb = getDb();
    const value = actualDb[prop as keyof Database];
    if (typeof value === 'function') {
      return value.bind(actualDb);
    }
    return value;
  }
});

export const pool = new Proxy({} as Pool, {
  get(target, prop) {
    const actualPool = getPool();
    const value = actualPool[prop as keyof Pool];
    if (typeof value === 'function') {
      return value.bind(actualPool);
    }
    return value;
  }
});
