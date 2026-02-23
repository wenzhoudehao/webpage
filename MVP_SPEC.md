# MVP Build Plan: Dehao Workspace (德皓内部系统)

## 1. Goal (目标)
将 TinyShip 模板改造为“德皓 (Dehao)”团队专用的内部业务门户。
**核心价值**：
1. **统一入口**：员工登录后，在一个界面内处理业务。
2. **数据源**：集成 Airtable 视图，作为 ERP 核心数据展示。
3. **权限控制**：利用积分系统实现“邀请制/白名单”，未获授权无法查看数据。

## 2. Current Status (当前状态)
- 基础代码：TinyShip Next.js 版 (保留)
- 品牌状态：目前是 TinyShip 默认模板
- 部署环境：本地 Windows 10 (localhost)

## 3. Implementation Steps (执行步骤)
> 每完成一步，请在 [ ] 里打 x，并向用户汇报。

- [ ] **Phase 1: 瘦身与品牌化 (Clean & Brand)**
  - **任务 A (瘦身)**：
    - 删除 `apps/nuxt-app` (Vue版本) 及其相关依赖，只保留 Next.js 版本。
    - 确保 `pnpm dev:next` 依然能正常启动。
  - **任务 B (更名)**：
    - 全局修改 App 名称为 **"Dehao Workspace"**。
    - 优先修改 `config.ts` 中的 `appName` 和 `siteName`。
    - 修改 `libs/i18n/locales/zh-CN.ts` 中的相关文案。
  - **任务 C (Logo)**：
    - 将 `apps/next-app/public/logo.svg` 替换为包含 "Dehao" 文字的简单 SVG。

- [ ] **Phase 2: 核心工作台改造 (The Dashboard)**
  - **任务 A (清空)**：
    - 找到 `apps/next-app/app/[lang]/(root)/dashboard/page.tsx`。
    - 清空原有的演示图表（Charts/Stats）。
  - **任务 B (嵌入 Airtable)**：
    - 引入全屏 `<iframe>` 组件。
    - **关键配置**：
      - `src` 属性必须读取环境变量 `NEXT_PUBLIC_AIRTABLE_EMBED_URL`。
      - 样式：`width: 100%`, `height: calc(100vh - 80px)` (铺满屏幕)。
      - 边框：`border: none`。
    - **操作提示**：提醒用户在 `.env` 文件中填入 Airtable 的 Share View URL。

- [ ] **Phase 2.5: 访问门禁 (Access Gate)**
  - **任务**：利用 TinyShip 现有的 Credits (积分) 系统做权限控制。
  - **逻辑实现**：
    - 在 Dashboard 页面加载时，检查 `user.credits` (或 `subscription`)。
    - **逻辑分支**：
      - IF (user.credits > 0): 显示 Airtable iframe (正常工作)。
      - ELSE (user.credits <= 0): 显示“待激活”卡片。
    - **待激活文案**：“欢迎加入 Dehao Workspace。您的账号暂未激活，请联系管理员充值开通权限。”

- [ ] **Phase 3: 极简模式 (Simplify UI)**
  - **任务**：隐藏所有不需要的 SaaS 营销入口。
  - **动作**：
    - 在 `config` 或 `components/sidebar` 中，注释掉 "Pricing" (价格)、"Subscription" (订阅)、"Features" (功能) 的链接。
    - 只保留 "Dashboard" (工作台) 和 "Settings" (设置)。
  - **注意**：不要删除代码，使用注释包裹 `/* ... */` 或添加 `hidden` 属性。

## 4. User Rules (给 AI 的指令)
- **Airtable 优先**：所有数据展示目前只考虑 Airtable，暂不考虑飞书。
- **环境安全**：在修改配置时，如果涉及 `.env`，请直接给出变量名和示例值。
- **标记修改**：所有涉及逻辑的代码修改，必须加上 `// [KEEP-MY-CHANGE]`。
- **严格遵守**：同时读取并遵守 `.cursorrules` 中的“零风险铁律”。