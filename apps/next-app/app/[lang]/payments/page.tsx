"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DataTable } from "./data-table"
import { Payment } from "./columns"
import { PaymentDetailDrawer } from "./components/payment-detail-drawer"
import { PaymentFormDialog } from "./components/payment-form-dialog"
import { VerificationFormDialog } from "./components/verification-form-dialog"

// ========== 顶部统计栏 ==========

function TopStats({
  stats,
  isLoading,
  onAdd,
  locale
}: {
  stats: { totalReceived: number; unallocated: number; allocated: number; count: number }
  isLoading: boolean
  onAdd: () => void
  locale: string
}) {
  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`
    }
    return new Intl.NumberFormat("zh-CN").format(amount)
  }

  const items = [
    { label: '收款', value: stats.count, suffix: '笔' },
    { label: '总额', value: formatAmount(stats.totalReceived), suffix: '' },
    { label: '待分配', value: formatAmount(stats.unallocated), suffix: '', className: 'text-orange-600' },
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
      <div className="ml-auto flex items-center gap-2">
        <Link href={`/${locale}/sync?from=payments`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            同步
          </Button>
        </Link>
        <Button size="sm" className="h-7 text-xs" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" />
          新增
        </Button>
      </div>
    </div>
  )
}

// ========== 主页面组件 ==========

export default function PaymentsPage() {
  const params = useParams()
  const locale = params.lang as string
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalReceived: 0,
    unallocated: 0,
    allocated: 0,
    count: 0,
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    total: 0,
  })

  // 抽屉和弹窗状态
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isVerifyOpen, setIsVerifyOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  // 获取收款列表
  const fetchPayments = useCallback(async () => {
    setIsLoading(true)
    try {
      const searchParams = new URLSearchParams(window.location.search)
      const params = new URLSearchParams()
      searchParams.forEach((value, key) => params.set(key, value))
      if (!params.has("pageSize")) params.set("pageSize", "20")

      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch payments")

      const data = await response.json()
      setPayments(data.payments || [])
      setPagination({
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        pageSize: data.pageSize || 20,
        total: data.total || 0,
      })

      if (data.payments && data.payments.length > 0) {
        const totalReceived = data.payments.reduce(
          (sum: number, p: Payment) => sum + parseFloat(p.receivedAmount || "0"),
          0
        )
        const unallocated = data.payments.reduce(
          (sum: number, p: Payment) => sum + parseFloat(p.unallocatedBalance || "0"),
          0
        )
        setStats({
          totalReceived,
          unallocated,
          allocated: totalReceived - unallocated,
          count: data.total || data.payments.length,
        })
      } else {
        setStats({ totalReceived: 0, unallocated: 0, allocated: 0, count: 0 })
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
      toast.error("获取收款列表失败")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleViewDetail = (payment: Payment) => {
    setSelectedPayment(payment)
    setIsDetailOpen(true)
  }

  const handleVerify = (payment: Payment) => {
    setSelectedPayment(payment)
    setIsVerifyOpen(true)
  }

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setFormMode("edit")
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setEditingPayment(null)
    setFormMode("create")
    setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingPayment(null)
    fetchPayments()
    toast.success(formMode === "create" ? "收款记录已创建" : "收款记录已更新")
  }

  const handleVerifySuccess = () => {
    setIsVerifyOpen(false)
    setSelectedPayment(null)
    fetchPayments()
    toast.success("核销成功")
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部统计栏 */}
      <TopStats stats={stats} isLoading={isLoading} onAdd={handleAdd} locale={locale} />

      {/* 页面标题 */}
      <div className="px-4 py-3 border-b">
        <h1 className="text-lg font-semibold">收款管理</h1>
      </div>

      {/* 宽表格 */}
      <div className="flex-1 overflow-auto p-4">
        <DataTable
          data={payments}
          pagination={pagination}
          onViewDetail={handleViewDetail}
          onVerify={handleVerify}
        />
      </div>

      {/* 右栏：详情抽屉 */}
      <PaymentDetailDrawer
        payment={selectedPayment}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onVerify={handleVerify}
        onEdit={handleEdit}
      />

      {/* 弹窗：新增/编辑收款 */}
      <PaymentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
        payment={editingPayment}
        mode={formMode}
      />

      {/* 弹窗：核销 */}
      <VerificationFormDialog
        payment={selectedPayment}
        open={isVerifyOpen}
        onOpenChange={setIsVerifyOpen}
        onSuccess={handleVerifySuccess}
      />
    </div>
  )
}
