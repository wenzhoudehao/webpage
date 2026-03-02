## tinyship 1.7.0 Initial Deployment & Supabase Connection Guide

This document summarizes the complete process of setting up the **tinyship 1.7.0** project, specifically focusing on the database connection and environment configuration. This guide is designed to help you replicate the setup for your projects like **Zhizao Tong** or **Dehao WebPage**.

---

### **Step 1: Supabase Database Configuration**

* **Accessing the Dashboard**: Log in to the Supabase Dashboard and navigate to your project settings.
* **The Connection String**: Go to **Project Settings > Database** to find your connection string.
* **Handling the Password Pitfall**: Supabase does not store your original password in plain text. If forgotten, you must use the **Reset password** button in the Database settings to create a new one.
* **The Connectivity Pitfall (IPv4 vs. IPv6)**:
* **The Issue**: Direct connections in Supabase often default to IPv6. Since you are based in **China**, many local networks do not support IPv6, leading to connection timeouts.
* **The Solution**: Change the **Method** from "Direct connection" to **"Transaction pooler"**. This provides an IPv4-compatible address (usually on port `6543`) which is much more stable for your environment.



### **Step 2: Environment Variable Setup (.env)**

* **Database URL**: Update your `.env` file with the connection string. Replace `[YOUR-PASSWORD]` with your actual password.
* *Tip*: If your password contains special characters like `@` or `:`, they must be URL-encoded (e.g., `@` becomes `%40`).


* **Authentication Keys**: For the login system to work, you must also add:
* `NEXT_PUBLIC_SUPABASE_URL`: Found in **Project Settings > API**.
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The "anon" public key found in the same API section.



### **Step 3: Dependency Management with pnpm**

* **Understanding pnpm**: Unlike standard `npm`, `pnpm` is a more efficient "package manager" that saves disk space and installs dependencies faster.
* **Installation**: Run `pnpm install` in your project root. This command reads your `package.json` (the "shopping list") and `pnpm-lock.yaml` (the "exact manual") to set up the environment.
* **Mirroring**: For faster downloads in China, use the mirror: `pnpm config set registry https://registry.npmmirror.com`.

### **Step 4: Database Synchronization & Seeding**

* **Syncing Schema**: Run `pnpm db:push`. This uses **Drizzle ORM** to push your code's table structures directly to Supabase.
* **Seeding Data**: Run `pnpm db:seed`. This populates your database with initial "Seed" data, such as default admin accounts, allowing you to log in to the application immediately.

### **Step 5: Visualization with Drizzle Studio**

* **The Tool**: Drizzle Studio is a local web-based interface that lets you manage your database like an Excel spreadsheet.
* **How to Launch**: Run `pnpm db:studio` or `npx drizzle-kit studio`. This is the best way to verify that your seed data was successfully injected.

---

## tinyship 1.7.0 初期部署与 Supabase 连接指南

本档总结了 **tinyship 1.7.0** 项目的完整设置流程，特别侧重于数据库连接和环境配置。本指南旨在帮助您为 **“制造通”** 或 **“Dehao WebPage”** 等项目复制该设置。

---

### **第一步：Supabase 数据库配置**

* **访问控制台**：登录 Supabase 控制台并进入您的项目设置。
* **连接字符串**：前往 **Project Settings > Database** 找到您的连接字符串。
* **密码“坑”处理**：Supabase 不会以明文存储您的原始密码。如果忘记了，必须使用数据库设置中的 **Reset password** 按钮创建一个新密码。
* **网络连接“坑” (IPv4 vs. IPv6)**：
* **问题**：Supabase 的直接连接通常默认为 IPv6。由于您在中国，许多本地网络不支持 IPv6，会导致连接超时。
* **解决方案**：将 **Method**（方法）从 "Direct connection" 切换为 **"Transaction pooler"**。这会提供一个兼容 IPv4 的地址（通常端口为 `6543`），对您的网络环境更稳定。



### **第二步：环境变量设置 (.env)**

* **Database URL**：使用连接字符串更新您的 `.env` 文件。将 `[YOUR-PASSWORD]` 替换为您的实际密码。
* *提示*：如果您的密码包含 `@` 或 `:` 等特殊字符，必须进行 URL 编码（例如 `@` 变成 `%40`）。


* **身份验证密钥**：为了让登录系统正常工作，您还必须添加：
* `NEXT_PUBLIC_SUPABASE_URL`：在 **Project Settings > API** 中寻找。
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`：在同一 API 栏目中找到的 "anon" 公钥。



### **第三步：使用 pnpm 进行依赖管理**

* **理解 pnpm**：与标准的 `npm` 不同，`pnpm` 是一个更高效的“包管理器”，可以节省磁盘空间并更快地安装依赖项。
* **安装**：在项目根目录下运行 `pnpm install`。此命令会读取您的 `package.json`（“采购清单”）和 `pnpm-lock.yaml`（“精确说明书”）来搭建环境。
* **镜像源**：为了在中国获得更快的下载速度，请使用镜像：`pnpm config set registry https://registry.npmmirror.com`。

