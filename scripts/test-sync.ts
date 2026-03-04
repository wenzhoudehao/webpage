/**
 * 测试 Airtable 同步功能
 */

import 'dotenv/config';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ORDER;

async function testSync() {
  console.log('🧪 测试 Airtable 数据读取...\n');

  // 测试读取 PO 表
  console.log('📋 读取 PO 表...');
  const poResponse = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/PO?maxRecords=3`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  const poData = await poResponse.json();
  console.log(`   找到 ${poData.records?.length || 0} 条记录`);
  if (poData.records?.[0]) {
    console.log('   示例字段:', Object.keys(poData.records[0].fields).slice(0, 10).join(', '));
  }

  // 测试读取收款登记表
  console.log('\n💰 读取 收款登记 表...');
  const paymentResponse = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/收款登记?maxRecords=3`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  const paymentData = await paymentResponse.json();
  console.log(`   找到 ${paymentData.records?.length || 0} 条记录`);

  // 测试读取核销表
  console.log('\n🔗 读取 收款_中间表...');
  const verifyResponse = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/收款_中间表?maxRecords=3`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  const verifyData = await verifyResponse.json();
  console.log(`   找到 ${verifyData.records?.length || 0} 条记录`);

  console.log('\n✅ Airtable 数据读取测试完成！');
}

testSync().catch(console.error);
