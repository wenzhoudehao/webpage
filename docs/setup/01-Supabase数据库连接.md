# TinyShip 连接 Supabase 数据库完整指南

> 文档创建时间：2026-03-02
> 项目版本：TinyShip 1.7.0

---

## 一、概述

本文档记录了将 TinyShip 项目连接到 Supabase PostgreSQL 数据库的完整流程。

### 技术栈

| 组件 | 技术 |
|------|------|
| 数据库 | Supabase PostgreSQL |
| ORM | Drizzle ORM |
| 连接方式 | Transaction Pooler（连接池） |

---

## 二、Supabase 准备工作

### 2.1 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目，记录以下信息：
   - 项目名称
   - 数据库密码（**重要：请妥善保管**）
   - 区域（建议选择离用户最近的区域）

### 2.2 获取数据库连接字符串

1. 打开 Supabase Dashboard
2. 进入 **Project Settings** → **Database**
3. 找到 **Connection string** 部分
4. 选择 **Transaction Pooler**（推荐用于 Serverless 应用）
5. 复制连接字符串格式：

```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres
```

### 2.3 连接方式对比

| 连接类型 | 地址格式 | 端口 | 适用场景 |
|----------|----------|------|----------|
| Direct Connection | `db.xxx.supabase.co` | 5432 | 长连接、迁移脚本 |
| Transaction Pooler | `pooler.supabase.com` | 6543 | Serverless、短连接（**推荐**） |
| Session Pooler | `pooler.supabase.com` | 6543 | 需要预备语句的场景 |

---

## 三、项目配置

### 3.1 环境变量配置

编辑项目根目录下的 `.env` 文件：

```env
# ================================
# Supabase 数据库配置（必填）
# ================================
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres"

# ================================
# 认证配置（必填）
# ================================
BETTER_AUTH_SECRET="your-random-secret-key-minimum-32-characters-long"
BETTER_AUTH_URL="http://localhost:7001"

# ================================
# 应用配置
# ================================
APP_BASE_URL=http://localhost:7001
```

**注意事项：**
- 密码中如果包含特殊字符（如 `@`、`#`、`%`），需要进行 URL 编码
- 不要在密码周围添加方括号或其他符号

### 3.2 Drizzle 配置

项目已预配置好 `drizzle.config.ts`：

```typescript
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL 环境变量未设置");
}

export default defineConfig({
  schema: "./libs/database/schema/*",
  out: "./libs/database/drizzle",
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
})
```

---

## 四、数据库初始化

### 4.1 安装依赖

```bash
pnpm install
```

### 4.2 推送数据库 Schema

将项目的数据库结构推送到 Supabase：

```bash
pnpm db:push
```

此命令会创建以下表（根据项目 schema）：
- `user` - 用户表
- `account` - 账户表
- `session` - 会话表
- `verification` - 验证表
- 以及其他业务相关表...

### 4.3 填充测试数据（可选）

创建初始测试用户：

```bash
pnpm db:seed
```

**测试账户信息：**

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | admin123 |
| 普通用户 | user@example.com | user123456 |

---

## 五、常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev:next` | 启动 Next.js 开发服务器（端口 7001） |
| `pnpm dev:nuxt` | 启动 Nuxt.js 开发服务器（端口 7001） |
| `pnpm db:push` | 推送 schema 到数据库 |
| `pnpm db:studio` | 启动 Drizzle Studio 可视化管理界面 |
| `pnpm db:seed` | 填充测试数据 |

---

## 六、数据库管理工具

### 6.1 Drizzle Studio

启动可视化数据库管理界面：

```bash
pnpm db:studio
```

访问地址：https://local.drizzle.studio

功能：
- 浏览所有数据库表
- 查看、编辑、删除记录
- 执行 SQL 查询

### 6.2 Supabase Dashboard

直接在 Supabase 控制台管理数据库：
1. 打开项目 Dashboard
2. 进入 **Table Editor** 查看和编辑数据
3. 进入 **SQL Editor** 执行 SQL 查询

---

## 七、架构说明

### 7.1 TinyShip 与 Supabase 的关系

```
┌─────────────────────────────────────────────────────────┐
│                     TinyShip 应用                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Better-Auth│  │ Drizzle ORM │  │  Storage    │     │
│  │  (认证)     │  │  (数据库)   │  │  (S3/OSS)   │     │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘     │
└─────────┼────────────────┼─────────────────────────────┘
          │                │
          │                ▼
          │     ┌─────────────────────┐
          │     │   Supabase          │
          │     │   PostgreSQL        │
          │     │   (仅使用数据库)     │
          │     └─────────────────────┘
          │
          ▼
   不使用 Supabase Auth
   （使用 Better-Auth）
```

### 7.2 为什么选择这种架构？

| Supabase 功能 | TinyShip 方案 | 说明 |
|---------------|---------------|------|
| PostgreSQL | ✅ 使用 | 核心数据库 |
| Auth | Better-Auth | 更灵活的自托管认证 |
| Storage | S3/OSS/COS | 支持多种云存储 |
| Realtime | 按需集成 | 可选功能 |
| Edge Functions | Vercel/Node.js | 应用层实现 |

---

## 八、故障排除

### 8.1 密码认证失败

**错误信息：** `password authentication failed for user "postgres"`

**解决方案：**
1. 检查密码是否正确
2. 确保密码没有多余的方括号或符号
3. 检查密码中的特殊字符是否需要 URL 编码

### 8.2 连接超时

**可能原因：**
1. 网络问题
2. Supabase 项目处于暂停状态（免费版 7 天不活动会暂停）

**解决方案：**
1. 检查网络连接
2. 在 Supabase Dashboard 激活项目

### 8.3 SSL 连接问题

如果遇到 SSL 相关错误，可以尝试在连接字符串后添加参数：

```
?sslmode=require
```

---

## 九、安全建议

1. **不要提交 .env 文件** - 已在 `.gitignore` 中排除
2. **使用强密码** - 数据库密码应足够复杂
3. **定期轮换密钥** - 定期更新 `BETTER_AUTH_SECRET`
4. **限制数据库访问** - 在 Supabase 中配置 IP 白名单（生产环境）
5. **启用 Row Level Security** - 如果直接使用 Supabase 客户端

---

## 十、总结

完成以上步骤后，TinyShip 项目已成功连接到 Supabase 数据库：

- ✅ 环境变量配置完成
- ✅ 数据库 Schema 已推送
- ✅ 测试用户已创建
- ✅ 开发服务器可正常启动
- ✅ Drizzle Studio 可视化管理可用

**下一步：**
- 配置 OAuth 登录（可选）
- 配置支付系统（可选）
- 配置 AI 功能（可选）
- 开始业务开发

---

*文档结束*
