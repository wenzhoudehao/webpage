import { NextRequest, NextResponse } from 'next/server'
import { createAirtableClient, isAirtableConfigured } from '@libs/airtable/client'
import { PAYMENT_FIELDS } from '@libs/airtable/field-mappings'

// ========== GET: 轮询获取 AI 解析结果 ==========

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const { recordId } = await params

    if (!recordId) {
      return NextResponse.json(
        { error: 'Missing recordId' },
        { status: 400 }
      )
    }

    // 检查 Airtable 是否配置
    if (!isAirtableConfigured()) {
      return NextResponse.json(
        { error: 'Airtable not configured' },
        { status: 500 }
      )
    }

    // 创建 Airtable 客户端
    const client = createAirtableClient('收款登记', { base: 'order' })

    // 获取记录
    const record = await client.find(recordId)

    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }

    const fields = record.fields

    // 检查 AI 字段是否已解析
    // 根据 field-mappings.ts 中的定义，AI 字段是：
    // - RECEIVED_AMOUNT (实收金额)
    // - BANK_ACCOUNT (收款账户)
    const receivedAmount = fields['实收金额（自动提取）'] || fields['实收金额']
    const bankAccount = fields['收款账户']

    // 如果关键字段有值，说明 AI 解析完成
    if (receivedAmount || bankAccount) {
      return NextResponse.json({
        parsed: true,
        amount: receivedAmount ? parseFloat(receivedAmount as string) : null,
        date: extractDate(fields),
        bankAccount: bankAccount || null,
        customerName: fields['客户'] || fields['客户名称'] || null,
        paymentMethod: mapPaymentMethod(fields['付款类型'] as string | undefined),
      })
    }

    // AI 还在解析中
    return NextResponse.json({
      parsed: false,
      message: 'AI still processing',
    })
  } catch (error) {
    console.error('Error polling AI result:', error)
    return NextResponse.json(
      { error: 'Failed to get record' },
      { status: 500 }
    )
  }
}

// 从字段中提取日期
function extractDate(fields: Record<string, any>): string | null {
  const dateField = fields['收款日期'] || fields[PAYMENT_FIELDS.PAYMENT_DATE]
  if (!dateField) return null

  // Airtable 日期字段可能是字符串或 Date 对象
  if (typeof dateField === 'string') {
    // 尝试解析日期
    const date = new Date(dateField)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
    return dateField
  }

  if (dateField instanceof Date) {
    return dateField.toISOString().split('T')[0]
  }

  return null
}

// 映射付款类型到标准值
function mapPaymentMethod(type: string | undefined): string | null {
  if (!type) return null

  const typeMap: Record<string, string> = {
    '银行转账': 'bank_transfer',
    '银行汇款': 'bank_transfer',
    '现金': 'cash',
    '支付宝': 'alipay',
    '微信': 'wechat',
    '微信转账': 'wechat',
    '支票': 'check',
  }

  return typeMap[type] || 'other'
}
