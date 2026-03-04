"use client"

import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Payment } from "../columns"

interface PaymentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  payment?: Payment | null  // 编辑时传入的收款数据
  mode?: 'create' | 'edit'  // 模式区分
}

// AI 解析状态
type AIParseStatus = 'idle' | 'parsing' | 'success' | 'timeout' | 'error'

// AI 解析配置
const AI_PARSE_CONFIG = {
  totalDuration: 30000,    // 进度条总时长 30s
  pollingStart: 20000,     // 20s 开始轮询
  pollingInterval: 5000,   // 每 5s 轮询
  maxPollingTime: 60000,   // 最大轮询时间 60s
}

// 银行账户选项
const BANK_ACCOUNTS = [
  "中国银行",
  "工商银行",
  "建设银行",
  "农业银行",
  "招商银行",
  "支付宝",
  "微信",
]

// 付款类型选项
const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "银行转账" },
  { value: "cash", label: "现金" },
  { value: "alipay", label: "支付宝" },
  { value: "wechat", label: "微信" },
  { value: "check", label: "支票" },
  { value: "other", label: "其他" },
]

export function PaymentFormDialog({ open, onOpenChange, onSuccess, payment, mode = 'create' }: PaymentFormDialogProps) {
  const isEditMode = mode === 'edit' && payment

  // 银行通知文本
  const [notification, setNotification] = useState("")
  // AI 解析状态
  const [aiStatus, setAiStatus] = useState<AIParseStatus>('idle')
  const [aiProgress, setAiProgress] = useState(0)
  const [aiMessage, setAiMessage] = useState("")
  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 表单字段
  const [formData, setFormData] = useState({
    receivedAmount: "",
    receivedDate: "",
    bankAccount: "",
    customerName: "",
    paymentMethod: "bank_transfer",
    remarks: "",
    bankNotice: "",
  })

  // 编辑模式：预填充表单数据
  useEffect(() => {
    if (isEditMode && payment) {
      setFormData({
        receivedAmount: payment.receivedAmount || "",
        receivedDate: payment.receivedDate
          ? (typeof payment.receivedDate === 'string'
              ? payment.receivedDate.split('T')[0]
              : new Date(payment.receivedDate).toISOString().split('T')[0])
          : "",
        bankAccount: payment.bankAccount || "",
        customerName: payment.customerName || "",
        paymentMethod: payment.paymentMethod || "bank_transfer",
        remarks: payment.remarks || "",
        bankNotice: payment.bankNotice || "",
      })
    }
  }, [payment, isEditMode])

  // AI 填充的字段（用于高亮显示）
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set())

  // 重置表单
  const resetForm = () => {
    setNotification("")
    setAiStatus('idle')
    setAiProgress(0)
    setAiMessage("")
    setFormData({
      receivedAmount: "",
      receivedDate: "",
      bankAccount: "",
      customerName: "",
      paymentMethod: "bank_transfer",
      remarks: "",
      bankNotice: "",
    })
    setAiFilledFields(new Set())
  }

  // AI 智能识别
  const handleAIParse = async () => {
    if (!notification.trim()) {
      toast.error("请先输入银行收款通知")
      return
    }

    setAiStatus('parsing')
    setAiProgress(0)
    setAiMessage("正在提交银行通知...")
    setAiFilledFields(new Set())

    try {
      // 1. 调用 API 创建 Airtable 记录
      const createRes = await fetch('/api/payments/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification: notification.trim() }),
      })

      if (!createRes.ok) {
        throw new Error('创建记录失败')
      }

      const { recordId } = await createRes.json()
      setAiMessage("AI 正在解析，请稍候...")

      // 2. 启动进度条动画
      const startTime = Date.now()
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min((elapsed / AI_PARSE_CONFIG.totalDuration) * 100, 100)
        setAiProgress(progress)
      }, 100)

      // 3. 延迟后开始轮询
      await new Promise(resolve => setTimeout(resolve, AI_PARSE_CONFIG.pollingStart))

      // 4. 轮询获取结果
      const pollingStartTime = Date.now()
      let parsed = false

      while (!parsed && Date.now() - pollingStartTime < AI_PARSE_CONFIG.maxPollingTime - AI_PARSE_CONFIG.pollingStart) {
        try {
          const pollRes = await fetch(`/api/payments/ai-parse/${recordId}`)
          if (pollRes.ok) {
            const data = await pollRes.json()

            if (data.parsed) {
              // AI 解析成功
              clearInterval(progressInterval)
              setAiProgress(100)
              setAiStatus('success')
              setAiMessage("解析完成！")

              // 填充表单
              const newFormData = { ...formData }
              const filledFields = new Set<string>()

              if (data.amount) {
                newFormData.receivedAmount = String(data.amount)
                filledFields.add('receivedAmount')
              }
              if (data.date) {
                newFormData.receivedDate = data.date
                filledFields.add('receivedDate')
              }
              if (data.bankAccount) {
                newFormData.bankAccount = data.bankAccount
                filledFields.add('bankAccount')
              }
              if (data.customerName) {
                newFormData.customerName = data.customerName
                filledFields.add('customerName')
              }
              if (data.paymentMethod) {
                newFormData.paymentMethod = data.paymentMethod
                filledFields.add('paymentMethod')
              }

              setFormData(newFormData)
              setAiFilledFields(filledFields)
              parsed = true
              break
            }
          }
        } catch (e) {
          console.error('Polling error:', e)
        }

        // 等待下一次轮询
        await new Promise(resolve => setTimeout(resolve, AI_PARSE_CONFIG.pollingInterval))
      }

      if (!parsed) {
        clearInterval(progressInterval)
        setAiStatus('timeout')
        setAiMessage("解析超时，请手动填写")
      }

    } catch (error) {
      console.error('AI parse error:', error)
      setAiStatus('error')
      setAiMessage("解析失败，请手动填写")
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    // 验证必填字段
    if (!formData.receivedAmount || !formData.receivedDate || !formData.bankAccount) {
      toast.error("请填写必填字段：实收金额、到账日期、收款账户")
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditMode && payment) {
        // 编辑模式：调用 PATCH API
        const res = await fetch(`/api/payments/${payment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: formData.customerName,
            receivedAmount: formData.receivedAmount,
            paymentMethod: formData.paymentMethod,
            receivedDate: formData.receivedDate,
            bankAccount: formData.bankAccount,
            remarks: formData.remarks,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || '更新失败')
        }

        toast.success("收款记录已更新")
      } else {
        // 新增模式：调用 POST API
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || '创建失败')
        }

        toast.success("收款记录已创建")
      }

      resetForm()
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 关闭弹窗
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  // 更新表单字段
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除 AI 填充标记（用户手动修改）
    setAiFilledFields(prev => {
      const next = new Set(prev)
      next.delete(field)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Pencil className="h-5 w-5" />
                编辑收款
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                新增收款
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "修改收款信息后点击保存"
              : "粘贴银行收款通知，AI 将自动提取金额和日期等信息"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI 智能解析区域 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              📋 银行收款通知
            </Label>
            <Textarea
              placeholder="粘贴银行短信或收款通知内容..."
              value={notification}
              onChange={(e) => setNotification(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAIParse}
                disabled={aiStatus === 'parsing'}
              >
                {aiStatus === 'parsing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    智能识别
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNotification("")}
              >
                清空
              </Button>
            </div>

            {/* 进度条 */}
            {aiStatus !== 'idle' && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <Progress value={aiProgress} className="h-2" />
                <div className="flex items-center gap-2 text-sm">
                  {aiStatus === 'parsing' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-muted-foreground">{aiMessage}</span>
                    </>
                  )}
                  {aiStatus === 'success' && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">{aiMessage}</span>
                    </>
                  )}
                  {(aiStatus === 'timeout' || aiStatus === 'error') && (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-600">{aiMessage}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">收款信息</h4>

            {/* 表单字段 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 实收金额 */}
              <div className="space-y-2">
                <Label htmlFor="receivedAmount">
                  实收金额 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="receivedAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.receivedAmount}
                  onChange={(e) => updateField('receivedAmount', e.target.value)}
                  className={aiFilledFields.has('receivedAmount') ? 'border-green-500 ring-1 ring-green-500' : ''}
                />
              </div>

              {/* 到账日期 */}
              <div className="space-y-2">
                <Label htmlFor="receivedDate">
                  到账日期 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="receivedDate"
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => updateField('receivedDate', e.target.value)}
                  className={aiFilledFields.has('receivedDate') ? 'border-green-500 ring-1 ring-green-500' : ''}
                />
              </div>

              {/* 收款账户 */}
              <div className="space-y-2">
                <Label htmlFor="bankAccount">
                  收款账户 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.bankAccount}
                  onValueChange={(v) => updateField('bankAccount', v)}
                >
                  <SelectTrigger className={aiFilledFields.has('bankAccount') ? 'border-green-500 ring-1 ring-green-500' : ''}>
                    <SelectValue placeholder="选择账户" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_ACCOUNTS.map((account) => (
                      <SelectItem key={account} value={account}>{account}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 客户名称 */}
              <div className="space-y-2">
                <Label htmlFor="customerName">客户名称</Label>
                <Input
                  id="customerName"
                  placeholder="付款方名称"
                  value={formData.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className={aiFilledFields.has('customerName') ? 'border-green-500 ring-1 ring-green-500' : ''}
                />
              </div>

              {/* 付款类型 */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">付款类型</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => updateField('paymentMethod', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 备注 */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="remarks">备注</Label>
                <Input
                  id="remarks"
                  placeholder="可选备注信息"
                  value={formData.remarks}
                  onChange={(e) => updateField('remarks', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "保存中..." : "添加中..."}
              </>
            ) : (
              isEditMode ? "保存修改" : "确认添加"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
