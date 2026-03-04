"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DataTable } from "./data-table"
import { POOrder } from "./columns"
import { PODetailDrawer } from "./components/po-detail-drawer"

// ========== 顶部统计栏 ==========

function TopStats({
  stats,
  isLoading,
  locale
}: {
  stats: { totalOrders: number; totalAmount: number; outstandingBalance: number; producing: number }
  isLoading: boolean
  locale: string
}) {
  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`
    }
    return new Intl.NumberFormat("zh-CN").format(amount)
  }

  const items = [
    { label: '订单', value: stats.totalOrders, suffix: '个' },
    { label: '总额', value: formatAmount(stats.totalAmount), suffix: '' },
    { label: '待收', value: formatAmount(stats.outstandingBalance), suffix: '', className: 'text-orange-600' },
    { label: '生产中', value: stats.producing, suffix: '个' },
  ]

  return (
    <div className="flex items-center gap-6 px-4 py-2 border-b bg-muted/20 text-sm">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{item.label}</span>
          <span className={`font-medium ${item.className || ''}`}>
            {isLoading ? '-' : item.value}{item.suffix}
          </span>
        </div>
      ))}
      <div className="ml-auto">
        <Link href={`/${locale}/sync?from=po`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            同步
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ========== 主页面组件 ==========

export default function POManagementPage() {
  const params = useParams()
  const locale = params.lang as string
  const [orders, setOrders] = useState<POOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    outstandingBalance: 0,
    producing: 0,
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    total: 0,
  })

  // 抽屉状态
  const [selectedOrder, setSelectedOrder] = useState<POOrder | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // 获取订单列表
  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const searchParams = new URLSearchParams(window.location.search)
      const params = new URLSearchParams()
      searchParams.forEach((value, key) => params.set(key, value))
      if (!params.has("pageSize")) params.set("pageSize", "20")

      const response = await fetch(`/api/po?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch orders")

      const data = await response.json()
      setOrders(data.orders || [])
      setPagination({
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        pageSize: data.pageSize || 20,
        total: data.total || 0,
      })

      if (data.orders && data.orders.length > 0) {
        const totalAmount = data.orders.reduce(
          (sum: number, o: POOrder) => sum + parseFloat(o.totalAmount || "0"),
          0
        )
        const outstandingBalance = data.orders.reduce(
          (sum: number, o: POOrder) => sum + parseFloat(o.outstandingBalance || "0"),
          0
        )
        const producing = data.orders.filter(
          (o: POOrder) => o.shippingStatus === 'producing'
        ).length

        setStats({
          totalOrders: data.total || data.orders.length,
          totalAmount,
          outstandingBalance,
          producing,
        })
      } else {
        setStats({ totalOrders: 0, totalAmount: 0, outstandingBalance: 0, producing: 0 })
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("获取订单列表失败")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleViewDetail = (order: POOrder) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部统计栏 */}
      <TopStats stats={stats} isLoading={isLoading} locale={locale} />

      {/* 页面标题 */}
      <div className="px-4 py-3 border-b">
        <h1 className="text-lg font-semibold">订单大厅</h1>
      </div>

      {/* 宽表格 */}
      <div className="flex-1 overflow-auto p-4">
        <DataTable
          data={orders}
          pagination={pagination}
          onViewDetail={handleViewDetail}
          onRefresh={fetchOrders}
          isLoading={isLoading}
        />
      </div>

      {/* 右栏：详情抽屉 */}
      <PODetailDrawer
        order={selectedOrder}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  )
}
