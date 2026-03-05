# Vercel 构建预渲染错误修复记录

本文档记录了 TinyShip 项目在 Vercel 部署时遇到的预渲染错误及其解决方案。

## 问题描述

### 错误现象

在 Vercel 部署时，构建过程在预渲染 `/en/payments` 页面时失败：

```
Error occurred prerendering page "/en/payments". Read more: https://nextjs.org/docs/messages/prerender-error
Export encountered an error on /[lang]/payments/page: /en/payments, exiting the build.
⨯ Next.js build worker exited with code: 1 and signal: null
```

### 错误原因分析

经过深入分析，发现问题的根本原因是：

1. **环境变量缺失导致配置模块抛出错误**
   - `config/app.baseUrl` getter 在构建时被访问
   - `requireEnvForService` 函数在生产环境构建时，如果环境变量缺失会抛出错误
   - Vercel 构建环境中可能没有设置所有必需的环境变量

2. **数据库连接在模块加载时被初始化**
   - `libs/database/client.ts` 和 `libs/database/index.ts` 在模块导入时就创建了数据库连接池
   - Next.js 在预渲染时会导入这些模块
   - 在构建环境中，数据库可能不可访问或环境变量缺失

## 解决方案

### 1. 修改环境变量处理逻辑

**文件**: `config/utils.ts`

增强 `requireEnvForService` 函数，支持检测 Vercel 构建环境：

```typescript
/**
 * Get environment variables for required services with development defaults
 */
export function requireEnvForService(key: string, service: string, devDefault?: string): string {
  const value = getEnv(key);
  if (!value) {
    // In development, use default values if provided
    if (process.env.NODE_ENV === 'development' && devDefault) {
      console.warn(`Warning: Using default value for ${key} in development. Set ${key} in .env file for production.`);
      return devDefault;
    }
    // During build time or when NEXT_PHASE is build, return a placeholder to avoid build failures
    // Vercel sets NEXT_PHASE=phase-production-build during build
    const isBuildTime = process.env.BUILD_TIME === 'true' ||
                        process.env.NEXT_PHASE === 'phase-production-build' ||
                        process.env.VERCEL === '1' && !process.env.VERCEL_URL;

    if (isBuildTime) {
      console.warn(`Warning: Missing ${key} for ${service} service during build. This will be validated at runtime.`);
      return devDefault || `__BUILD_TIME_PLACEHOLDER_${key}__`;
    }
    // If devDefault is provided, use it as fallback even in production
    if (devDefault) {
      console.warn(`Warning: Using fallback value for ${key} in ${service}. Set ${key} in environment variables.`);
      return devDefault;
    }
    throw new Error(`Missing required environment variable: ${key} for ${service} service. This service is required for the application to function.`);
  }
  return value;
}
```

**关键改进**：
- 检测 Vercel 构建环境 (`NEXT_PHASE=phase-production-build`)
- 在构建时返回占位符而非抛出错误
- 提供更好的回退机制

### 2. 数据库连接延迟初始化

**文件**: `libs/database/client.ts`

使用 **Proxy 模式** 实现延迟初始化：

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';

// 检查是否在构建时（Vercel 构建阶段或没有数据库 URL）
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    (process.env.VERCEL === '1' && !process.env.DATABASE_URL);

// 延迟初始化连接池，避免在构建时创建连接
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return _pool;
}

function getDb() {
  if (!_db) {
    _db = drizzle(getPool());
  }
  return _db;
}

// 创建一个空的数据库操作对象，用于构建时
function createNoOpDb() {
  return new Proxy({} as ReturnType<typeof drizzle>, {
    get(target, prop) {
      // 返回一个异步函数，返回空数组或 undefined
      return async (...args: any[]) => {
        console.warn(`Warning: Attempting to use database method "${String(prop)}" during build time.`);
        return Array.isArray(args[0]) ? [] : undefined;
      };
    }
  });
}

