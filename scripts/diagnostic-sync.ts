/**
 * 同步诊断脚本（增强版）
 *
 * 运行方式: npx tsx scripts/diagnostic-sync.ts
 *
 * 分析内容：
 * 1. 从 Airtable 获取所有核销记录
 * 2. 从缓存表获取所有 PO ID
 * 3. 找出引用不存在的 PO 的核销记录
 * 4. 直接从 Airtable 查询缺失 PO 的详细信息
 */

// 必须在最开始加载环境变量
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

console.log('DATABASE_URL 已加载:', !!process.env.DATABASE_URL);

import('../libs/database/index.js').then(async ({ db }) => {
  const { cachedPO, cachedPayment } = await import('../libs/database/schema/airtable-cache.js');
  const { createAirtableClient, collectAll } = await import('../libs/airtable/index.js');
  const {
    VERIFICATION_FIELDS,
    PO_FIELDS,
    PAYMENT_FIELDS
  } = await import('../libs/airtable/field-mappings.js');

  try {
    console.log('\n========== 同步诊断开始 ==========\n');

    // 1. 从缓存表获取已同步的记录
    console.log('1. 查询缓存表...');
    const [existingPOs, existingPayments] = await Promise.all([
      db.select({
        id: cachedPO.id,
        piNo: cachedPO.piNo,
        productionNo: cachedPO.productionNo,
        customerName: cachedPO.customerName
      }).from(cachedPO),
      db.select({
        id: cachedPayment.id,
        paymentNo: cachedPayment.paymentNo,
        customerName: cachedPayment.customerName
      }).from(cachedPayment)
    ]);

    const existingPOIds = new Set(existingPOs.map(po => po.id));
    const existingPaymentIds = new Set(existingPayments.map(p => p.id));

    const poMap = new Map(existingPOs.map(po => [po.id, po]));
    const paymentMap = new Map(existingPayments.map(p => [p.id, p]));

    console.log(`   缓存表中有 ${existingPOIds.size} 条 PO 记录`);
    console.log(`   缓存表中有 ${existingPaymentIds.size} 条收款记录\n`);

    // 2. 从 Airtable 获取核销记录
    console.log('2. 从 Airtable 获取核销记录...');
    type VerificationFields = Record<string, unknown>;
    const verificationClient = createAirtableClient<VerificationFields>('收款_中间表', { base: 'order' });
    const verificationRecords = await collectAll(verificationClient, { view: 'API_Sync_Active' });

    console.log(`   Airtable 中有 ${verificationRecords.length} 条核销记录\n`);

    // 3. 分析并收集缺失的 PO ID
    console.log('3. 分析核销记录...');

    const missingPOIds = new Set<string>();
    const validRecords: any[] = [];
    const missingPORecords: any[] = [];
    const incompleteRecords: any[] = [];

    for (const record of verificationRecords) {
      const fields = record.fields;

      const poIds = (fields['关联订单'] || fields[VERIFICATION_FIELDS.PO_ID]) as string[] | undefined;
      const paymentIds = (fields['关联收款记录'] || fields[VERIFICATION_FIELDS.PAYMENT_ID]) as string[] | undefined;
      const allocatedAmount = String(fields['本次分配金额'] ?? '0');

      const poId = poIds?.[0] || null;
      const paymentId = paymentIds?.[0] || null;

      const poInfo = poId ? poMap.get(poId) : null;
      const paymentInfo = paymentId ? paymentMap.get(paymentId) : null;

      const poDisplay = poInfo
        ? `${poInfo.piNo || '(无PI)'} / ${poInfo.productionNo || '(无生产单号)'} / ${poInfo.customerName || '(无客户)'}`
        : null;

      const paymentDisplay = paymentInfo
        ? `${paymentInfo.paymentNo || '(无编号)'} / ${paymentInfo.customerName || '(无客户)'}`
        : null;

      if (!poId || !paymentId) {
        incompleteRecords.push({
          verificationId: record.id,
          poId,
          paymentId,
          allocatedAmount,
          reason: !poId && !paymentId ? 'PO 和收款都为空' : (!poId ? 'PO 为空' : '收款为空')
        });
      } else if (!existingPOIds.has(poId)) {
        missingPOIds.add(poId);
        missingPORecords.push({
          verificationId: record.id,
          poId,
          paymentId,
          paymentDisplay: paymentDisplay || paymentId,
          allocatedAmount
        });
      } else {
        validRecords.push({
          id: record.id,
          poId,
          poDisplay,
          paymentId,
          paymentDisplay
        });
      }
    }

    // 4. 从 Airtable 查询缺失 PO 的详细信息
    let missingPODetails: Map<string, { pi: string; productionNo: string; customer: string }> = new Map();

    if (missingPOIds.size > 0) {
      console.log('4. 从 Airtable 查询缺失 PO 的详细信息...\n');

      type POFields = Record<string, unknown>;
      const poClient = createAirtableClient<POFields>('PO', { base: 'order' });

      // 使用 filterByFormula 查询特定的 PO 记录
      const poIdList = Array.from(missingPOIds);
      const formula = `OR(${poIdList.map(id => `RECORD_ID()='${id}'`).join(',')})`;

      try {
        // 注意：不使用 view 参数，直接在整个表中搜索
        // 使用 Field ID 来获取字段，避免字段名变更问题
        console.log(`   查询公式: ${formula}`);
        const poRecords = await collectAll(poClient, {
          filterByFormula: formula,
          fields: [
            PO_FIELDS.PI,           // PI号
            PO_FIELDS.PRODUCTION_NO,// 生产单号
            PO_FIELDS.CUSTOMER      // 客户名称
          ]
        });

        console.log(`   找到 ${poRecords.length} 条 PO 记录\n`);

        for (const rec of poRecords) {
          // 使用字段名访问（Airtable API 返回的是字段名作为 key）
          const fields = rec.fields as Record<string, unknown>;

          // 处理客户字段（可能是数组）
          let customerDisplay = '(无)';
          const customerValue = fields['客户'];
          if (Array.isArray(customerValue)) {
            customerDisplay = customerValue.join(', ');
          } else if (customerValue) {
            customerDisplay = String(customerValue);
          }

          missingPODetails.set(rec.id, {
            pi: String(fields['PI'] || '(无)'),
            productionNo: String(fields['生产单'] || '(无)'),
            customer: customerDisplay
          });
        }
      } catch (e) {
        console.log('   无法获取 PO 详情:', e instanceof Error ? e.message : e);
        console.log('');
      }
    }

    // 5. 输出结果
    console.log('\n========== 诊断结果 ==========\n');

    console.log('汇总:');
    console.log(`  - 核销记录总数: ${verificationRecords.length}`);
    console.log(`  - 有效记录: ${validRecords.length}`);
    console.log(`  - 缺少 PO: ${missingPORecords.length}`);
    console.log(`  - 关联不完整: ${incompleteRecords.length}\n`);

    // 显示缺少 PO 的记录（带详细信息）
    if (missingPORecords.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`【缺少 PO】(${missingPORecords.length} 条)`);
      console.log('这些核销记录关联的 PO 不在 API_Sync_Active 视图中');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // 按 PO ID 分组
      const groupedByPO: Record<string, typeof missingPORecords> = {};
      for (const rec of missingPORecords) {
        if (!groupedByPO[rec.poId]) {
          groupedByPO[rec.poId] = [];
        }
        groupedByPO[rec.poId].push(rec);
      }

      for (const [poId, records] of Object.entries(groupedByPO)) {
        const details = missingPODetails.get(poId);
        console.log(`┌─────────────────────────────────────────────────────────────`);
        console.log(`│ 缺失的 PO: ${details ? details.pi : '(未找到)'}`);
        if (details) {
          console.log(`│ 生产单号: ${details.productionNo}`);
          console.log(`│ 客户: ${details.customer}`);
        }
        console.log(`│ Record ID: ${poId}`);
        console.log(`├─────────────────────────────────────────────────────────────`);
        console.log(`│ 关联的核销记录 (${records.length} 条):`);

        for (const rec of records) {
          console.log(`│   - 核销ID: ${rec.verificationId}`);
          console.log(`│     分配金额: ${rec.allocatedAmount}`);
        }
        console.log(`└─────────────────────────────────────────────────────────────\n`);
      }
    }

    // 显示关联不完整的记录
    if (incompleteRecords.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`【关联不完整】(${incompleteRecords.length} 条)`);
      console.log('这些核销记录缺少 PO 或收款关联（可能是草稿/测试数据）');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      for (const rec of incompleteRecords) {
        console.log(`核销ID: ${rec.verificationId}`);
        console.log(`  PO ID: ${rec.poId || '(空)'}`);
        console.log(`  收款 ID: ${rec.paymentId || '(空)'}`);
        console.log(`  分配金额: ${rec.allocatedAmount}`);
        console.log(`  原因: ${rec.reason}\n`);
      }
    }

    console.log('========== 诊断完成 ==========\n');

    // 结论和建议
    const totalInvalid = missingPORecords.length + incompleteRecords.length;
    if (totalInvalid > 0) {
      console.log('结论:');
      console.log(`  共发现 ${totalInvalid} 条无法同步的核销记录\n`);

      console.log('建议:');
      if (missingPORecords.length > 0) {
        console.log('  1. 检查上面列出的缺失 PO 是否需要同步');
        console.log('     - 如果需要：将这些 PO 加入 Airtable 的 "API_Sync_Active" 视图');
        console.log('     - 如果不需要：可以忽略这些核销记录的同步错误');
      }
      if (incompleteRecords.length > 0) {
        console.log('  2. 关联不完整的记录建议在 Airtable 中完善或删除');
      }
      console.log('\n提示: 在 Airtable 中按 Ctrl+K (或 Cmd+K) 可以按 PI 号搜索记录\n');
    } else {
      console.log('所有核销记录都有效！\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('诊断失败:', error);
    process.exit(1);
  }
}).catch((err) => {
  console.error('模块加载失败:', err);
  process.exit(1);
});
