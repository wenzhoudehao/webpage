/**
 * 检查 Airtable 表结构
 *
 * 运行方式: npx tsx scripts/inspect-airtable.ts
 */

import 'dotenv/config';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ORDER;

if (!API_KEY || !BASE_ID) {
  console.error('❌ 请设置 AIRTABLE_API_KEY 和 AIRTABLE_BASE_ORDER 环境变量');
  process.exit(1);
}

async function getBaseSchema() {
  console.log('📋 获取 Airtable Base 结构...\n');
  console.log(`Base ID: ${BASE_ID}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...\n`);

  try {
    // 获取 Base 的表列表
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API 错误:', error);
      return;
    }

    const data = await response.json();
    const tables = data.tables;

    console.log(`📊 找到 ${tables.length} 个表:\n`);

    for (const table of tables) {
      console.log(`\n═══════════════════════════════════════════════════════════`);
      console.log(`📌 表名: ${table.name}`);
      console.log(`   ID: ${table.id}`);
      console.log(`   字段数: ${table.fields.length}`);
      console.log(`\n   字段列表:`);

      for (const field of table.fields) {
        console.log(`   - ${field.name} (${field.type})${field.description ? ` - ${field.description}` : ''}`);
      }

      // 获取前 3 条记录作为示例
      console.log(`\n   示例数据 (前 3 条):`);
      try {
        const recordsResponse = await fetch(
          `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table.name)}?maxRecords=3`,
          {
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
            },
          }
        );

        if (recordsResponse.ok) {
          const recordsData = await recordsResponse.json();
          for (const record of recordsData.records || []) {
            console.log(`   📝 Record ID: ${record.id}`);
            for (const [key, value] of Object.entries(record.fields || {})) {
              const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
              console.log(`      ${key}: ${displayValue}`);
            }
            console.log('');
          }
        }
      } catch (e) {
        console.log(`   ⚠️ 无法获取示例数据`);
      }
    }

  } catch (error) {
    console.error('❌ 请求失败:', error);
  }
}

getBaseSchema();
