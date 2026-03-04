import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const result = await pool.query(`
    SELECT id, status, success, duration, started_at, completed_at, stats, errors
    FROM sync_log
    ORDER BY started_at DESC
    LIMIT 5
  `);

  console.log('📋 最近同步日志:\n');
  for (const log of result.rows) {
    console.log(`ID: ${log.id}`);
    console.log(`状态: ${log.status}`);
    console.log(`成功: ${log.success}`);
    console.log(`耗时: ${log.duration}ms`);
    console.log(`开始: ${log.started_at}`);
    console.log(`完成: ${log.completed_at}`);
    console.log(`统计: ${JSON.stringify(log.stats, null, 2)}`);
    console.log(`错误: ${JSON.stringify(log.errors, null, 2)}`);
    console.log('---');
  }

  await pool.end();
}

check().catch(console.error);
