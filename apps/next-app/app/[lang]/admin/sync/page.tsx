'use client';

/**
 * 数据同步管理页面
 *
 * 提供 Airtable → Supabase 同步功能
 * 支持 Tab 切换增量同步和全量同步
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AirtableSyncButton } from '@/components/sync/airtable-sync-button';
import { SyncDiagnosticButton } from '@/components/sync/sync-diagnostic-button';
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, Database, AlertCircle } from 'lucide-react';

// ========== 类型定义 ==========

interface SyncLog {
  id: string;
  status: string;
  success: boolean;
  duration: number;
  started_at: string;
  completed_at: string | null;
  stats: Array<{
    table: string;
    total: number;
    inserted: number;
    errors: number;
  }> | null;
  errors: string[] | null;
}

// ========== 组件 ==========

export default function SyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取同步日志
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/sync/airtable');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('获取同步日志失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // 获取状态文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'partial':
        return '部分成功';
      case 'running':
        return '同步中';
      default:
        return status;
    }
  };

  // 获取表名显示
  const getTableDisplayName = (table: string) => {
    const names: Record<string, string> = {
      PO: '订单表',
      '收款登记': '收款表',
      '收款_中间表': '核销表',
    };
    return names[table] || table;
  };

  // 计算最新日志的总错误数
  const latestLogErrors = logs[0]?.stats?.reduce((sum, s) => sum + s.errors, 0) || 0;

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">数据同步</h1>
            <p className="text-muted-foreground mt-1">
              同步 Airtable 数据到本地数据库
            </p>
          </div>
          <SyncDiagnosticButton variant="outline" />
        </div>

        {/* Tabs 分页 */}
        <Tabs defaultValue="incremental" className="w-full" id="sync-tabs">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="incremental">增量同步</TabsTrigger>
            <TabsTrigger value="full">全量同步</TabsTrigger>
          </TabsList>

          {/* 增量同步 Tab */}
          <TabsContent value="incremental" className="mt-6">
            {/* 同步说明 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  增量同步
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• 点击「增量同步」按钮将 Airtable 中的订单、收款、核销数据同步到本地数据库</p>
                <p>• 同步使用 <code className="bg-muted px-1 rounded">API_Sync_Active</code> 视图，只同步需要的数据</p>
                <p>• 同步是增量更新，已存在的记录会被更新，新记录会被添加</p>
                <p>• 如果同步有错误，点击「诊断问题」按钮可以查看详细信息</p>
              </CardContent>
            </Card>

            {/* 提示 - 当有记录关联不完整时显示 */}
            {logs.length > 0 && latestLogErrors > 0 && (
              <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-700">同步完成，有 {latestLogErrors} 条记录关联不完整</AlertTitle>
                <AlertDescription className="text-blue-600">
                  所有记录已同步，但部分核销记录的关联订单不在同步视图中，或关联信息不完整。
                  <Button
                    variant="link"
                    className="px-1 ml-1 h-auto text-blue-700 underline"
                    onClick={() => document.querySelector<HTMLElement>('[data-diagnostic-trigger]')?.click()}
                  >
                    点击「诊断」查看详情
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* 增量同步按钮 */}
            <div className="mb-6">
              <AirtableSyncButton
                buttonText="增量同步"
                variant="default"
                size="lg"
                fullSync={false}
                onSyncComplete={() => {
                  fetchLogs();
                }}
              />
            </div>

            {/* 同步日志 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>同步历史</CardTitle>
                    <CardDescription>最近的同步记录</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchLogs}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    加载中...
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无同步记录，点击「增量同步」开始
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log, index) => (
                      <div
                        key={log.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="font-medium">{getStatusText(log.status)}</span>
                            {log.stats && log.stats.some(s => s.errors > 0) && (
                              <Badge variant="destructive" className="ml-1">
                                {log.stats.reduce((sum, s) => sum + s.errors, 0)} 条失败
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.duration ? `${(log.duration / 1000).toFixed(1)}秒` : '-'}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          {new Date(log.started_at).toLocaleString('zh-CN')}
                        </div>

                        {log.stats && (
                          <div className="flex flex-wrap gap-4 text-sm">
                            {log.stats.map((stat, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span>{getTableDisplayName(stat.table)}:</span>
                                <span className="text-green-600">+{stat.inserted}</span>
                                {stat.errors > 0 && (
                                  <Badge variant="destructive" className="ml-1 text-xs">
                                    {stat.errors} 失败
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {log.errors && log.errors.length > 0 && (
                          <div className="mt-2 text-sm text-red-500">
                            {log.errors.map((error, idx) => (
                              <div key={idx}>• {error}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 全量同步 Tab */}
          <TabsContent value="full" className="mt-6">
            {/* 警告说明 */}
            <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-700">⚠️ 注意：全量同步</AlertTitle>
              <AlertDescription className="text-red-600">
                <p className="mb-2">全量同步会先<strong>清空所有缓存数据</strong>，然后重新从 Airtable 同步。</p>
                <p className="mb-2">这个操作会花费更长时间，请谨慎使用。</p>
                <p className="text-sm">适用场景：数据结构发生变化、需要重新初始化数据、增量同步出现异常等。</p>
              </AlertDescription>
            </Alert>

            {/* 全量同步说明卡片 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  全量同步
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• 执行全量同步前，请确认增量同步无法解决问题</p>
                <p>• 全量同步会删除所有缓存表数据，然后重新拉取</p>
                <p>• 同步期间，相关功能可能会暂时不可用</p>
                <p>• 预计耗时取决于数据量大小，通常需要几秒到几分钟</p>
              </CardContent>
            </Card>

            {/* 全量同步按钮 */}
            <AirtableSyncButton
              buttonText="全量同步"
              variant="destructive"
              size="lg"
              fullSync={true}
              onSyncComplete={() => {
                fetchLogs();
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
