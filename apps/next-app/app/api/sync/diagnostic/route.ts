/**
 * 同步诊断 API
 *
 * GET /api/sync/diagnostic - 诊断同步失败的原因
 *
 * 分析内容：
 * 1. 从 Airtable 获取所有核销记录
 * 2. 从缓存表获取所有 PO ID
 * 3. 找出引用不存在的 PO 的核销记录
 * 4. 查询缺失 PO 的详细信息
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@libs/auth';
import { can, Action, Subject, Role } from '@libs/permissions';
import { db } from '@libs/database';
import { cachedPO, cachedPayment } from '@libs/database/schema/airtable-cache';
import { createAirtableClient, collectAll } from '@libs/airtable';
import { VERIFICATION_FIELDS, PO_FIELDS } from '@libs/airtable/field-mappings';

/**
 * 验证管理员权限
 */
async function verifyAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const appUser = {
    ...session.user,
    role: (session.user.role as Role) || Role.NORMAL,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasPermission = can(appUser as any, Action.MANAGE, Subject.ALL);

  if (!hasPermission) {
    return { authorized: false, error: 'Forbidden: Admin access required', status: 403 };
  }

  return { authorized: true, user: session.user };
}

// ========== 响应类型 ==========

interface MissingPORecord {
  verificationId: string;
  poId: string;
  pi: string;
  productionNo: string;
  customer: string;
  allocatedAmount: string;
}

interface IncompleteRecord {
  verificationId: string;
  poId: string | null;
  paymentId: string | null;
  allocatedAmount: string;
  reason: string;
}

interface DiagnosticResponse {
  summary: {
    totalVerificationRecords: number;
    validRecords: number;
    missingPOCount: number;
    incompleteCount: number;
    cachedPOCount: number;
  };
  missingPORecords: MissingPORecord[];
  incompleteRecords: IncompleteRecord[];
}

/**
 * GET /api/sync/diagnostic
 * 诊断核销记录同步失败的原因
 */
export async function GET(): Promise<NextResponse<DiagnosticResponse | { error: string }>> {
  try {
    // 1. 验证权限
    const authResult = await verifyAdmin();
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.status }
      );
    }

    // 2. 从缓存表获取已同步的记录
    const [existingPOs, existingPayments] = await Promise.all([
      db.select({ id: cachedPO.id }).from(cachedPO),
      db.select({ id: cachedPayment.id }).from(cachedPayment)
    ]);

    const existingPOIds = new Set(existingPOs.map(po => po.id));
    const existingPaymentIds = new Set(existingPayments.map(p => p.id));

    // 3. 从 Airtable 获取核销记录
    type VerificationFields = Record<string, unknown>;
    const client = createAirtableClient<VerificationFields>('收款_中间表', { base: 'order' });
    const { records: verificationRecords } = await collectAll(client, { view: 'API_Sync_Active' });

    // 4. 分析记录
    // 现在所有记录都会同步，只是有些关联不完整
    const missingPORecords: MissingPORecord[] = [];
    const incompleteRecords: IncompleteRecord[] = [];
    let validCount = 0;
    const missingPOIds = new Set<string>();

    for (const record of verificationRecords) {
      const fields = record.fields;

      const poIds = (fields['关联订单'] || fields[VERIFICATION_FIELDS.PO_ID]) as string[] | undefined;
      const paymentIds = (fields['关联收款记录'] || fields[VERIFICATION_FIELDS.PAYMENT_ID]) as string[] | undefined;
      const allocatedAmount = String(fields['本次分配金额'] ?? '0');

      const poId = poIds?.[0] || null;
      const paymentId = paymentIds?.[0] || null;

      // 分类记录（仅用于诊断显示，不影响同步）
      if (!poId || !paymentId) {
        // 关联不完整的记录 - 已同步，但需要关注
        incompleteRecords.push({
          verificationId: record.id,
          poId,
          paymentId,
          allocatedAmount,
          reason: !poId && !paymentId ? 'PO 和收款都为空' : (!poId ? 'PO 为空' : '收款为空')
        });
      } else if (!existingPOIds.has(poId)) {
        // 关联的订单不在视图中 - 已同步，但订单信息缺失
        missingPOIds.add(poId);
        missingPORecords.push({
          verificationId: record.id,
          poId,
          pi: '', // 稍后填充
          productionNo: '',
          customer: '',
          allocatedAmount
        });
      } else {
        // 完整的记录
        validCount++;
      }
    }

    // 5. 从 Airtable 查询缺失 PO 的详细信息
    if (missingPOIds.size > 0) {
      try {
        type POFields = Record<string, unknown>;
        const poClient = createAirtableClient<POFields>('PO', { base: 'order' });

        const poIdList = Array.from(missingPOIds);
        const formula = `OR(${poIdList.map(id => `RECORD_ID()='${id}'`).join(',')})`;

        const { records: poRecords } = await collectAll(poClient, {
          filterByFormula: formula,
          fields: [PO_FIELDS.PI, PO_FIELDS.PRODUCTION_NO, PO_FIELDS.CUSTOMER]
        });

        // 创建 ID -> 详情 的映射
        const poDetailsMap = new Map<string, { pi: string; productionNo: string; customer: string }>();
        for (const rec of poRecords) {
          const f = rec.fields;
          let customerDisplay = '(无)';
          const customerValue = f['客户'];
          if (Array.isArray(customerValue)) {
            customerDisplay = customerValue.join(', ');
          } else if (customerValue) {
            customerDisplay = String(customerValue);
          }

          poDetailsMap.set(rec.id, {
            pi: String(f['PI'] || '(无)'),
            productionNo: String(f['生产单'] || '(无)'),
            customer: customerDisplay
          });
        }

        // 填充缺失 PO 的详情
        for (const rec of missingPORecords) {
          const details = poDetailsMap.get(rec.poId);
          if (details) {
            rec.pi = details.pi;
            rec.productionNo = details.productionNo;
            rec.customer = details.customer;
          }
        }
      } catch (e) {
        console.error('[Diagnostic] 查询 PO 详情失败:', e);
      }
    }

    // 6. 返回结果
    const result: DiagnosticResponse = {
      summary: {
        totalVerificationRecords: verificationRecords.length,
        validRecords: validCount,
        missingPOCount: missingPORecords.length,
        incompleteCount: incompleteRecords.length,
        cachedPOCount: existingPOIds.size,
      },
      missingPORecords,
      incompleteRecords,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Diagnostic] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
