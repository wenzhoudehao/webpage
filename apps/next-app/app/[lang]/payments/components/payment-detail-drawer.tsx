"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Payment } from "../columns"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileCheck, GripVertical, Pencil, ExternalLink } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PaymentDetailDrawerProps {
  payment: Payment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerify: (payment: Payment) => void
  onEdit?: (payment: Payment) => void
}

// 宽度配置
const MIN_WIDTH = 500
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 650

// 格式化金额
const formatAmount = (amount: string | null) => {
  if (!amount) return '-'
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(num)
}

// 格式化日期
const formatDate = (date: string | Date | null) => {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN')
}

// 计算核销进度
const getVerificationProgress = (received: string | null, unallocated: string | null) => {
  const receivedNum = parseFloat(received || '0')
  const unallocatedNum = parseFloat(unallocated || '0')
  if (receivedNum === 0) return 0
  return Math.round(((receivedNum - unallocatedNum) / receivedNum) * 100)
}

// 获取分配状态
const getAllocationStatus = (received: number, unallocated: number) => {
  if (unallocated === 0) return { label: '已全额分配', variant: 'default' as const }
  if (unallocated < received) return { label: '部分分配', variant: 'secondary' as const }
  return { label: '未分配', variant: 'outline' as const }
}

export function PaymentDetailDrawer({
  payment,
  open,
  onOpenChange,
  onVerify,
  onEdit,
}: PaymentDetailDrawerProps) {
  // 可调整宽度状态
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // 重置宽度当抽屉关闭时
  useEffect(() => {
    if (!open) {
      setWidth(DEFAULT_WIDTH)
    }
  }, [open])

  // 拖拽调整宽度
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const newWidth = window.innerWidth - e.clientX
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth))
      setWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  if (!payment) return null

  const received = parseFloat(payment.receivedAmount || '0')
  const unallocated = parseFloat(payment.unallocatedBalance || '0')
  const progress = getVerificationProgress(payment.receivedAmount, payment.unallocatedBalance)
  const status = getAllocationStatus(received, unallocated)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetRef}
        className="p-0 overflow-hidden"
        style={{ width: `${width}px`, maxWidth: `${MAX_WIDTH}px` }}
      >
        {/* 拖拽手柄 */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group z-50 ${
            isResizing ? 'bg-primary' : 'hover:bg-primary/50'
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-6 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* 内容区域 - 增加内边距 */}
        <div className="h-full overflow-y-auto p-6">
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-xl">
                收款详情
                <Badge variant={status.variant} className="text-sm">{status.label}</Badge>
              </SheetTitle>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(payment)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑
                </Button>
              )}
            </div>
            <SheetDescription className="text-base">
              收款编号：{payment.paymentNo || '-'}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-11">
              <TabsTrigger value="info" className="text-sm">基本信息</TabsTrigger>
              <TabsTrigger value="verifications" className="text-sm">核销记录</TabsTrigger>
              <TabsTrigger value="actions" className="text-sm">核销操作</TabsTrigger>
            </TabsList>

            {/* Tab 1: 基本信息 */}
            <TabsContent value="info" className="space-y-6 mt-6">
              {/* 核销进度 */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm font-medium">
                  <span>核销进度</span>
                  <span className="text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">已核销：<span className="text-foreground font-medium">{formatAmount(String(received - unallocated))}</span></span>
                  <span className="text-muted-foreground">待分配：<span className="text-orange-600 font-medium">{formatAmount(payment.unallocatedBalance)}</span></span>
                </div>
              </div>

              {/* 详细信息 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">实收金额</div>
                  <div className="text-xl font-semibold text-primary">{formatAmount(payment.receivedAmount)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">到账日期</div>
                  <div className="text-base font-medium">{formatDate(payment.receivedDate)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">客户名称</div>
                  <div className="text-base font-medium">{payment.customerName || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">收款账户</div>
                  <div className="text-base font-medium">{payment.bankAccount || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">付款类型</div>
                  <div className="text-base font-medium">{payment.paymentMethod || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">关联订单</div>
                  <div className="text-base font-medium">
                    {payment.relatedOrderNos && payment.relatedOrderNos.length > 0
                      ? payment.relatedOrderNos.join(', ')
                      : '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">同步时间</div>
                  <div className="text-base font-medium">{formatDate(payment.syncedAt)}</div>
                </div>
              </div>

              {/* 银行收款通知 - 关键原始数据 */}
              {payment.bankNotice && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    银行收款通知
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">{payment.bankNotice}</div>
                </div>
              )}

              {/* 备注 */}
              {payment.remarks && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">备注</div>
                  <div className="bg-muted p-4 rounded-lg text-sm leading-relaxed">{payment.remarks}</div>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: 核销记录 */}
            <TabsContent value="verifications" className="mt-6">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-medium">订单号</TableHead>
                      <TableHead className="font-medium text-right">核销金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payment.verifications && payment.verifications.length > 0 ? (
                      payment.verifications.map((v, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{v.piNo}</TableCell>
                          <TableCell className="text-right font-medium">{formatAmount(v.amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                          暂无核销记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 核销汇总 */}
              {payment.verifications && payment.verifications.length > 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">已核销总额</span>
                    <span className="font-semibold">{formatAmount(String(payment.verifications.reduce((sum, v) => sum + parseFloat(v.amount || '0'), 0)))}</span>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: 核销操作 */}
            <TabsContent value="actions" className="mt-6 space-y-6">
              <div className="text-sm text-muted-foreground">
                将此笔收款的待分配余额核销到订单
              </div>

              <div className="p-5 bg-muted/50 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">实收金额</span>
                  <span className="font-semibold">{formatAmount(payment.receivedAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">已核销</span>
                  <span className="font-semibold text-green-600">{formatAmount(String(received - unallocated))}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-medium">待分配余额</span>
                  <span className="text-xl font-bold text-orange-600">{formatAmount(payment.unallocatedBalance)}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  onOpenChange(false)
                  onVerify(payment)
                }}
                disabled={unallocated <= 0}
              >
                <FileCheck className="mr-2 h-5 w-5" />
                核销订单
              </Button>

              {unallocated <= 0 && (
                <p className="text-sm text-center text-muted-foreground">
                  该收款已全额核销，无待分配余额
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
