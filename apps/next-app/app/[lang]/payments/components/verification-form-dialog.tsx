"use client"

import { useState } from "react"
import { Payment } from "../columns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Search, Loader2 } from "lucide-react"

interface VerificationFormDialogProps {
  payment: Payment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// 模拟待核销订单列表
const mockOrders = [
  { id: "po001", piNo: "26DH01001", productionNo: "26001", customerName: "温州德皓贸易有限公司", amount: 15000 },
  { id: "po002", piNo: "26DH01002", productionNo: "26002", customerName: "温州德皓贸易有限公司", amount: 8000 },
  { id: "po003", piNo: "26DH02001", productionNo: "26003", customerName: "杭州科技有限公司", amount: 25000 },
]

// 核销类型
const VERIFICATION_TYPES = [
  { value: "payment", label: "收款核销" },
  { value: "advance", label: "预付款" },
  { value: "deposit", label: "定金" },
  { value: "other", label: "其他" },
]

// 格式化金额
const formatAmount = (amount: string | number | null) => {
  if (!amount) return '-'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return String(amount)
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(num)
}

export function VerificationFormDialog({ payment, open, onOpenChange, onSuccess }: VerificationFormDialogProps) {
  const [searchKeyword, setSearchKeyword] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null)
  const [verificationAmount, setVerificationAmount] = useState("")
  const [verificationType, setVerificationType] = useState("payment")
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 待分配余额
  const unallocated = parseFloat(payment?.unallocatedBalance || '0')

  // 筛选订单（按客户名称或 PI 号）
  const filteredOrders = mockOrders.filter(order =>
    order.customerName.includes(searchKeyword) ||
    order.piNo.includes(searchKeyword) ||
    order.productionNo.includes(searchKeyword)
  )

  // 选择订单
  const handleSelectOrder = (order: typeof mockOrders[0]) => {
    setSelectedOrder(order)
    // 默认填入全部待分配金额
    setVerificationAmount(String(unallocated))
  }

  // 提交核销
  const handleSubmit = async () => {
    if (!selectedOrder) {
      toast.error("请选择要核销的订单")
      return
    }

    const amount = parseFloat(verificationAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("请输入有效的核销金额")
      return
    }

    if (amount > unallocated) {
      toast.error(`核销金额不能超过待分配余额 ${formatAmount(unallocated)}`)
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: 调用 API 创建核销记录
      console.log('Create verification:', {
        paymentId: payment?.id,
        orderId: selectedOrder.id,
        amount,
        type: verificationType,
        remarks,
      })

      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success(`已核销 ${formatAmount(amount)} 到订单 ${selectedOrder.piNo}`)
      resetForm()
      onSuccess()
    } catch (error) {
      toast.error("核销失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重置表单
  const resetForm = () => {
    setSearchKeyword("")
    setSelectedOrder(null)
    setVerificationAmount("")
    setVerificationType("payment")
    setRemarks("")
  }

  // 关闭弹窗
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>核销订单</DialogTitle>
          <DialogDescription>
            将收款 {payment.paymentNo} 的待分配余额核销到订单
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 收款信息 */}
          <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">收款编号</span>
              <span className="font-medium">{payment.paymentNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">客户名称</span>
              <span>{payment.customerName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">待分配余额</span>
              <span className="font-bold text-orange-600">{formatAmount(payment.unallocatedBalance)}</span>
            </div>
          </div>

          {/* 搜索订单 */}
          <div className="space-y-2">
            <Label>选择订单</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索订单号、PI号或客户名称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 订单列表 */}
            <div className="border rounded-lg max-h-[200px] overflow-y-auto">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted transition-colors ${
                      selectedOrder?.id === order.id ? 'bg-muted ring-1 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectOrder(order)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{order.piNo}</div>
                        <div className="text-sm text-muted-foreground">{order.customerName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatAmount(order.amount)}</div>
                        <div className="text-xs text-muted-foreground">{order.productionNo}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  未找到匹配的订单
                </div>
              )}
            </div>
          </div>

          {/* 核销金额 */}
          <div className="space-y-2">
            <Label htmlFor="verificationAmount">
              核销金额 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="verificationAmount"
              type="number"
              step="0.01"
              placeholder={`最多 ${formatAmount(unallocated)}`}
              value={verificationAmount}
              onChange={(e) => setVerificationAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              剩余可核销：{formatAmount(unallocated - (parseFloat(verificationAmount) || 0))}
            </p>
          </div>

          {/* 核销类型 */}
          <div className="space-y-2">
            <Label>核销类型</Label>
            <Select value={verificationType} onValueChange={setVerificationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERIFICATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <Label htmlFor="remarks">备注</Label>
            <Input
              id="remarks"
              placeholder="可选备注"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedOrder}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              '确认核销'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
