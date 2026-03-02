# TinyShip 项目文档

> 最后更新：2026-03-02
> 项目版本：TinyShip 1.7.0

---

## 文档目录

```
docs/
├── README.md                    # 本文件 - 文档索引
│
├── setup/                       # 🚀 项目搭建与配置
│   └── 01-Supabase数据库连接.md  # Supabase 数据库连接完整指南
│
├── implementation/              # 🔧 技术实现文档
│   ├── auth-middleware-design.md
│   ├── build-verification.md
│   ├── configuration-system.md
│   └── configuration-system.en.md
│
└── user-guide/                  # 📖 用户使用指南
    ├── basic-config.md
    ├── best-practices.md
    ├── captcha.md
    ├── credits.md
    ├── ai/
    │   ├── chat.md
    │   └── image.md
    ├── auth/
    │   ├── overview.md
    │   ├── email.md
    │   ├── github.md
    │   ├── google.md
    │   ├── sms.md
    │   └── wechat.md
    └── deployment/
        ├── overview.md
        ├── cloud.md
        └── docker.md
```

---

## 快速导航

### 🚀 新手入门

| 文档 | 说明 | 状态 |
|------|------|------|
| [Supabase 数据库连接](./setup/01-Supabase数据库连接.md) | 连接 Supabase PostgreSQL 数据库的完整流程 | ✅ 已完成 |

### 🔧 技术实现

| 文档 | 说明 |
|------|------|
| [认证中间件设计](./implementation/auth-middleware-design.md) | Auth 中间件的设计思路 |
| [构建验证](./implementation/build-verification.md) | 项目构建验证流程 |
| [配置系统](./implementation/configuration-system.md) | 配置系统架构说明 |

### 📖 功能指南

| 分类 | 文档 |
|------|------|
| 基础配置 | [基本配置](./user-guide/basic-config.md) |
| 最佳实践 | [最佳实践](./user-guide/best-practices.md) |
| 认证系统 | [认证概述](./user-guide/auth/overview.md) |
| AI 功能 | [AI 聊天](./user-guide/ai/chat.md) · [AI 图像](./user-guide/ai/image.md) |
| 部署 | [部署概述](./user-guide/deployment/overview.md) · [Docker](./user-guide/deployment/docker.md) |

---

## 文档编写规范

### 命名规则

- **setup/** - 项目搭建相关文档，按步骤编号：`01-xxx.md`, `02-xxx.md`
- **implementation/** - 技术实现文档，使用英文小写 + 连字符
- **user-guide/** - 用户指南，按功能模块分类

### 文档格式

每个文档应包含：
1. 标题和概述
2. 创建/更新时间
3. 步骤说明（如有）
4. 代码示例
5. 故障排除（如适用）
6. 总结

---

## 更新日志

| 日期 | 文档 | 变更 |
|------|------|------|
| 2026-03-02 | setup/01-Supabase数据库连接.md | 新增：Supabase 数据库连接完整指南 |
| 2026-03-02 | README.md | 新增：文档目录索引 |

---

*本文档会随着项目进展持续更新*
