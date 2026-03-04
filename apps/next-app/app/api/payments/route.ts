import { NextRequest, NextResponse } from 'next/server'
import { db } from '@libs/database'
import { cachedPayment, cachedVerification, cachedPO } from '@libs/database/schema/airtable-cache'
import { desc, eq, and, or, like, sql, gte, lte, inArray } from 'drizzle-orm'

// ========== GET: 获取收款列表 ==========

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // 分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const offset = (page - 1) * pageSize

    // 搜索参数
    const searchField = searchParams.get('searchField')
    const searchValue = searchParams.get('searchValue')

    // 筛选参数
    const bankAccount = searchParams.get('bankAccount')
    const paymentMethod = searchParams.get('paymentMethod')
    const allocationStatus = searchParams.get('allocationStatus')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // 排序参数
    const sortBy = searchParams.get('sortBy') || 'receivedDate'
    const sortDirection = searchParams.get('sortDirection') || 'desc'

    // 构建查询条件
    const conditions = []

    // 搜索条件
    if (searchValue && searchField) {
      if (searchField === 'paymentNo') {
        conditions.push(like(cachedPayment.paymentNo, `%${searchValue}%`))
      } else if (searchField === 'customerName') {
        conditions.push(like(cachedPayment.customerName, `%${searchValue}%`))
      }
    }

    // 收款账户筛选
    if (bankAccount) {
      conditions.push(eq(cachedPayment.bankAccount, bankAccount))
    }

    // 付款类型筛选
    if (paymentMethod) {
      conditions.push(eq(cachedPayment.paymentMethod, paymentMethod))
    }

    // 日期范围筛选
    if (dateFrom) {
      conditions.push(gte(cachedPayment.receivedDate, new Date(dateFrom)))
    }
    if (dateTo) {
      conditions.push(lte(cachedPayment.receivedDate, new Date(dateTo)))
    }

    // 分配状态筛选（需要特殊处理）
    // 这个在数据库层面比较复杂，先在应用层处理

    // 执行查询
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cachedPayment)
      .where(whereClause)

    const total = Number(countResult[0]?.count || 0)

    // 获取数据 - 使用动态排序
    const orderByColumn = (() => {
      switch (sortBy) {
        case 'receivedAmount':
          return cachedPayment.receivedAmount
        case 'unallocatedBalance':
          return cachedPayment.unallocatedBalance
        case 'paymentNo':
          return cachedPayment.paymentNo
        default:
          return cachedPayment.receivedDate
      }
    })()

    const payments = await db
      .select()
      .from(cachedPayment)
      .where(whereClause)
      .orderBy(sortDirection === 'desc' ? desc(orderByColumn) : orderByColumn)
      .limit(pageSize)
      .offset(offset)

    // 应用层过滤：分配状态
    let filteredPayments = payments
    if (allocationStatus) {
      filteredPayments = payments.filter((p) => {
        const received = parseFloat(p.receivedAmount || '0')
        const unallocated = parseFloat(p.unallocatedBalance || '0')

        if (allocationStatus === 'fully') {
          return unallocated === 0
        } else if (allocationStatus === 'partial') {
          return unallocated > 0 && unallocated < received
        } else if (allocationStatus === 'none') {
          return unallocated === received
        }
        return true
      })
    }

    // 格式化返回数据
    // 查询所有收款的关联订单号（通过核销中间表）
    const paymentIds = filteredPayments.map(p => p.id)
    const verifications = paymentIds.length > 0 ? await db
      .select({
        paymentId: cachedVerification.paymentId,
        poId: cachedVerification.poId,
        allocatedAmount: cachedVerification.allocatedAmount,
      })
      .from(cachedVerification)
      .where(inArray(cachedVerification.paymentId, paymentIds)) : []

    // 获取关联的订单 PI 号
    const poIds = [...new Set(verifications.map(v => v.poId).filter(Boolean))] as string[]
    const orders = poIds.length > 0 ? await db
      .select({ id: cachedPO.id, piNo: cachedPO.piNo })
      .from(cachedPO)
      .where(inArray(cachedPO.id, poIds)) : []

    // 构建 paymentId -> 订单号列表的映射
    const paymentToOrders = new Map<string, { piNo: string; amount: string }[]>()
    for (const v of verifications) {
      if (!v.paymentId || !v.poId) continue
      const order = orders.find(o => o.id === v.poId)
      if (!order) continue
      const list = paymentToOrders.get(v.paymentId) || []
      list.push({ piNo: order.piNo, amount: v.allocatedAmount })
      paymentToOrders.set(v.paymentId, list)
    }

    const formattedPayments = filteredPayments.map((p) => {
      const relatedOrders = paymentToOrders.get(p.id) || []
      return {
        id: p.id,
        paymentNo: p.paymentNo,
        customerName: p.customerName,
        receivedAmount: p.receivedAmount,
        unallocatedBalance: p.unallocatedBalance,
        paymentMethod: p.paymentMethod,
        receivedDate: p.receivedDate,
        bankAccount: p.bankAccount,
        bankNotice: p.bankNotice,
        remarks: p.remarks,
        syncedAt: p.syncedAt,
        // 关联订单号（去重）
        relatedOrderNos: [...new Set(relatedOrders.map(o => o.piNo))],
        // 核销详情
        verifications: relatedOrders,
      }
    })

    return NextResponse.json({
      payments: formattedPayments,
      total: allocationStatus ? filteredPayments.length : total,
      page,
      pageSize,
      totalPages: Math.ceil((allocationStatus ? filteredPayments.length : total) / pageSize),
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// ========== POST: 新增收款 ==========

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证必填字段
    if (!body.receivedAmount || !body.receivedDate || !body.bankAccount) {
      return NextResponse.json(
        { error: 'Missing required fields: receivedAmount, receivedDate, bankAccount' },
        { status: 400 }
      )
    }

    // TODO: 调用 Airtable API 创建收款记录
    // 这里需要实现写入 Airtable 的逻辑
    // 然后同步到本地缓存表

    return NextResponse.json({
      success: true,
      message: 'Payment created successfully',
      // data: newPayment
    })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
