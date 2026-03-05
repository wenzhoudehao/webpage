import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';
import * as schema from './schema';

// 定义数据库类型
type Database = NodePgDatabase<typeof schema>;

// 延迟初始化连接池和数据库
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

// 创建一个 Proxy，用于延迟访问实际的数据库实例
function createDbProxy(): Database {
  return new Proxy({} as Database, {
    get(target, prop) {
      const actualDb = getDb();
      const value = actualDb[prop as keyof Database];
      if (typeof value === 'function') {
        return value.bind(actualDb);
      }
      return value;
    }
  });
}

// 导出数据库连接池
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

// 导出 Drizzle 客户端（注入 schema 以支持 db.query）
export const db: Database = createDbProxy();
