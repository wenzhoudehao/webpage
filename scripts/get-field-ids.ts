/**
 * 获取 Airtable 字段 ID
 * 用于创建稳定的字段映射
 */

import 'dotenv/config';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ORDER;

const TARGET_TABLES = ['PO', '收款登记', '收款_中间表'];

async function getFieldIds() {
  console.log('📋 获取 Airtable Field IDs...\n');

  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );

  const data = await response.json();

  for (const table of data.tables) {
    if (!TARGET_TABLES.includes(table.name)) continue;

    console.log(`\n// ========== ${table.name} ==========`);
    console.log(`// Table ID: ${table.id}`);
    console.log(`export const ${table.name.toUpperCase().replace(/[^A-Z]/g, '_')}_FIELDS = {`);

    for (const field of table.fields) {
      // 生成安全的变量名
      const varName = field.name
        .replace(/[（）]/g, '')
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
        .toUpperCase();
      
      console.log(`  ${varName}: "${field.id}", // ${field.name} (${field.type})`);
    }

    console.log('};');
  }
}

getFieldIds().catch(console.error);
