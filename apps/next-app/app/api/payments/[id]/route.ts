/**
 * 收款记录更新 API
 *
 * PATCH /api/payments/[id] - 更新 Airtable 中的收款记录
 *
 * 权限要求：管理员
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@libs/auth';
import { can, Action, Subject, Role } from '@libs/permissions';
import { createAirtableClient } from '@libs/airtable/client';
import { PAYMENT_FIELDS } from '@libs/airtable/field-mappings';
import { db } from '@libs/database';
import { cachedPayment } from '@libs/database/schema/airtable-cache';
import { eq } from 'drizzle-orm';

/**
 * 验证用户是否为管理员
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

  const hasPermission = can(appUser as any, Action.MANAGE, Subject.ALL);

  if (!hasPermission) {
    return { authorized: false, error: 'Forbidden: Admin access required', status: 403 };
  }

  return { authorized: true, user: session.user };
}

/**
 * PATCH /api/payments/[id]
 * 更新 Airtable 中的收款记录
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 验证管理员权限
    const authResult = await verifyAdmin();
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // 2. 获取参数
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Missing payment ID' },
        { status: 400 }
      );
    }

    // 3. 获取更新数据
    const body = await request.json();
    const {
      customerName,
      receivedAmount,
      paymentMethod,
      receivedDate,
      bankAccount,
      remarks,
    } = body;

    // 4. 构建 Airtable 更新字段（使用字段名，不是 Field ID）
    const updateFields: Record<string, any> = {};

    if (customerName !== undefined) {
      updateFields['客户名称'] = customerName;
    }
    if (receivedAmount !== undefined) {
      updateFields['实收金额（自动提取）'] = parseFloat(receivedAmount);
    }
    if (paymentMethod !== undefined) {
      // 映射付款类型
      const methodMap: Record<string, string> = {
        bank_transfer: '银行转账',
        cash: '现金',
        alipay: '支付宝',
        wechat: '微信',
        check: '支票',
        other: '其他',
      };
      updateFields['付款类型'] = methodMap[paymentMethod] || paymentMethod;
    }
    if (receivedDate !== undefined) {
      updateFields['收款日期'] = receivedDate;
    }
    if (bankAccount !== undefined) {
      updateFields['收款账户'] = bankAccount;
    }
    if (remarks !== undefined) {
      updateFields['备注'] = remarks;
    }

    // 5. 调用 Airtable API 更新
    const client = createAirtableClient('收款登记', { base: 'order' });
    const result = await client.update({
      id,
      fields: updateFields,
    });

    console.log('[Payment Update] Airtable updated:', result.id);

    // 6. 同步更新本地缓存表
    try {
      // 构建更新对象，只更新提供的字段
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (customerName !== undefined) updateData.customerName = customerName || null;
      if (receivedAmount !== undefined) updateData.receivedAmount = String(receivedAmount);
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod || null;
      if (receivedDate !== undefined) updateData.receivedDate = receivedDate ? new Date(receivedDate) : null;
      if (bankAccount !== undefined) updateData.bankAccount = bankAccount || null;
      if (remarks !== undefined) updateData.remarks = remarks || null;

      await db
        .update(cachedPayment)
        .set(updateData)
        .where(eq(cachedPayment.id, id));

      console.log('[Payment Update] Cache updated:', id);
    } catch (cacheError) {
      // 缓存更新失败不影响主流程
      console.error('[Payment Update] Cache update failed:', cacheError);
    }

    // 7. 返回结果
    return NextResponse.json({
      success: true,
      record: {
        id: result.id,
        fields: result.fields,
      },
    });
  } catch (error) {
    console.error('[Payment Update] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