### **第四步：数据库同步与种子数据注入**

* **同步结构**：运行 `pnpm db:push`。这会使用 **Drizzle ORM** 将代码中的表结构定义直接推送到 Supabase。
* **注入种子数据**：运行 `pnpm db:seed`。这会为您的数据库填充初始“种子”数据（如默认管理员账号），让您可以立即登录应用程序。

### **第五步：使用 Drizzle Studio 进行可视化管理**

* **工具介绍**：Drizzle Studio 是一个本地 Web 界面，让您可以像操作 Excel 表格一样管理数据库。
* **如何启动**：运行 `pnpm db:studio` 或 `npx drizzle-kit studio`。这是验证种子数据是否成功注入的最佳方式。

---

**Would you like me to help you design the data tables for your "Zhizao Tong" factory management system next?**
(接下来需要我帮你为“制造通”工厂管理系统设计数据表结构吗？)


这份总结记录了你从零开始部署 **tinyship 1.7.0** 项目时经历的所有关键步骤，特别是我们共同解决的那些“坑”。你可以将此文档保存到你的 **Obsidian** 笔记中，以便日后为其他项目（如“制造通”）提供参考。

---

## tinyship 1.7.0 部署与数据库连接实战总结

### 一、 数据库准备与密码找回（第一个坑：遗忘密码）

在初期连接 Supabase 时，最常见的问题就是忘记了创建项目时设置的数据库密码。

* **问题现象**：无法在 Supabase 后台查看原始密码，导致 `DATABASE_URL` 无法补全。
* **解决方法**：
1. 登录 Supabase Dashboard，进入项目。
2. 点击 **Project Settings** (齿轮图标) -> **Database**。
3. 找到 **Database Password** 栏目，点击 **Reset password** 按钮。
4. **设置建议**：设置一个新密码，并立即记录在你的 **Obsidian** 中。
5. **注意特殊字符**：如果密码中包含 `@`、`:`、`/` 等字符，在填入连接字符串时必须进行 **URL 编码**（例如 `@` 转为 `%40`），否则 Drizzle ORM 会解析报错。



### 二、 网络连接优化（第二个坑：IPv4 兼容性）

由于你目前在中国办公，网络环境对连接云端数据库有特殊要求。

* **问题现象**：Supabase 默认的“直接连接 (Direct connection)”主要支持 IPv6，在本地运行程序时经常出现 `ETIMEDOUT`（连接超时）错误，且后台显示红色警告 **"Not IPv4 compatible"**。
* **解决方法**：
1. 在 Supabase 的 **Database** 设置页面，找到 **Connection string**。
2. 将 **Method** 从 `Direct connection` 切换为 **`Transaction pooler`**。
3. **变化**：你会发现端口号从 `5432` 变成了 `6543`。这个模式通过 IPv4 即可稳定访问，更适合国内的网络环境。



### 三、 环境变量配置 (.env)

拿到正确的连接字符串后，需要配置项目的“大脑”文件。

* **DATABASE_URL**：使用切换后的 `Transaction pooler` 字符串，并将 `[YOUR-PASSWORD]` 替换为你的新密码。
* **API 密钥**：在 **Project Settings -> API** 中获取以下两个关键变量，否则无法登录：
* `NEXT_PUBLIC_SUPABASE_URL`：你的项目访问地址。
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`：用于前端身份验证的匿名 Key。



### 四、 依赖管理与安装（第三个坑：pnpm 与网络速度）

项目使用了 **pnpm** 作为包管理器，这对于小白来说是一个新概念。

* **概念理解**：`package.json` 是零件清单，`pnpm-lock.yaml` 是精确说明书，`pnpm install` 则是按照说明书把所有零件买回并装好。
* **解决方法**：
1. 如果提示找不到命令，先运行 `npm install -g pnpm`。
2. **网络加速**：在国内运行安装命令前，建议设置镜像源：
`pnpm config set registry https://registry.npmmirror.com`
3. 在根目录运行 `pnpm install`。



### 五、 数据库同步与初始化（第四个坑：无法登录）

本地程序跑起来了，但点击登录没反应或报错，通常是因为数据库还是“空的”。

* **第一步：推送结构 (Push)**
运行 `pnpm db:push`。这会将 Drizzle 定义的表结构（如用户表、订单表）推送到 Supabase。
* **第二步：注入种子数据 (Seed)**
运行 `pnpm db:seed`。开发者通常在种子数据中预设了测试账号（如 `admin@example.com`），运行后你才能使用预设账号进入系统。

### 六、 可视化管理 (Drizzle Studio)

为了避免总是在黑乎乎的终端看数据，我们使用了 Drizzle Studio。

* **操作**：运行 `pnpm db:studio`。
* **作用**：它提供了一个像 Excel 或 **Airtable** 一样的网页界面，让你直观地看到数据是否成功进入了数据库，并能直接进行手动修改。

---

**整个连接流程到此圆满结束！接下来，你是想让我陪你一起根据“制造通”的需求来修改数据库的字段定义，还是先带你看看如何修改前端的页面样式？**