// 导出数据库连接池（延迟初始化）
export const pool = isBuildTime
  ? ({} as Pool)
  : new Proxy({} as Pool, {
      get(target, prop) {
        const actualPool = getPool();
        const value = actualPool[prop as keyof Pool];
        if (typeof value === 'function') {
          return value.bind(actualPool);
        }
        return value;
      }
    });

// 导出 Drizzle 客户端（延迟初始化）
export const db = isBuildTime
  ? createNoOpDb()
  : new Proxy({} as ReturnType<typeof drizzle>, {
      get(target, prop) {
        const actualDb = getDb();
        const value = actualDb[prop as keyof typeof actualDb];
        if (typeof value === 'function') {
          return value.bind(actualDb);
        }
        return value;
      }
    });
```

**关键改进**：
- 使用 Proxy 延迟初始化数据库连接
- 在构建时返回空操作对象，避免实际连接
- 运行时按需创建连接

### 3. 更新数据库模块入口

**文件**: `libs/database/index.ts`

移除直接的数据库连接创建，使用延迟导入：

```typescript
import * as schema from './schema';

// 检查是否在构建时
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    (process.env.VERCEL === '1' && !process.env.DATABASE_URL);

// 导出数据库客户端（从 client.ts 导入，它已经处理了构建时的情况）
export * from "./client";

// 导出所有模式
export * from './schema';

// 导出查询构建器（延迟初始化）
export const query = {
  user: {
    findFirst: async (params: { where: any }) => {
      if (isBuildTime) {
        console.warn('Warning: Attempting to query database during build time.');
        return null;
      }
      const { db } = await import('./client');
      const result = await db.select().from(schema.user).where(params.where).limit(1);
      return result[0];
    }
  },
  order: {
    findFirst: async (params: { where: any }) => {
      if (isBuildTime) {
        console.warn('Warning: Attempting to query database during build time.');
        return null;
      }
      const { db } = await import('./client');
      const result = await db.select().from(schema.order).where(params.where).limit(1);
      return result[0];
    }
  }
};
```

## Vercel 环境变量配置

确保在 Vercel 项目设置中配置以下环境变量：

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `APP_BASE_URL` | 应用的基础 URL | `https://your-app.vercel.app` |
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://user:password@host:5432/database` |
| `BETTER_AUTH_SECRET` | 认证密钥 | 随机生成的 32 字符字符串 |

### 可选的环境变量（根据功能需求）

| 变量名 | 说明 |
|--------|------|
| `AIRTABLE_API_KEY` | Airtable API 密钥 |
| `AIRTABLE_BASE_ORDER` | Airtable 订单 Base ID |
| `STRIPE_SECRET_KEY` | Stripe 支付密钥 |

### 配置步骤

1. 进入 Vercel Dashboard
2. 选择项目 → **Settings** → **Environment Variables**
3. 添加上述环境变量
4. 确保环境选择为 **Production**、**Preview** 和 **Development**

## 技术要点总结

### 1. 构建时与运行时分离

- **问题**：Next.js 在构建时会预渲染静态页面，这会触发模块导入
- **解决**：检测构建环境，在构建时返回占位符或空操作对象

### 2. 延迟初始化模式

- **问题**：数据库连接在模块导入时立即创建
- **解决**：使用 Proxy 模式延迟初始化，只在真正需要时创建连接

### 3. 环境检测

检测 Vercel 构建环境的多种方式：

```typescript
const isBuildTime =
  process.env.BUILD_TIME === 'true' ||                    // 手动设置
  process.env.NEXT_PHASE === 'phase-production-build' ||  // Vercel 构建阶段
  (process.env.VERCEL === '1' && !process.env.DATABASE_URL); // Vercel 环境但无数据库
```

## 相关文件

- `config/utils.ts` - 环境变量处理工具
- `libs/database/client.ts` - 数据库客户端
- `libs/database/index.ts` - 数据库模块入口
- `config.ts` - 应用配置

## 修复日期

- **日期**: 2026-03-05
- **版本**: TinyShip 1.7.0
- **修复人**: Claude AI Assistant

---

*此文档记录了 Vercel 部署构建错误的完整修复过程，供后续参考和类似问题排查使用。*
