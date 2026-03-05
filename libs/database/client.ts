import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';
import * as schema from './schema';

// 创建连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 导出 Drizzle 客户端，注入 schema 以支持 db.query
export const db = drizzle(pool, { schema });

// 导出 pool 供其他用途
export { pool };
