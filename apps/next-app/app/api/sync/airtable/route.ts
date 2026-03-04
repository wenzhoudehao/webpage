/**
 * Airtable 同步 API 路由
 *
 * POST /api/sync/airtable - 触发 Airtable → Supabase 同步
 * GET /api/sync/airtable - 获取同步历史
 *
 * 权限要求：管理员
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@libs/auth';
import { airtableSyncService, type SyncOptions } from '@libs/airtable';
import { can, Action, Subject, Role } from '@libs/permissions';
import { db } from '@libs/database';
import { syncLog } from '@libs/database/schema/sync-log';
import { desc } from 'drizzle-orm';

/**
 * 验证用户是否为管理员
 */
async function verifyAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  // 使用权限系统验证管理员权限
  // 参考 authMiddleware.ts 的实现方式
  const appUser = {
    ...session.user,
    role: (session.user.role as Role) || Role.NORMAL,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasPermission = can(appUser as any, Action.MANAGE, Subject.ALL);

  if (!hasPermission) {
    return { authorized: false, error: 'Forbidden: Admin access required', status: 403 };
  }

  return { authorized: true, user: session.user };
}

/**
 * POST /api/sync/airtable
 * 触发 Airtable 数据同步
 *
 * Request Body (可选):
 * - fullSync: boolean - 是否全量同步（默认增量）
 * - tables: ('po' | 'payment' | 'verification')[] - 指定要同步的表
 * - view: string - Airtable View 名称
 *
 * Response:
 * - success: boolean
 * - stats: SyncStats[]
 * - totalDuration: number
 * - errors: string[]
 * - syncedAt: Date
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证管理员权限
    const authResult = await verifyAdmin();
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // 2. 解析请求体
    let options: SyncOptions = {};
    try {
      const body = await request.json();
      options = {
        fullSync: body.fullSync,
        tables: body.tables,
        view: body.view,
      };
    } catch {
      // 请求体为空时使用默认选项
    }

    console.log('[Airtable Sync] Starting sync with options:', options);

    // 3. 执行同步
    const result = await airtableSyncService.syncAll(options);

    console.log('[Airtable Sync] Sync completed:', {
      success: result.success,
      totalDuration: result.totalDuration,
      errors: result.errors.length,
    });

    // 4. 返回结果
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('[Airtable Sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/airtable
 * 获取同步历史
 *
 * Response:
 * - logs: SyncLog[]
 * - lastSyncTime: Date | null
 */
export async function GET() {
  try {
    // 1. 验证管理员权限
    const authResult = await verifyAdmin();
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // 2. 获取最近 20 条同步日志
    const logs = await db
      .select()
      .from(syncLog)
      .orderBy(desc(syncLog.startedAt))
      .limit(20);

    // 3. 获取上次同步时间
    const lastSyncTime = await airtableSyncService.getLastSyncTime();

    // 4. 返回结果
    return NextResponse.json({
      logs,
      lastSyncTime,
    });
  } catch (error) {
    console.error('[Airtable Sync] Error getting status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
