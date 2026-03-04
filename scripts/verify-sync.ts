import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  console.log('📊 验证同步数据...\n');

  const poResult = await pool.query('SELECT COUNT(*) FROM cached_po');
  const paymentResult = await pool.query('SELECT COUNT(*) FROM cached_payment');
  const verificationResult = await pool.query('SELECT COUNT(*) FROM cached_verification');

  console.log(`PO 表: ${poResult.rows[0].count} 条记录`);
  console.log(`收款表: ${paymentResult.rows[0].count} 条记录`);
  console.log(`核销表: ${verificationResult.rows[0].count} 条记录`);

  // 显示示例数据
  const poSample = await pool.query('SELECT pi_no, customer_name, total_amount FROM cached_po LIMIT 3');
  console.log('\n📝 PO 示例数据:');
  for (const po of poSample.rows) {
    console.log(`   ${po.pi_no} | ${po.customer_name} | ${po.total_amount}`);
  }

  const paymentSample = await pool.query('SELECT payment_no, customer_name, received_amount FROM cached_payment LIMIT 3');
  console.log('\n💰 收款示例数据:');
  for (const p of paymentSample.rows) {
    console.log(`   ${p.payment_no} | ${p.customer_name} | ${p.received_amount}`);
  }

  await pool.end();
}

verify().catch(console.error);
