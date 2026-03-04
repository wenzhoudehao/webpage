"use client"

import { Progress } from "@/components/ui/progress"

// ========== 工具函数：计算收款进度 ==========

export function calcPaymentProgress(total: number, paid: number): number {
  if (total <= 0) return 0
  return Math.round((paid / total) * 100)
}

export function formatCompactAmount(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}万`
  }
  return amount.toLocaleString('zh-CN')
}

// ========== 组件 Props ==========

interface PaymentProgressProps {
  total: number           // 订单总额
  paid: number            // 已收款
  outstanding?: number    // 未结欠款（可选，不传则自动计算）
  variant?: 'compact' | 'inline' | 'full'  // 展示模式
  showLabel?: boolean     // 是否显示标签
  className?: string      // 自定义样式
}

// ========== 组件定义 ==========

export function PaymentProgress({
  total,
  paid,
  outstanding,
  variant = 'full',
  showLabel = true,
  className = '',
}: PaymentProgressProps) {
  const progress = calcPaymentProgress(total, paid)
  const unpaid = outstanding ?? (total - paid)

  // 紧凑模式：用于表格单元格
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Progress value={progress} className="h-2 w-16" />
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
    )
  }

  // 行内模式：用于统计栏
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">收款</span>
          <span className="font-medium text-green-600">¥{formatCompactAmount(paid)}</span>
        </div>
        <Progress value={progress} className="h-2 w-12" />
        <span className="text-xs text-muted-foreground">{progress}%</span>
        {unpaid > 0 && (
          <span className="text-xs text-orange-600">
            待收 ¥{formatCompactAmount(unpaid)}
          </span>
        )}
      </div>
    )
  }

  // 完整模式：用于详情页/抽屉
  return (
    <div className={`space-y-3 p-4 bg-muted/50 rounded-lg ${className}`}>
      <div className="flex justify-between text-sm font-medium">
        <span>收款进度</span>
        <span className="text-primary">{progress}%</span>
      </div>
      <Progress value={progress} className="h-3" />
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            已收款：<span className="text-foreground font-medium">¥{paid.toLocaleString()}</span>
          </span>
          <span className="text-muted-foreground">
            待收款：<span className="text-orange-600 font-medium">¥{unpaid.toLocaleString()}</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ========== 快捷组件 ==========

// 表格中使用的紧凑版本
export function PaymentProgressCell({ total, paid }: { total: number; paid: number }) {
  return <PaymentProgress total={total} paid={paid} variant="compact" />
}

// 统计栏使用的行内版本
export function PaymentProgressInline({ total, paid }: { total: number; paid: number }) {
  return <PaymentProgress total={total} paid={paid} variant="inline" />
}
