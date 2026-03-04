import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

console.log('DATABASE_URL 已加载:', !!process.env.DATABASE_URL);

import('../libs/database/index.js').then(async ({ db }) => {
  const { cachedPO } = await import('../libs/database/schema/airtable-cache.js');

  const pos = await db.select().from(cachedPO);
  console.log('\n缓存表 PO 数量:', pos.length);
  console.log('前5条 PI号:', pos.slice(0, 5).map(p => p.piNo));

  // 检查诊断中提到的 PI 是否在缓存中
  const checkPIs = ['25DH02014', '25DH02006B', '25DH02009B', '25DH02010', '26DH02014', '26DH02015', '26DH02018'];
  console.log('\n检查诊断报告中"缺失"的 PI:');
  for (const pi of checkPIs) {
    const found = pos.find(p => p.piNo === pi);
    console.log(`  ${pi}: ${found ? '✅ 存在于缓存' : '❌ 不在缓存中'}`);
  }

  process.exit(0);
}).catch(console.error);
