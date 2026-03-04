"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { POOrder } from "../columns"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GripVertical, ExternalLink, Package, User, Calendar, DollarSign, Truck, Clock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { useTranslation } from "@/hooks/use-translation"

interface PODetailDrawerProps {
  order: POOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 宽度配置
const MIN_WIDTH = 500
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 700

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

// 获取核销状态配置
const getVerificationStatus = (status: string | null) => {
  const configs: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "待核销", variant: "outline" },
    partial: { label: "部分核销", variant: "secondary" },
    completed: { label: "已清账", variant: "default" },
    overpaid: { label: "超额支付", variant: "destructive" },
  }
  return configs[status || "pending"] || configs.pending
}

// 获取出货状态配置
const getShippingStatus = (status: string | null) => {
  const configs: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    pending: { label: "待生产", icon: <Clock className="h-4 w-4" />, color: "text-gray-500" },
    producing: { label: "生产中", icon: <RefreshCw className="h-4 w-4" />, color: "text-yellow-600" },
    inspecting: { label: "待验货", icon: <AlertCircle className="h-4 w-4" />, color: "text-orange-600" },
    shipped: { label: "已出货", icon: <Truck className="h-4 w-4" />, color: "text-blue-600" },
    completed: { label: "已完成", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600" },
  }
  return configs[status || "pending"] || configs.pending
}

// 计算收款进度
const getPaymentProgress = (total: string | null, outstanding: string | null) => {
  const totalNum = parseFloat(total || '0')
  const outstandingNum = parseFloat(outstanding || '0')
  if (totalNum === 0) return 0
  return Math.round(((totalNum - outstandingNum) / totalNum) * 100)
}

export function PODetailDrawer({
  order,
  open,
  onOpenChange,
}: PODetailDrawerProps) {
  const { locale } = useTranslation()

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

  if (!order) return null

  const verificationConfig = getVerificationStatus(order.verificationStatus)
  const shippingConfig = getShippingStatus(order.shippingStatus)
  const paymentProgress = getPaymentProgress(order.totalAmount, order.outstandingBalance)
  const totalAmount = parseFloat(order.totalAmount || '0')
  const outstandingAmount = parseFloat(order.outstandingBalance || '0')
  const paidAmount = totalAmount - outstandingAmount

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

        {/* 内容区域 */}
        <div className="h-full overflow-y-auto p-6">
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-xl">
                <Package className="h-5 w-5" />
                {order.piNo || '-'}
              </SheetTitle>
              <Link href={`/${locale}/admin/sync?from=admin/po`}>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  同步
                </Button>
              </Link>
            </div>
            <SheetDescription className="text-base">
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{order.customerName || "未知客户"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(order.orderDate)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className={`flex items-center gap-1 ${shippingConfig.color}`}>
                  {shippingConfig.icon}
                  {shippingConfig.label}
                </span>
                <Badge variant={verificationConfig.variant}>{verificationConfig.label}</Badge>
              </div>
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-11">
              <TabsTrigger value="basic" className="text-xs">订单明细</TabsTrigger>
              <TabsTrigger value="payment" className="text-xs">收款进度</TabsTrigger>
              <TabsTrigger value="sample" className="text-xs">确认样</TabsTrigger>
              <TabsTrigger value="package" className="text-xs">包装</TabsTrigger>
              <TabsTrigger value="inspect" className="text-xs">验货</TabsTrigger>
              <TabsTrigger value="ship" className="text-xs">出货</TabsTrigger>
            </TabsList>

            {/* Tab 1: 订单明细 */}
            <TabsContent value="basic" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">PI号</div>
                  <div className="text-base font-mono font-medium">{order.piNo || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">生产单号</div>
                  <div className="text-base font-mono font-medium">{order.productionNo || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">订单金额</div>
                  <div className="text-xl font-semibold text-green-600">{formatAmount(order.totalAmount)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">未结欠款</div>
                  <div className="text-xl font-semibold text-orange-600">{formatAmount(order.outstandingBalance)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">客户名称</div>
                  <div className="text-base font-medium">{order.customerName || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">订单日期</div>
                  <div className="text-base font-medium">{formatDate(order.orderDate)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">同步时间</div>
                  <div className="text-base font-medium">{formatDate(order.syncedAt)}</div>
                </div>
              </div>

              {order.remarks && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">备注</div>
                  <div className="bg-muted p-4 rounded-lg text-sm leading-relaxed">{order.remarks}</div>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: 收款进度 */}
            <TabsContent value="payment" className="mt-6">
              <div className="space-y-6">
                {/* 收款进度条 */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm font-medium">
                    <span>收款进度</span>
                    <span className="text-primary">{paymentProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${paymentProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">已收款：<span className="text-foreground font-medium">{formatAmount(String(paidAmount))}</span></span>
                    <span className="text-muted-foreground">待收款：<span className="text-orange-600 font-medium">{formatAmount(order.outstandingBalance)}</span></span>
                  </div>
                </div>

                {/* 关联收款记录 */}
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">关联收款</h3>
                  <Link href={`/${locale}/payments?searchValue=${order.piNo}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      查看收款记录
                    </Button>
                  </Link>
                </div>

                {order.relatedPayments && order.relatedPayments.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-medium">收款编号</TableHead>
                          <TableHead className="font-medium text-right">金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.relatedPayments.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{p.paymentNo || '-'}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">{formatAmount(p.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8 border rounded-lg">
                    暂无关联收款记录
                  </div>
                )}

                {/* 收款汇总 */}
                {order.relatedPayments && order.relatedPayments.length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">订单金额</span>
                      <span className="font-medium">{formatAmount(order.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">已收款</span>
                      <span className="font-medium text-green-600">{formatAmount(String(paidAmount))}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="font-medium">未结欠款</span>
                      <span className="font-bold text-orange-600">{formatAmount(order.outstandingBalance)}</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3-6: 开发中占位 */}
            <TabsContent value="sample" className="mt-6">
              <div className="text-center text-muted-foreground py-12 border rounded-lg">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">确认样功能</p>
                <p className="text-sm mt-1">开发中，敬请期待...</p>
              </div>
            </TabsContent>
            <TabsContent value="package" className="mt-6">
              <div className="text-center text-muted-foreground py-12 border rounded-lg">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">包装要求功能</p>
                <p className="text-sm mt-1">开发中，敬请期待...</p>
              </div>
            </TabsContent>
            <TabsContent value="inspect" className="mt-6">
              <div className="text-center text-muted-foreground py-12 border rounded-lg">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">验货报告功能</p>
                <p className="text-sm mt-1">开发中，敬请期待...</p>
              </div>
            </TabsContent>
            <TabsContent value="ship" className="mt-6">
              <div className="text-center text-muted-foreground py-12 border rounded-lg">
                <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">出货单证功能</p>
                <p className="text-sm mt-1">开发中，敬请期待...</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
