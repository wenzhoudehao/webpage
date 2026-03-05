'use client';

/**
 * 数据同步管理页面
 *
 * 提供 Airtable → Supabase 同步功能
 * 支持 Tab 切换增量同步和全量同步
 */

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AirtableSyncButton } from '@/components/sync/airtable-sync-button';
import { SyncDiagnosticButton } from '@/components/sync/sync-diagnostic-button';
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, Database, AlertCircle, ArrowLeft, Layers, Trash2, Plus, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

// ========== 类型定义 ==========

interface SyncLog {
  id: string;
  status: string;
  success: boolean;
  duration: number;
  startedAt: string;
  completedAt: string | null;
  options?: {
    fullSync?: boolean;
    tables?: string[];
    view?: string;
  } | null;
  stats: Array<{
    table: string;
    total: number;
    inserted: number;
    updated: number;
    deleted: number;
    errors: number;
    apiCalls?: number;
  }> | null;
  errors: string[] | null;
}

// ========== 主内容组件 ==========

function SyncPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = params.lang as string;
  const fromPage = searchParams.get('from');

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
        {/* 返回按钮 */}
        {fromPage && (
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push(`/${lang}/${fromPage}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回{fromPage === 'payments' ? '收款管理' : fromPage === 'po' ? '订单大厅' : '上一页'}
          </Button>
        )}

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
          <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
            <TabsTrigger value="incremental">增量同步</TabsTrigger>
            <TabsTrigger value="full">全量同步</TabsTrigger>
            <TabsTrigger value="stats">API 统计</TabsTrigger>
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
                  // 如果是从其他页面跳转过来的，显示返回提示
                  if (fromPage) {
                    toast.success('同步完成', {
                      action: {
                        label: fromPage === 'payments' ? '返回收款管理' : fromPage === 'po' ? '返回订单大厅' : '返回',
                        onClick: () => router.push(`/${lang}/${fromPage}`)
                      }
                    });
                  }
                }}
              />
            </div>

            {/* 同步日志 - 只显示增量同步 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>增量同步历史</CardTitle>
                    <CardDescription>最近的增量同步记录</CardDescription>
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
                ) : (() => {
                  const incrementalLogs = logs.filter(log => !log.options?.fullSync);
                  return incrementalLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无增量同步记录，点击「增量同步」开始
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {incrementalLogs.map((log) => (
                        <div
                          key={log.id}
                          className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              <span className="font-medium">{getStatusText(log.status)}</span>
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300">
                                <Plus className="h-3 w-3 mr-1" />
                                增量同步
                              </Badge>
                              {log.stats && log.stats.some(s => s.errors > 0) && (
                                <Badge variant="destructive" className="ml-1">
                                  {log.stats.reduce((sum, s) => sum + s.errors, 0)} 条失败
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {log.stats && (
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="h-3 w-3" />
                                  {log.stats.reduce((sum, s) => sum + (s.apiCalls || 0), 0)} 次 API
                                </span>
                              )}
                              <span>{log.duration ? `${(log.duration / 1000).toFixed(1)}秒` : '-'}</span>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground mb-2">
                            {new Date(log.startedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                          </div>

                          {log.stats && (
                            <div className="flex flex-wrap gap-4 text-sm">
                              {log.stats.map((stat, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                                  <span className="text-muted-foreground">{getTableDisplayName(stat.table)}</span>
                                  <span className="text-green-600 font-medium">+{stat.inserted}</span>
                                  {stat.updated > 0 && (
                                    <span className="text-blue-600">↑{stat.updated}</span>
                                  )}
                                  {stat.apiCalls && stat.apiCalls > 0 && (
                                    <span className="text-muted-foreground text-xs">({stat.apiCalls}次API)</span>
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
                  );
                })()}
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
                // 如果是从其他页面跳转过来的，显示返回提示
                if (fromPage) {
                  toast.success('同步完成', {
                    action: {
                      label: '返回收款管理',
                      onClick: () => router.push(`/${lang}/${fromPage}`)
                    }
                  });
                }
              }}
            />

            {/* 全量同步历史 */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>全量同步历史</CardTitle>
                    <CardDescription>最近的全量同步记录</CardDescription>
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
                ) : (() => {
                  const fullSyncLogs = logs.filter(log => log.options?.fullSync);
                  return fullSyncLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无全量同步记录
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fullSyncLogs.map((log) => (
                        <div
                          key={log.id}
                          className="border-2 border-red-300 dark:border-red-800 rounded-lg p-4 bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              <span className="font-medium">{getStatusText(log.status)}</span>
                              <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-400">
                                <Trash2 className="h-3 w-3 mr-1" />
                                全量同步
                              </Badge>
                              {log.stats && log.stats.some(s => s.errors > 0) && (
                                <Badge variant="destructive" className="ml-1">
                                  {log.stats.reduce((sum, s) => sum + s.errors, 0)} 条失败
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {log.stats && (
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="h-3 w-3" />
                                  {log.stats.reduce((sum, s) => sum + (s.apiCalls || 0), 0)} 次 API
                                </span>
                              )}
                              <span>{log.duration ? `${(log.duration / 1000).toFixed(1)}秒` : '-'}</span>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground mb-2">
                            {new Date(log.startedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                          </div>

                          {/* 全量同步：显示清空后重新同步的总数 */}
                          {log.stats && (
                            <div className="flex flex-wrap gap-4 text-sm">
                              {log.stats.map((stat, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded border border-red-200 dark:border-red-800">
                                  <span className="text-muted-foreground">{getTableDisplayName(stat.table)}</span>
                                  <span className="text-red-600 font-medium">🗑️ 清空后</span>
                                  <span className="text-green-600 font-bold">+{stat.total}</span>
                                  <span className="text-muted-foreground text-xs">条</span>
                                  {stat.apiCalls && stat.apiCalls > 0 && (
                                    <span className="text-blue-600 text-xs">({stat.apiCalls}次API)</span>
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
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API 统计 Tab */}
          <TabsContent value="stats" className="mt-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  API 使用统计
                </CardTitle>
                <CardDescription>Airtable API 调用次数统计（每次同步最多 100 条记录/请求）</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 总览卡片 */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">今日调用</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {logs
                        .filter(log => {
                          const logDate = new Date(log.startedAt);
                          const today = new Date();
                          return logDate.toDateString() === today.toDateString();
                        })
                        .reduce((sum, log) => sum + (log.stats?.reduce((s, stat) => s + (stat.apiCalls || 0), 0) || 0), 0)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">次</span>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">本周调用</div>
                    <div className="text-2xl font-bold text-green-600">
                      {logs
                        .filter(log => {
                          const logDate = new Date(log.startedAt);
                          const today = new Date();
                          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                          return logDate >= weekAgo;
                        })
                        .reduce((sum, log) => sum + (log.stats?.reduce((s, stat) => s + (stat.apiCalls || 0), 0) || 0), 0)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">次</span>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">本月调用</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {logs
                        .filter(log => {
                          const logDate = new Date(log.startedAt);
                          const today = new Date();
                          return logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear();
                        })
                        .reduce((sum, log) => sum + (log.stats?.reduce((s, stat) => s + (stat.apiCalls || 0), 0) || 0), 0)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">次</span>
                    </div>
                  </div>
                </div>

                {/* 按日期统计表格 */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-medium">日期</TableHead>
                        <TableHead className="font-medium text-right">同步次数</TableHead>
                        <TableHead className="font-medium text-right">API 调用</TableHead>
                        <TableHead className="font-medium text-right">记录数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // 按日期分组统计
                        const dailyStats = new Map<string, { syncs: number; apiCalls: number; records: number }>();

                        logs.forEach(log => {
                          const date = new Date(log.startedAt).toLocaleDateString('zh-CN');
                          const existing = dailyStats.get(date) || { syncs: 0, apiCalls: 0, records: 0 };
                          existing.syncs += 1;
                          existing.apiCalls += log.stats?.reduce((sum, s) => sum + (s.apiCalls || 0), 0) || 0;
                          existing.records += log.stats?.reduce((sum, s) => sum + s.total, 0) || 0;
                          dailyStats.set(date, existing);
                        });

                        // 按日期排序（最近的在前）
                        const sortedDates = Array.from(dailyStats.entries())
                          .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                          .slice(0, 14); // 最近 14 天

                        if (sortedDates.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                暂无同步记录
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return sortedDates.map(([date, stats]) => (
                          <TableRow key={date}>
                            <TableCell className="font-medium">{date}</TableCell>
                            <TableCell className="text-right">{stats.syncs}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-blue-600 font-medium">{stats.apiCalls}</span>
                            </TableCell>
                            <TableCell className="text-right">{stats.records}</TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* 简单柱状图 - 最近7天 */}
                <div className="mt-6">
                  <h4 className="font-medium mb-4">最近 7 天 API 调用趋势</h4>
                  <div className="flex items-end gap-2 h-32">
                    {(() => {
                      const last7Days: { date: string; apiCalls: number }[] = [];
                      for (let i = 6; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dateStr = d.toLocaleDateString('zh-CN');
                        const dayLogs = logs.filter(log => new Date(log.startedAt).toLocaleDateString('zh-CN') === dateStr);
                        const apiCalls = dayLogs.reduce((sum, log) => sum + (log.stats?.reduce((s, stat) => s + (stat.apiCalls || 0), 0) || 0), 0);
                        last7Days.push({ date: dateStr.slice(5), apiCalls }); // 只显示 MM-DD
                      }

                      const maxCalls = Math.max(...last7Days.map(d => d.apiCalls), 1);

                      return last7Days.map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-blue-500 rounded-t transition-all"
                            style={{
                              height: `${(day.apiCalls / maxCalls) * 100}%`,
                              minHeight: day.apiCalls > 0 ? '4px' : '0'
                            }}
                            title={`${day.date}: ${day.apiCalls} 次`}
                          />
                          <span className="text-xs text-muted-foreground">{day.date}</span>
                          <span className="text-xs font-medium">{day.apiCalls || '-'}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ========== 页面入口（用 Suspense 包裹）==========

export default function SyncPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <SyncPageContent />
    </Suspense>
  );
}
