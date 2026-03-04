# TinyShip 项目 - Claude AI 指导文档

本文档为 Claude AI 提供项目概览和可调用技能的说明，以便在协作开发中提供更精准的协助。

---

## 项目概述

**项目名称**: TinyShip 1.7.0

**项目类型**: SaaS 应用模板（Monorepo）

**技术栈**:
- 前端: Next.js 16 + React 19 / Nuxt.js 4 + Vue 3
- 后端: Better-Auth, Drizzle ORM, PostgreSQL
- UI: shadcn/ui, Tailwind CSS v4
- AI: Vercel AI SDK (支持 OpenAI、DeepSeek、Qwen、Fal.ai)

**项目定位**: 成熟商业模板，核心原则是 **能不改代码就不改代码，只替换资源**

---

## 本地技能 (Skills)

本项目有 3 个自定义技能，存放在 `.trae/Skills/` 目录下。

### ⚠️ 重要说明

这些技能 **不是** Claude Code 官方插件系统的一部分，无法通过 `Skill` 工具自动调用。

**调用方式**: 使用 `Read` 工具读取技能的 `SKILL.md` 文件，然后按照指示执行。

---

## 技能列表

### 1. frontend-design

**位置**: `.trae/Skills/frontend-design/SKILL.md`

**用途**: 创建高质量、生产级的前端界面

**触发场景**:
- 用户要求构建 Web 组件、页面、仪表盘
- 需要 React/Vue/HTML+CSS 代码
- 任何与 UI 设计、样式美化相关的任务

**核心特点**:
- 避免通用的 AI 审美（"AI slop"）
- 独特的字体选择（避免 Inter、Roboto）
- 大胆的美学方向：极简主义、复古未来、奢华精致、玩趣等
- 精致的动画和微交互
- 创造性布局：不对称、重叠、对角线流动、网格破坏

**调用方式**:
```
请先读取 .trae/Skills/frontend-design/SKILL.md
然后按照其中的 Frontend Aesthetics Guidelines 执行设计任务
```

---

### 2. prd-generator

**位置**: `.trae/Skills/prd-generator/SKILL.md`

**用途**: 生成符合 AI PM 最佳实践的产品需求文档

**触发场景**:
- 启动新功能或产品
- 需要为工程团队编写需求文档
- 准备利益相关者评审
- 记录复杂的 AI/ML 功能需求

**应用框架**:
- Jobs-to-be-Done (JTBD)
- SMART Goals
- RICE 优先级排序
- MoSCoW 方法
- RACI 矩阵
- AI Product Canvas

**输出内容**:
- 执行摘要
- 问题陈述
- 机会规模评估
- 成功指标
- 用户故事
- 功能需求
- 技术需求
- AI/ML 规范
- 用户体验
- 风险评估
- 发布计划
- 利益相关者矩阵

**调用方式**:
```
请先读取 .trae/Skills/prd-generator/SKILL.md
然后根据其中的框架和模板生成 PRD
```

---

### 3. md-to-lark-doc

**位置**: `.trae/Skills/md-to-lark-doc/`

**用途**: 将本地 Markdown 文件转换为飞书/ Lark 云文档

**触发场景**:
- 用户想要发布、上传本地 markdown 到飞书
- 将文档迁移到飞书平台

**功能**:
- 读取本地 Markdown 文件
- 调用飞书 API 将内容转换为文档块
- 创建新的飞书文档并上传内容
- 可添加协作者

**前置要求**:
- 飞书开放平台应用（App ID、App Secret）
- 启用 Docs 和 Drive 权限
- 配置环境变量或 `config.json`

**依赖**: `requirements.txt` 中的 Python 包

**调用方式**:
```bash
# 先安装依赖
pip install -r .trae/Skills/md-to-lark-doc/requirements.txt

# 然后运行转换
python .trae/Skills/md-to-lark-doc/convert_to_lark.py <markdown文件路径>
```

---

## 项目结构参考

```
tinyship-1.7.0/
├── .trae/
│   └── Skills/                    # 自定义技能目录（本仓库）
│       ├── frontend-design/
│       ├── prd-generator/
│       └── md-to-lark-doc/
├── apps/
│   ├── next-app/                  # Next.js 应用（React）端口 7001
│   ├── nuxt-app/                  # Nuxt.js 应用（Vue）端口 7001
│   └── docs-app/                  # 文档站点
├── libs/                          # 共享核心逻辑
├── config/                        # 全局配置
├── .cursorrules                   # 项目开发规范（重要！）
└── claude.md                      # 本文档
```

---

## 开发原则（来自 .cursorrules）

### 零风险铁律
1. **结构锁死** - 严禁重构文件夹结构
2. **授权优先** - 修改逻辑前必须警告用户
3. **修改留痕** - 添加注释说明修改原因
4. **升级保护** - 使用 `[KEEP-MY-CHANGE]` 标记个性化修改

### 代码组织规范（AI 协作友好）
1. **文件行数限制** - 单个文件控制在 **800 行以内**，最大不超过 1000 行
2. **模块拆分** - 复杂逻辑拆分为多个小模块，每个模块职责单一
3. **段落清晰** - 使用注释分隔符标记代码段落，如 `// ========== 同步服务 ==========`
4. **类型独立** - 类型定义放在单独的 `types.ts` 文件中
5. **常量集中** - 常量和配置放在文件顶部或单独的 `constants.ts`

### 安全修改区域
| 类型 | 位置 |
|------|------|
| Logo/图片 | `apps/next-app/public/` |
| 文案翻译 | `libs/i18n/locales/zh-CN.ts` |
| 配置 | `config.ts`, `.env` |

### 核心禁区（除非用户明确要求）
- `libs/auth/` - 认证系统
- `libs/payment/` - 支付系统
- `libs/database/` - 数据库层

---

## 常用命令

```bash
# 开发
pnpm dev:next      # Next.js 开发模式
pnpm dev:nuxt      # Nuxt.js 开发模式

# 数据库
pnpm db:push       # 推送 schema 到数据库
pnpm db:studio     # 打开 Drizzle Studio

# 构建
pnpm build:next    # 构建 Next.js
pnpm build:nuxt    # 构建 Nuxt.js
```

---

## 与 Claude 协作建议

1. **阅读本文档** - 每次会话开始时，我会先查看 `claude.md`
2. **使用技能** - 当任务匹配技能描述时，我会先读取技能文档再执行
3. **遵循规范** - 严格遵守 `.cursorrules` 中的开发原则
4. **中文交流** - 用中文解释技术问题，保持通俗易懂
5. **修改前确认** - 任何代码逻辑修改前，先征求用户同意

---

*文档创建时间: 2025-02-07*
*项目版本: TinyShip 1.7.0*
