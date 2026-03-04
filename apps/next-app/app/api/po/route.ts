import { NextRequest, NextResponse } from 'next/server'
import { db } from '@libs/database'
import { cachedPO, cachedPayment, cachedVerification } from '@libs/database/schema/airtable-cache'
import { desc, eq, and, or, like, sql, gte, lte, inArray } from 'drizzle-orm'

// ========== GET: 获取订单列表 ==========

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // 分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const offset = (page - 1) * pageSize

    // 搜索参数
    const searchField = searchParams.get('searchField')
    const searchValue = searchParams.get('searchValue')

    // 筛选参数
    const verificationStatus = searchParams.get('verificationStatus') // pending, partial, completed
    const shippingStatus = searchParams.get('shippingStatus')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // 排序参数
    const sortBy = searchParams.get('sortBy') || 'orderDate'
    const sortDirection = searchParams.get('sortDirection') || 'desc'

    // 构建查询条件
    const conditions = []

    // 搜索条件
    if (searchValue) {
      const searchConditions = []
      if (!searchField || searchField === 'piNo') {
        searchConditions.push(like(cachedPO.piNo, `%${searchValue}%`))
      }
      if (!searchField || searchField === 'productionNo') {
        searchConditions.push(like(cachedPO.productionNo, `%${searchValue}%`))
      }
      if (!searchField || searchField === 'customerName') {
        searchConditions.push(like(cachedPO.customerName, `%${searchValue}%`))
      }
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions))
      }
    }

    // 核销状态筛选
    if (verificationStatus) {
      conditions.push(eq(cachedPO.verificationStatus, verificationStatus))
    }

    // 出货状态筛选
    if (shippingStatus) {
      conditions.push(eq(cachedPO.shippingStatus, shippingStatus))
    }

    // 日期范围筛选
    if (dateFrom) {
      conditions.push(gte(cachedPO.orderDate, new Date(dateFrom)))
    }
    if (dateTo) {
      conditions.push(lte(cachedPO.orderDate, new Date(dateTo)))
    }

    // 执行查询
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cachedPO)
      .where(whereClause)

    const total = Number(countResult[0]?.count || 0)

    // 获取数据 - 使用动态排序
    const orderByColumn = (() => {
      switch (sortBy) {
        case 'totalAmount':
          return cachedPO.totalAmount
        case 'outstandingBalance':
          return cachedPO.outstandingBalance
        case 'customerName':
          return cachedPO.customerName
        default:
          return cachedPO.orderDate
      }
    })()

    const orders = await db
      .select()
      .from(cachedPO)
      .where(whereClause)
      .orderBy(sortDirection === 'desc' ? desc(orderByColumn) : orderByColumn)
      .limit(pageSize)
      .offset(offset)

    // 获取每个订单的关联收款信息
    const orderIds = orders.map(o => o.id)
    const verifications = orderIds.length > 0 ? await db
      .select({
        poId: cachedVerification.poId,
        paymentId: cachedVerification.paymentId,
        allocatedAmount: cachedVerification.allocatedAmount,
      })
      .from(cachedVerification)
      .where(inArray(cachedVerification.poId, orderIds)) : []

    // 获取关联的收款记录
    const paymentIds = [...new Set(verifications.map(v => v.paymentId).filter(Boolean))] as string[]
    const payments = paymentIds.length > 0 ? await db
      .select({ id: cachedPayment.id, paymentNo: cachedPayment.paymentNo, customerName: cachedPayment.customerName })
      .from(cachedPayment)
      .where(inArray(cachedPayment.id, paymentIds)) : []

    // 构建 poId -> 收款列表的映射
    const orderToPayments = new Map<string, { paymentNo: string; amount: string }[]>()
    for (const v of verifications) {
      if (!v.poId || !v.paymentId) continue
      const payment = payments.find(p => p.id === v.paymentId)
      if (!payment) continue
      const list = orderToPayments.get(v.poId) || []
      list.push({ paymentNo: payment.paymentNo || '', amount: v.allocatedAmount })
      orderToPayments.set(v.poId, list)
    }

    // 格式化返回数据
    const formattedOrders = orders.map(order => {
      const relatedPayments = orderToPayments.get(order.id) || []
      return {
        id: order.id,
        piNo: order.piNo,
        productionNo: order.productionNo,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        outstandingBalance: order.outstandingBalance,
        verificationStatus: order.verificationStatus,
        shippingStatus: order.shippingStatus,
        orderDate: order.orderDate,
        remarks: order.remarks,
        syncedAt: order.syncedAt,
        // 关联收款
        relatedPayments,
      }
    })

    return NextResponse.json({
      orders: formattedOrders,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
