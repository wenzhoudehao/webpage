import 'dotenv/config';

async function testSync() {
  console.log('🧪 测试 Airtable 同步服务...\n');

  try {
    const { airtableSyncService } = await import('../libs/airtable/sync-service.js');

    console.log('📋 开始同步（使用 API_Sync_Active 视图）...');
    const result = await airtableSyncService.syncAll({
      tables: ['verification'],  // 只测试核销表
      view: 'API_Sync_Active'
    });

    console.log('\n📊 同步结果:');
    console.log(`   成功: ${result.success}`);
    console.log(`   总耗时: ${result.totalDuration}ms`);

    for (const stat of result.stats) {
      console.log(`\n   📁 ${stat.table}:`);
      console.log(`      总记录: ${stat.total}`);
      console.log(`      成功: ${stat.inserted}`);
      console.log(`      错误: ${stat.errors}`);
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️ 错误信息:');
      result.errors.forEach(e => console.log(`   - ${e}`));
    }

  } catch (error) {
    console.error('❌ 同步失败:', error);
  }
}

testSync();
