"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, FileCheck, AlertTriangle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/hooks/use-translation"

// ========== 类型定义 ==========

export type Payment = {
  id: string                          // Airtable Record ID
  paymentNo: string | null            // 收款编号
  customerName: string | null         // 客户名称
  receivedAmount: string | null       // 实收金额
  unallocatedBalance: string | null   // 待分配余额
  paymentMethod: string | null        // 付款类型
  receivedDate: string | Date | null  // 到账日期
  bankAccount: string | null          // 收款账户
  bankNotice: string | null           // 银行收款通知（原始数据）
  remarks: string | null              // 备注
  syncedAt: string | Date | null      // 同步时间
  relatedOrderNos: string[]           // 关联订单号
  verifications: Array<{              // 核销记录
    piNo: string
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

// 分配状态计算
const getAllocationStatus = (received: number, unallocated: number) => {
  if (unallocated === 0) {
    return { label: '已全额分配', variant: 'default' as const, color: 'text-green-600' }
  }
  if (unallocated < received && unallocated > 0) {
    return { label: '部分分配', variant: 'secondary' as const, color: 'text-orange-600' }
  }
  return { label: '未分配', variant: 'outline' as const, color: 'text-red-600' }
}

// 分配状态 Badge
const AllocationBadge = ({ received, unallocated }: { received: number; unallocated: number }) => {
  const status = getAllocationStatus(received, unallocated)
  return (
    <Badge variant={status.variant} className={status.color}>
      {status.label}
    </Badge>
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

interface PaymentActionsProps {
  payment: Payment
  onViewDetail: (payment: Payment) => void
  onVerify: (payment: Payment) => void
}

const PaymentActions = ({ payment, onViewDetail, onVerify }: PaymentActionsProps) => {
  const received = parseFloat(payment.receivedAmount || '0')
  const unallocated = parseFloat(payment.unallocatedBalance || '0')
  const canVerify = unallocated > 0

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetail(payment)}
        className="h-8 px-2"
      >
        <Eye className="h-4 w-4 mr-1" />
        详情
      </Button>
      {canVerify && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVerify(payment)}
          className="h-8 px-2 text-orange-600 hover:text-orange-700"
        >
          <FileCheck className="h-4 w-4 mr-1" />
          核销
        </Button>
      )}
    </div>
  )
}

// ========== 列定义 Hook ==========

interface UsePaymentColumnsProps {
  onViewDetail: (payment: Payment) => void
  onVerify: (payment: Payment) => void
}

export const usePaymentColumns = ({ onViewDetail, onVerify }: UsePaymentColumnsProps): ColumnDef<Payment>[] => {
  const { t } = useTranslation()

  return [
    {
      accessorKey: "paymentNo",
      header: ({ column }) => <SortableHeader column={column} title="收款编号" />,
      cell: ({ row }) => {
        const paymentNo = row.getValue("paymentNo") as string
        const receivedDate = row.original.receivedDate
        return (
          <div className="min-w-[100px]">
            <div className="font-medium text-foreground">{paymentNo || '-'}</div>
            <div className="text-xs text-muted-foreground">{formatDate(receivedDate)}</div>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "customerName",
      header: "客户名称",
      cell: ({ row }) => {
        const customerName = row.getValue("customerName") as string
        const isEmpty = !customerName || customerName.trim() === ''

        if (isEmpty) {
          return (
            <div className="flex items-center gap-1.5 max-w-[150px]">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-amber-600 text-sm" title="客户名称为空，请检查 Airtable 中的「客户」字段是否被隐藏">
                未填写
              </span>
            </div>
          )
        }

        return (
          <div className="max-w-[150px] truncate" title={customerName}>
            {customerName}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: "relatedOrderNos",
      header: "订单号",
      cell: ({ row }) => {
        const orderNos = row.original.relatedOrderNos || []
        if (orderNos.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        const displayNos = orderNos.slice(0, 2)
        const hasMore = orderNos.length > 2
        return (
          <div className="max-w-[120px]">
            <div className="truncate text-sm font-medium" title={orderNos.join(', ')}>
              {displayNos.join(', ')}
              {hasMore && <span className="text-muted-foreground"> +{orderNos.length - 2}</span>}
            </div>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "receivedAmount",
      header: () => <div className="text-right">实收金额</div>,
      cell: ({ row }) => {
        const amount = row.getValue("receivedAmount") as string
        return (
          <div className="text-right font-medium text-foreground min-w-[100px]">
            {formatAmount(amount)}
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "unallocatedBalance",
      header: () => <div className="text-right">待分配余额</div>,
      cell: ({ row }) => {
        const unallocated = row.getValue("unallocatedBalance") as string
        const received = row.original.receivedAmount
        const unallocatedNum = parseFloat(unallocated || '0')
        const receivedNum = parseFloat(received || '0')

        return (
          <div className={`text-right font-medium min-w-[100px] ${unallocatedNum > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {formatAmount(unallocated)}
          </div>
        )
      },
      enableHiding: false,
    },
    {
      id: "allocationStatus",
      header: "分配状态",
      cell: ({ row }) => {
        const received = parseFloat(row.original.receivedAmount || '0')
        const unallocated = parseFloat(row.original.unallocatedBalance || '0')
        return <AllocationBadge received={received} unallocated={unallocated} />
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "bankAccount",
      header: "收款账户",
      cell: ({ row }) => {
        const bankAccount = row.getValue("bankAccount") as string
        return (
          <div className="max-w-[120px] truncate" title={bankAccount || '-'}>
            {bankAccount || '-'}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "paymentMethod",
      header: "付款类型",
      cell: ({ row }) => {
        const method = row.getValue("paymentMethod") as string
        return <div className="max-w-[100px] truncate">{method || '-'}</div>
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-center">操作</div>,
      cell: ({ row }) => {
        return (
          <PaymentActions
            payment={row.original}
            onViewDetail={onViewDetail}
            onVerify={onVerify}
          />
        )
      },
      enableHiding: false,
      enableSorting: false,
    },
  ]
}

// 为了向后兼容
export const columns: ColumnDef<Payment>[] = []
