import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ORDER;

async function test() {
  // 1. 获取核销记录
  const response = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/收款_中间表?view=API_Sync_Active&maxRecords=5`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  const data = await response.json();
  
  console.log('核销记录示例 (前5条):');
  for (const record of data.records || []) {
    const poIds = record.fields['关联订单'] || [];
    const paymentIds = record.fields['关联收款记录'] || [];
    
    console.log(`\nRecord ID: ${record.id}`);
    console.log(`  关联订单: ${JSON.stringify(poIds)}`);
    console.log(`  关联收款: ${JSON.stringify(paymentIds)}`);
    
    // 检查这些 ID 是否在缓存表中
    if (poIds.length > 0) {
      const poCheck = await pool.query('SELECT id FROM cached_po WHERE id = $1', [poIds[0]]);
      console.log(`  PO 存在于缓存表: ${poCheck.rows.length > 0}`);
    }
    if (paymentIds.length > 0) {
      const paymentCheck = await pool.query('SELECT id FROM cached_payment WHERE id = $1', [paymentIds[0]]);
      console.log(`  Payment 存在于缓存表: ${paymentCheck.rows.length > 0}`);
    }
  }
  
  await pool.end();
}

test().catch(console.error);
