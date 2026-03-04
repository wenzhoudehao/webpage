"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Truck, Clock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// ========== 类型定义 ==========

export type POOrder = {
  id: string                          // Airtable Record ID
  piNo: string | null                 // PI号
  productionNo: string | null         // 生产单号
  customerName: string | null         // 客户名称
  totalAmount: string | null          // 订单金额
  outstandingBalance: string | null   // 未结欠款
  verificationStatus: string | null   // 核销状态
  shippingStatus: string | null       // 出货状态
  orderDate: string | Date | null     // 订单日期
  remarks: string | null              // 备注
  syncedAt: string | Date | null      // 同步时间
  relatedPayments: Array<{            // 关联收款
    paymentNo: string
    amount: string
  }>
}

// ========== 工具函数 ==========

const formatAmount = (amount: string | null) => {
  if (!amount) return '-'
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2
  }).format(num)
}

const formatDate = (date: string | Date | null) => {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// ========== 核销状态 ==========

const getVerificationStatus = (status: string | null) => {
  const configs: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
    pending: { label: "待核销", variant: "outline", color: "text-orange-600" },
    partial: { label: "部分核销", variant: "secondary", color: "text-blue-600" },
    completed: { label: "已清账", variant: "default", color: "text-green-600" },
    overpaid: { label: "超额支付", variant: "destructive", color: "text-red-600" },
  }
  return configs[status || "pending"] || configs.pending
}

const VerificationBadge = ({ status }: { status: string | null }) => {
  const config = getVerificationStatus(status)
  return (
    <Badge variant={config.variant} className={config.color}>
      {config.label}
    </Badge>
  )
}

// ========== 出货状态 ==========

const getShippingStatus = (status: string | null) => {
  const configs: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    pending: { label: "待生产", icon: <Clock className="h-3 w-3" />, color: "text-gray-500" },
    producing: { label: "生产中", icon: <RefreshCw className="h-3 w-3" />, color: "text-yellow-600" },
    inspecting: { label: "待验货", icon: <AlertCircle className="h-3 w-3" />, color: "text-orange-600" },
    shipped: { label: "已出货", icon: <Truck className="h-3 w-3" />, color: "text-blue-600" },
    completed: { label: "已完成", icon: <CheckCircle2 className="h-3 w-3" />, color: "text-green-600" },
  }
  return configs[status || "pending"] || configs.pending
}

const ShippingBadge = ({ status }: { status: string | null }) => {
  const config = getShippingStatus(status)
  return (
    <span className={`flex items-center gap-1 text-xs ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

// ========== 排序表头组件 ==========

const SortableHeader = ({ column, title }: { column: any; title: string }) => {
  const sortDirection = column.getIsSorted()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-0 font-medium hover:bg-transparent hover:text-accent-foreground flex items-center"
        >
          {title}
          <div className="ml-2 flex flex-col">
            {sortDirection === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : sortDirection === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowUp className="mr-2 h-4 w-4" />
          升序
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowDown className="mr-2 h-4 w-4" />
          降序
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => column.clearSorting()}>
          <ArrowUpDown className="mr-2 h-4 w-4" />
          取消排序
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ========== 操作按钮组件 ==========

interface POActionsProps {
  order: POOrder
  onViewDetail: (order: POOrder) => void
}

const POActions = ({ order, onViewDetail }: POActionsProps) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetail(order)}
        className="h-8 px-2"
      >
        <Eye className="h-4 w-4 mr-1" />
        详情
      </Button>
    </div>
  )
}

// ========== 列定义 Hook ==========

interface UsePOColumnsProps {
  onViewDetail: (order: POOrder) => void
}

export const usePOColumns = ({ onViewDetail }: UsePOColumnsProps): ColumnDef<POOrder>[] => {
  return [
    {
      accessorKey: "piNo",
      header: ({ column }) => <SortableHeader column={column} title="PI号" />,
      cell: ({ row }) => {
        const piNo = row.getValue("piNo") as string
        const orderDate = row.original.orderDate
        return (
          <div className="min-w-[100px]">
            <div className="font-medium text-foreground font-mono">{piNo || '-'}</div>
            <div className="text-xs text-muted-foreground">{formatDate(orderDate)}</div>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "productionNo",
      header: "生产单号",
      cell: ({ row }) => {
        const productionNo = row.getValue("productionNo") as string
        return (
          <div className="max-w-[120px] font-mono text-sm truncate" title={productionNo || '-'}>
            {productionNo || '-'}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "customerName",
      header: "客户名称",
      cell: ({ row }) => {
        const customerName = row.getValue("customerName") as string
        return (
          <div className="max-w-[150px] truncate" title={customerName || '-'}>
            {customerName || '-'}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="text-right">订单金额</div>,
      cell: ({ row }) => {
        const amount = row.getValue("totalAmount") as string
        return (
          <div className="text-right font-medium text-foreground min-w-[100px]">
            {formatAmount(amount)}
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "outstandingBalance",
      header: () => <div className="text-right">未结欠款</div>,
      cell: ({ row }) => {
        const outstanding = row.getValue("outstandingBalance") as string
        const outstandingNum = parseFloat(outstanding || '0')

        return (
          <div className={`text-right font-medium min-w-[100px] ${outstandingNum > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {formatAmount(outstanding)}
          </div>
        )
      },
      enableHiding: false,
    },
    {
      id: "verificationStatus",
      header: "核销状态",
      cell: ({ row }) => {
        return <VerificationBadge status={row.original.verificationStatus} />
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "shippingStatus",
      header: "出货状态",
      cell: ({ row }) => {
        return <ShippingBadge status={row.original.shippingStatus} />
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "relatedPayments",
      header: "收款",
      cell: ({ row }) => {
        const payments = row.original.relatedPayments || []
        if (payments.length === 0) {
          return <span className="text-muted-foreground text-sm">-</span>
        }
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0)
        return (
          <div className="min-w-[80px]">
            <div className="text-sm font-medium text-green-600">{formatAmount(String(totalAmount))}</div>
            <div className="text-xs text-muted-foreground">{payments.length} 笔</div>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-center">操作</div>,
      cell: ({ row }) => {
        return (
          <POActions
            order={row.original}
            onViewDetail={onViewDetail}
          />
        )
      },
      enableHiding: false,
      enableSorting: false,
    },
  ]
}

// 为了向后兼容
export const columns: ColumnDef<POOrder>[] = []
