import { NextRequest, NextResponse } from 'next/server'
import { createAirtableClient, isAirtableConfigured } from '@libs/airtable/client'
import { PAYMENT_FIELDS } from '@libs/airtable/field-mappings'

// ========== POST: 创建 AI 解析记录 ==========

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notification } = body

    if (!notification || !notification.trim()) {
      return NextResponse.json(
        { error: 'Missing notification text' },
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

    // 在 Airtable 收款表中创建一条新记录
    // 只填入银行收款通知字段，让 AI 字段自动计算
    const record = await client.create({
      fields: {
        // 银行收款通知字段（使用 Field ID）
        [PAYMENT_FIELDS.BANK_NOTICE]: notification.trim(),
      }
    })

    return NextResponse.json({
      success: true,
      recordId: record.id,
      message: 'Record created, AI parsing started',
    })
  } catch (error) {
    console.error('Error creating AI parse record:', error)
    return NextResponse.json(
      { error: 'Failed to create record' },
      { status: 500 }
    )
  }
}
