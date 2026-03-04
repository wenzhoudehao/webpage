import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  // 检查各表记录数
  const poCount = await pool.query('SELECT COUNT(*) FROM cached_po');
  const paymentCount = await pool.query('SELECT COUNT(*) FROM cached_payment');
  const verificationCount = await pool.query('SELECT COUNT(*) FROM cached_verification');

  console.log('缓存表记录数:');
  console.log(`  PO: ${poCount.rows[0].count}`);
  console.log(`  收款: ${paymentCount.rows[0].count}`);
  console.log(`  核销: ${verificationCount.rows[0].count}`);

  // 检查最近同步日志
  const logResult = await pool.query(`
    SELECT id, status, success, duration, started_at, stats, errors
    FROM sync_log
    ORDER BY started_at DESC
    LIMIT 3
  `);

  console.log('\n最近同步日志:');
  for (const log of logResult.rows) {
    console.log(`\nID: ${log.id}`);
    console.log(`状态: ${log.status} (成功: ${log.success})`);
    console.log(`开始: ${log.started_at}`);
    console.log(`统计:`, JSON.stringify(log.stats, null, 2));
    console.log(`错误:`, JSON.stringify(log.errors, null, 2));
  }

  await pool.end();
}

check().catch(console.error);
