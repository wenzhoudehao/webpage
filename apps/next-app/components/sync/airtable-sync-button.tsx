'use client';

/**
 * Airtable 同步按钮组件
 *
 * 提供一键同步 Airtable 数据到 Supabase 的功能
 * 包含同步进度显示和错误弹窗
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Database, Loader2 } from 'lucide-react';

// ========== 类型定义 ==========

interface SyncStats {
  table: string;
  total: number;
  inserted: number;
  errors: number;
  duration: number;
}

interface SyncResult {
  success: boolean;
  stats: SyncStats[];
  totalDuration: number;
  errors: string[];
  syncedAt: string;
}

// 同步步骤
const SYNC_STEPS = [
  { id: 'po', label: '同步订单表 (PO)', table: 'PO' },
  { id: 'payment', label: '同步收款表', table: '收款登记' },
  { id: 'verification', label: '同步核销表', table: '收款_中间表' },
] as const;

// ========== 组件 ==========

interface AirtableSyncButtonProps {
  /** 按钮文字 */
  buttonText?: string;
  /** 按钮变体 */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /** 按钮大小 */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** 是否全量同步 */
  fullSync?: boolean;
  /** 同步完成后回调 */
  onSyncComplete?: (result: SyncResult) => void;
  /** 是否显示详细弹窗 */
  showDialog?: boolean;
}

export function AirtableSyncButton({
  buttonText = '同步数据',
  variant = 'outline',
  size = 'default',
  fullSync = false,
  onSyncComplete,
  showDialog = true,
}: AirtableSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [completedTables, setCompletedTables] = useState<string[]>([]);

  // 执行同步
  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    setCurrentStep(0);
    setCompletedTables([]);

    try {
      const response = await fetch('/api/sync/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: ['po', 'payment', 'verification'],
          view: 'API_Sync_Active',
          fullSync: fullSync,
        }),
      });

      const data: SyncResult = await response.json();
      setResult(data);

      // 标记所有步骤完成
      setCurrentStep(SYNC_STEPS.length - 1);
      setCompletedTables(SYNC_STEPS.map(s => s.table));

      if (data.success) {
        toast.success('同步成功', {
          description: `已同步 ${data.stats.reduce((sum, s) => sum + s.inserted, 0)} 条记录`,
        });
      } else {
        if (showDialog) {
          setIsDialogOpen(true);
        } else {
          toast.error('同步失败', {
            description: data.errors[0] || '未知错误',
          });
        }
      }

      onSyncComplete?.(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络请求失败';
      toast.error('同步失败', { description: errorMessage });
    } finally {
      setIsLoading(false);
      setCurrentStep(-1);
    }
  };

  // 计算进度百分比
  const progressPercent = isLoading
    ? Math.round(((currentStep + 1) / SYNC_STEPS.length) * 100)
    : 100;

  // 获取表名显示
  const getTableDisplayName = (table: string) => {
    const names: Record<string, string> = {
      PO: '订单表',
      '收款登记': '收款表',
      '收款_中间表': '核销表',
    };
    return names[table] || table;
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleSync}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            同步中...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            {buttonText}
          </>
        )}
      </Button>

      {/* 同步进度弹窗 */}
      {isLoading && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[400px]" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                正在同步...
              </DialogTitle>
              <DialogDescription>
                从 Airtable 同步数据到本地数据库
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* 进度条 */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>进度</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* 步骤列表 */}
              <div className="space-y-2">
                {SYNC_STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 text-sm ${
                      completedTables.includes(step.table)
                        ? 'text-green-600'
                        : index === currentStep
                        ? 'text-blue-600 font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {completedTables.includes(step.table) ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : index === currentStep ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border" />
                    )}
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 同步结果弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  同步完成
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  同步部分成功
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              同步耗时: {result?.totalDuration ? `${(result.totalDuration / 1000).toFixed(1)}秒` : '-'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 统计信息 */}
            {result?.stats && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">同步统计</h4>
                <div className="grid gap-2">
                  {result.stats.map((stat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getTableDisplayName(stat.table)}
                        </span>
                        {stat.errors > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {stat.errors} 失败
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>共 {stat.total} 条</span>
                        <span className="text-green-600">+{stat.inserted}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {result?.errors && result.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>同步警告</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc pl-4 text-sm">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs">
                    可能原因：Airtable 字段已被修改或网络问题。
                  </p>
                  <p className="mt-2 text-xs font-medium">
                    💡 点击页面上的「诊断问题」按钮可查看详情。
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleSync} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  同步中...
                </>
              ) : (
                '重新同步'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
