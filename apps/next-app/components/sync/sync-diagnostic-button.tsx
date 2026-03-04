'use client';

/**
 * 同步诊断组件
 *
 * 分析同步失败的原因，显示详细信息
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Search, AlertTriangle, FileWarning, Database, Loader2, CheckCircle2 } from 'lucide-react';

// ========== 类型定义 ==========

interface MissingPORecord {
  verificationId: string;
  poId: string;
  pi: string;
  productionNo: string;
  customer: string;
  allocatedAmount: string;
}

interface IncompleteRecord {
  verificationId: string;
  poId: string | null;
  paymentId: string | null;
  allocatedAmount: string;
  reason: string;
}

interface DiagnosticResult {
  summary: {
    totalVerificationRecords: number;
    validRecords: number;
    missingPOCount: number;
    incompleteCount: number;
    cachedPOCount: number;
  };
  missingPORecords: MissingPORecord[];
  incompleteRecords: IncompleteRecord[];
}

// 诊断步骤
const DIAGNOSTIC_STEPS = [
  { id: 'cache', label: '查询缓存表数据' },
  { id: 'verification', label: '获取核销记录' },
  { id: 'analyze', label: '分析关联关系' },
  { id: 'po', label: '查询订单详情' },
] as const;

// ========== 组件 ==========

interface SyncDiagnosticButtonProps {
  /** 按钮变体 */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /** 按钮大小 */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** 是否显示为紧凑模式（只显示图标） */
  compact?: boolean;
}

export function SyncDiagnosticButton({
  variant = 'outline',
  size = 'default',
  compact = false,
}: SyncDiagnosticButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 执行诊断
  const handleDiagnostic = async () => {
    setIsLoading(true);
    setResult(null);
    setCurrentStep(0);

    try {
      // 步骤 1: 查询缓存表
      setCurrentStep(0);
      await delay(300);

      // 步骤 2: 获取核销记录
      setCurrentStep(1);

      const response = await fetch('/api/sync/diagnostic');

      if (!response.ok) {
        throw new Error('诊断请求失败');
      }

      // 步骤 3: 分析关联
      setCurrentStep(2);
      await delay(200);

      const data: DiagnosticResult = await response.json();

      // 步骤 4: 查询订单详情（API 内部完成）
      setCurrentStep(3);
      await delay(300);

      setResult(data);
      setIsDialogOpen(true);
    } catch (error) {
      toast.error('诊断失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsLoading(false);
      setCurrentStep(-1);
    }
  };

  // 计算进度百分比
  const progressPercent = isLoading
    ? Math.round(((currentStep + 1) / DIAGNOSTIC_STEPS.length) * 100)
    : 0;

  // 计算总问题数
  const totalIssues = result
    ? result.summary.missingPOCount + result.summary.incompleteCount
    : 0;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleDiagnostic}
        disabled={isLoading}
        data-diagnostic-trigger="true"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {!compact && (
          <span className="ml-2">{isLoading ? '诊断中...' : '诊断问题'}</span>
        )}
      </Button>

      {/* 诊断进度弹窗 */}
      {isLoading && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[400px]" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                正在诊断...
              </DialogTitle>
              <DialogDescription>
                分析同步数据，请稍候
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
                {DIAGNOSTIC_STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 text-sm ${
                      index < currentStep
                        ? 'text-green-600'
                        : index === currentStep
                        ? 'text-blue-600 font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {index < currentStep ? (
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

      {/* 诊断结果弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-yellow-500" />
              同步诊断结果
            </DialogTitle>
            <DialogDescription>
              分析同步失败的记录
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4 py-4">
              {/* 汇总信息 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{result.summary.totalVerificationRecords}</div>
                  <div className="text-xs text-muted-foreground">核销记录总数</div>
                </div>
                <div className="rounded-lg border p-3 text-center bg-green-50 dark:bg-green-950">
                  <div className="text-2xl font-bold text-green-600">{result.summary.totalVerificationRecords}</div>
                  <div className="text-xs text-muted-foreground">已同步</div>
                </div>
                <div className="rounded-lg border p-3 text-center bg-blue-50 dark:bg-blue-950">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.missingPOCount}</div>
                  <div className="text-xs text-muted-foreground">订单未在视图</div>
                </div>
                <div className="rounded-lg border p-3 text-center bg-yellow-50 dark:bg-yellow-950">
                  <div className="text-2xl font-bold text-yellow-600">{result.summary.incompleteCount}</div>
                  <div className="text-xs text-muted-foreground">关联不完整</div>
                </div>
              </div>

              {/* 订单未在同步视图的记录 */}
              {result.missingPORecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">关联的订单不在同步视图中</h4>
                    <Badge variant="secondary">{result.missingPORecords.length}</Badge>
                  </div>
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                    <Database className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-700">提示</AlertTitle>
                    <AlertDescription className="text-blue-600">
                      这些核销记录已同步，但关联的订单（PI号）不在 <code className="bg-blue-100 px-1 rounded">API_Sync_Active</code> 视图中。
                      如需完整数据，请将相关订单加入视图。
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(groupByPO(result.missingPORecords)).map(([poId, records]) => (
                      <div key={poId} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              PI: {records[0].pi}
                              {records[0].productionNo && records[0].productionNo !== '(无)' && (
                                <span className="text-muted-foreground ml-2">
                                  ({records[0].productionNo})
                                </span>
                              )}
                            </div>
                            {records[0].customer && records[0].customer !== '(无)' && (
                              <div className="text-sm text-muted-foreground">
                                客户: {records[0].customer}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline">{records.length} 条核销</Badge>
                        </div>
                        <div className="mt-2 text-sm">
                          分配金额: ¥{records.map(r => r.allocatedAmount).join(' + ¥')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 关联不完整的记录 */}
              {result.incompleteRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">关联不完整的记录</h4>
                    <Badge variant="secondary">{result.incompleteRecords.length}</Badge>
                  </div>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>原因</AlertTitle>
                    <AlertDescription>
                      这些记录可能是草稿、测试数据，或者关联记录已被删除。
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-1 max-h-40 overflow-y-auto text-sm">
                    {result.incompleteRecords.map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded border p-2">
                        <span className="text-muted-foreground">{rec.verificationId}</span>
                        <Badge variant={rec.reason.includes('都为空') ? 'destructive' : 'secondary'}>
                          {rec.reason}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 建议 */}
              {totalIssues > 0 && (
                <Alert className="bg-muted">
                  <AlertTitle>数据说明</AlertTitle>
                  <AlertDescription className="space-y-1">
                    <p>所有记录已成功同步到数据库。以下信息仅供参考：</p>
                    {result.summary.missingPOCount > 0 && (
                      <p>• {result.summary.missingPOCount} 条核销记录关联的订单不在同步视图中，如需完整数据请将订单加入视图</p>
                    )}
                    {result.summary.incompleteCount > 0 && (
                      <p>• {result.summary.incompleteCount} 条记录关联信息不完整（可能是客人未付款或业务员未分配）</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* 无问题 */}
              {totalIssues === 0 && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                  <AlertTitle className="text-green-700">所有记录都正常！</AlertTitle>
                  <AlertDescription>
                    没有发现同步问题，所有核销记录都可以正常同步。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// 按 PO 分组
function groupByPO(records: MissingPORecord[]): Record<string, MissingPORecord[]> {
  return records.reduce((acc, rec) => {
    if (!acc[rec.poId]) {
      acc[rec.poId] = [];
    }
    acc[rec.poId].push(rec);
    return acc;
  }, {} as Record<string, MissingPORecord[]>);
}

// 延迟函数
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
