# TinyShip Vercel 部署配置指南

> 创建时间：2026-02-11
> 状态：待完成

---

## 📋 配置步骤清单

- [ ] **第一步：推送到 GitHub**
- [ ] **第二步：在 Vercel 创建项目**
- [ ] **第三步：创建 Vercel Postgres 数据库**
- [ ] **第四步：配置本地 .env 连接 Vercel Postgres**
- [ ] **第五步：初始化数据库表**
- [ ] **第六步：本地调试测试**
- [ ] **第七步：配置 Vercel 环境变量并正式部署**

---

## 第一步：推送到 GitHub

```bash
cd F:\VibeCoding\tinyship-1.7.0

# 添加所有文件并提交
git add .
git commit -m "Initial commit: TinyShip 1.7.0"
git push -u origin main
```

> 现有远程仓库：`git@github-sales1:wenzhoudehao/webpage.git`

---

## 第二步：在 Vercel 创建项目

1. 登录 [Vercel.com](https://vercel.com)（用 GitHub 账号）
2. 点击 **Add New** → **Project**
3. 选择你的 GitHub 仓库并导入
4. 点击 **Deploy**（先不配置环境变量）

---

## 第三步：创建 Vercel Postgres 数据库

1. 在 Vercel 项目中点击 **Storage** 标签
2. 点击 **Create Database** → **Postgres**
3. 选择 **Hobby（免费）** 计划
4. 选择区域（推荐：Singapore 或 Tokyo）
5. 等待创建完成

---

## 第四步：配置本地 .env 连接 Vercel Postgres

1. 在 Vercel 的 Storage 页面，点击 **.env.local** 标签
2. 复制 `POSTGRES_URL` 的值，格式类似：
   ```
   postgresql://xxx:xxx@aws-0-ap-southeast-1.pooler.supabase.com:6543/vercel-postgres
   ```
3. 更新本地 `.env` 文件：
   ```env
   DATABASE_URL="你复制的POSTGRES_URL"
   ```

---

## 第五步：初始化数据库表

```bash
cd F:\VibeCoding\tinyship-1.7.0
pnpm db:push
```

---

## 第六步：本地调试测试

```bash
# 启动本地开发
pnpm dev:next    # Next.js
# 或
pnpm dev:nuxt    # Nuxt.js
```

现在本地会直接连接 Vercel Postgres，可以正常调试了。

---

## 第七步：配置 Vercel 环境变量并正式部署

在 Vercel 项目设置中添加环境变量：

```env
# 应用地址
APP_BASE_URL=https://你的项目名.vercel.app

# 数据库（Vercel 自动注入，直接引用）
DATABASE_URL=${POSTGRES_URL}

# 认证密钥（需要自己生成一个32位以上的随机字符串）
BETTER_AUTH_SECRET=your-random-secret-key-minimum-32-characters-long

# 认证URL
BETTER_AUTH_URL=https://你的项目名.vercel.app
```

然后重新部署项目。

---

## 📝 重要说明

### 数据库选择

- ✅ **Vercel Postgres** - 本教程使用，与 Vercel 深度集成
- ✅ **Supabase** - 备选方案，存储空间更大（500MB）

### 认证系统

TinyShip 使用 **Better-Auth**，不依赖数据库提供商的认证系统。
无论选择 Vercel Postgres 还是 Supabase，登录功能都一样工作。

### 本地开发

本地开发直接连接云端数据库（Vercel Postgres 或 Supabase），
无需在本地安装 PostgreSQL。

---

## 🔗 相关链接

- Vercel: https://vercel.com
- 项目文档: ./docs/user-guide/
- 数据库说明: ./libs/database/README.md

---

*明天继续配置时，从第一步开始执行即可！*
