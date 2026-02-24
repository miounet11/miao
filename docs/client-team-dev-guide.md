# Miaoda IDE 客户端团队开发文档

## 项目概述

Miaoda IDE 客户端是基于 Code-OSS Fork 构建的桌面 IDE，通过 Extension Host 架构提供 AI 能力。核心扩展包括 Agent Chat Panel、Agent Orchestrator、Skills Manager、Browser Bridge 和 Shared Services。

**当前完成度：约 75%**

## 技术栈

- **基础框架**: Code-OSS (VS Code 开源版) Fork
- **语言**: TypeScript
- **运行时**: Electron + Node.js
- **LLM SDK**: OpenAI SDK (`openai`) + Anthropic SDK (`@anthropic-ai/sdk`)
- **测试**: Vitest + fast-check (PBT)

## 项目结构

```
miaoda-ide/
├── extensions/
│   ├── shared-services/src/
│   │   ├── LLMAdapter.ts                    # ✅ LLM 适配器（支持 OpenAI/Anthropic/Ollama 热切换）
│   │   ├── ILLMAdapter.ts                   # ✅ LLM 接口定义
│   │   ├── CapabilityRegistry.ts            # ✅ 能力注册表
│   │   ├── llm/
│   │   │   ├── providers/
│   │   │   │   ├── openai-provider.ts       # ✅ OpenAI 真实 SDK 集成
│   │   │   │   └── anthropic-provider.ts    # ✅ Anthropic 真实 SDK 集成
│   │   │   └── llm-error.ts                 # ✅ 统一错误类型
│   │   ├── completion/
│   │   │   └── inline-completion-provider.ts # ✅ 行内补全（InlineCompletionItemProvider）
│   │   ├── codegen/
│   │   │   └── code-generator.ts            # ✅ 代码生成器
│   │   ├── review/
│   │   │   ├── code-reviewer.ts             # ✅ AI 代码审查
│   │   │   └── code-review-provider.ts      # ✅ VSCode Diagnostics 集成
│   │   └── scaffold/
│   │       └── scaffolding-generator.ts     # ✅ 脚手架生成器
│   ├── agent-orchestrator/src/
│   │   ├── pipeline/
│   │   │   └── autonomous-pipeline.ts       # ⚠️ 基础框架已有，需完善
│   │   └── capabilities/                    # ⚠️ 需补全能力注册
│   ├── agent-chat-panel/                    # ✅ Chat UI
│   ├── skills-manager/                      # ✅ Skill 管理
│   └── browser-bridge/                      # ✅ Playwright 集成
├── build/                                   # ❌ Electron 构建配置（未开始）
└── docs/                                    # 开发文档
```

## 当前状态总结

### ✅ 已完成（无需修改）

| 模块 | 文件 | 说明 |
|------|------|------|
| OpenAI Provider | `llm/providers/openai-provider.ts` | 真实 SDK 调用，complete/stream/错误映射/模型列表 |
| Anthropic Provider | `llm/providers/anthropic-provider.ts` | 真实 SDK 调用，complete/stream/错误映射/模型列表 |
| LLM Adapter | `LLMAdapter.ts` | Provider 热切换，支持 OpenAI/Anthropic/Ollama |
| LLM Error | `llm/llm-error.ts` | 统一错误类型（auth/rate_limit/model_not_found/context_length/server/network） |
| Inline Completion | `completion/inline-completion-provider.ts` | InlineCompletionItemProvider + Debounce + LRU Cache(1000) |
| Code Generator | `codegen/code-generator.ts` | 自然语言→代码，支持 6 种语言 |
| Code Reviewer | `review/code-reviewer.ts` | AI 审查（安全/性能/风格/Bug），JSON 解析 |
| Code Review Provider | `review/code-review-provider.ts` | VSCode Diagnostics + CodeAction 一键修复 |
| Scaffolding Generator | `scaffold/scaffolding-generator.ts` | 4 种项目类型，技术栈验证 |
| Capability Registry | `CapabilityRegistry.ts` | 能力注册/查询框架（5 种能力已注册） |

### ❌ 需要完成的工作

见下方任务清单。

---

## 环境配置

### LLM API 密钥配置

客户端支持两种 LLM 调用模式：
1. **直连模式**：客户端直接调用 OpenAI/Anthropic API（需要用户自己的 API Key）
2. **代理模式**：通过后端 LLM Proxy Gateway 调用（需要登录获取 JWT）

```json
// 用户设置 settings.json
{
  "miaoda.llm.provider": "openai",
  "miaoda.llm.apiKey": "sk-xxx",
  "miaoda.llm.model": "gpt-4o",
  // 或使用代理模式
  "miaoda.llm.useProxy": true,
  "miaoda.llm.proxyUrl": "https://api.miaoda.com/api/v1/llm"
}
```

---

## 任务清单

### 🔴 P0 - 紧急（核心功能）

#### 任务 C-1：实现客户端登录/认证流程

**优先级**: 🔴 最高（不做这个，无法使用后端代理模式和会员功能）

**说明**: 客户端目前没有登录 UI 和认证流程。需要实现完整的登录/注册/OAuth 流程，获取 JWT 用于后续 API 调用。

**需要实现**:
1. 在 `agent-chat-panel` 或新建扩展中创建登录/注册 UI
2. 实现邮箱+密码登录：调用 `POST /api/v1/auth/login`
3. 实现 OAuth 登录：打开浏览器跳转 OAuth URL，处理回调
4. 安全存储 JWT Token（使用 VS Code SecretStorage API）
5. 实现 Token 自动刷新（accessToken 过期前自动调用 refresh）
6. 在状态栏显示登录状态

**后端 API**:
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/auth/oauth/:provider` - OAuth 登录

---

#### 任务 C-2：LLM Adapter 添加代理模式支持

**文件**: `extensions/shared-services/src/LLMAdapter.ts`

**说明**: 当前 LLM Adapter 只支持直连 OpenAI/Anthropic API。需要添加通过后端代理调用的模式。

**需要实现**:
1. 新建 `llm/providers/proxy-provider.ts`
2. 实现 `ProxyProvider`，将请求转发到后端 `POST /api/v1/llm/complete` 和 `POST /api/v1/llm/stream`
3. 请求头携带 JWT：`Authorization: Bearer <accessToken>`
4. 处理 SSE 流式响应
5. 在 `LLMAdapter.setProvider()` 中添加 `type: 'proxy'` 支持
6. 根据用户设置 `miaoda.llm.useProxy` 自动选择模式

**后端 API**:
- `POST /api/v1/llm/complete` - 非流式补全
- `POST /api/v1/llm/stream` - SSE 流式补全
- `GET /api/v1/llm/models` - 获取可用模型列表

**SSE 响应格式**:
```
data: {"chunk": "Hello"}
data: {"chunk": " world"}
data: {"done": true}
```

---

#### 任务 C-3：实现许可证验证流程

**说明**: 客户端启动时需要验证许可证，确定用户的功能权限。

**需要实现**:
1. 客户端启动时生成设备指纹（基于硬件信息）
2. 调用 `POST /api/v1/licenses/verify` 验证许可证
3. 根据返回的 `plan` 和 `features` 控制功能可用性
4. 实现 72 小时离线宽限期（本地缓存验证结果）
5. 设备数超限时提示用户解绑设备

**后端 API**:
- `POST /api/v1/licenses/verify` - 验证许可证
  - 请求: `{ licenseKey, deviceFingerprint, deviceName }`
  - 响应: `{ status, plan, features, maxDevices, currentDevices, offlineGracePeriod }`

---

### 🟡 P1 - 重要（产品竞争力）

#### 任务 C-4：完善 Autonomous Pipeline 阶段管理

**文件**: `extensions/agent-orchestrator/src/pipeline/autonomous-pipeline.ts`

**当前状态**: 基础框架已实现（create/execute/pause/resume/cancel/getState），5 个阶段的顺序执行逻辑已有。

**需要完善**:
1. 每个阶段的 LLM Prompt 需要更精细化（当前是通用 prompt）
2. 阶段间的产物传递需要结构化（当前只是字符串拼接）
3. 添加自动重试逻辑（`autoRetry` 配置项已定义但未实现）
4. 添加阶段超时控制
5. 生成结构化的执行报告（代码变更摘要、测试结果、部署状态）

---

#### 任务 C-5：Pipeline 状态 UI 展示

**文件**: `extensions/agent-chat-panel/`（需修改）

**说明**: 在 Chat Panel 中实时展示 Pipeline 执行状态。

**需要实现**:
1. 在 Chat UI 中添加 Pipeline 状态面板
2. 实时显示当前阶段、进度百分比
3. 显示各 Agent 工作状态
4. 阶段失败时显示失败详情和建议操作
5. 提供暂停/恢复/取消按钮

---

#### 任务 C-6：Electron 构建与打包配置

**目录**: `build/`（新建）

**说明**: 配置 electron-builder 实现跨平台打包。

**需要实现**:
1. 创建 `build/electron-builder.config.ts`
2. 配置 macOS 目标：`.dmg` + `.zip`，Apple 代码签名和公证
3. 配置 Windows 目标：`.exe` + `.zip`，Authenticode 签名
4. 配置 Linux 目标：`.deb` + `.rpm` + `.AppImage`
5. 集成 `electron-updater` 自动更新
6. 新版本可用时在状态栏显示更新通知

**注意**: 代码签名需要证书，开发阶段可以先跳过签名配置，确保打包流程通。

---

#### 任务 C-7：用量展示 UI

**说明**: 在客户端展示用户的 AI 使用量和配额信息。

**需要实现**:
1. 在状态栏或设置面板显示当前配额使用情况
2. 调用 `GET /api/v1/usage/current` 获取实时用量
3. 配额接近上限时显示警告
4. 提供升级计划的入口

---

### 🟢 P2 - 后续优化

#### 任务 C-8：崩溃报告与遥测

**需要实现**:
1. 集成 Electron `crashReporter`，上传崩溃日志
2. 崩溃恢复对话框
3. 首次启动遥测知情同意
4. 匿名数据收集（功能使用频率、LLM 延迟、扩展加载时间）
5. 不收集代码内容、文件路径等可识别信息

---

#### 任务 C-9：性能优化

**需要实现**:
1. Extension Host 内存限制 2GB，超 1.5GB 状态栏警告
2. Browser Bridge 等非核心扩展延迟加载
3. LLM 请求全局 debounce 去重

---

#### 任务 C-10：辅助功能

**需要实现**:
1. Chat Interface 完整键盘导航
2. 所有交互元素 ARIA 标签
3. Task Visualizer 屏幕阅读器支持

---

## 客户端↔服务端联调接口清单

| 功能 | 客户端调用 | 服务端端点 | 说明 |
|------|-----------|-----------|------|
| 注册 | AuthService | `POST /api/v1/auth/register` | 返回 JWT Token Pair |
| 登录 | AuthService | `POST /api/v1/auth/login` | 返回 JWT Token Pair |
| Token 刷新 | AuthService | `POST /api/v1/auth/refresh` | accessToken 过期前调用 |
| OAuth 登录 | AuthService | `GET /api/v1/auth/oauth/:provider` | 浏览器跳转 |
| LLM 补全 | ProxyProvider | `POST /api/v1/llm/complete` | 需要 JWT |
| LLM 流式 | ProxyProvider | `POST /api/v1/llm/stream` | SSE，需要 JWT |
| 可用模型 | ProxyProvider | `GET /api/v1/llm/models` | 根据 plan 返回 |
| 许可证验证 | LicenseClient | `POST /api/v1/licenses/verify` | 启动时调用 |
| 设备列表 | LicenseClient | `GET /api/v1/licenses/devices` | 需要 JWT |
| 解绑设备 | LicenseClient | `DELETE /api/v1/licenses/devices/:fp` | 需要 JWT |
| 用量查询 | UsageClient | `GET /api/v1/usage/current` | 需要 JWT |
| 订阅管理 | SubscriptionClient | `POST /api/v1/subscriptions/create` | 需要 JWT |
| Skill 搜索 | SkillClient | `GET /api/v1/skills/search` | 无需认证 |
| Skill 下载 | SkillClient | `GET /api/v1/skills/:id/download` | 需要 JWT |

## 注意事项

1. 所有需要认证的 API 请求头格式：`Authorization: Bearer <accessToken>`
2. accessToken 有效期 15 分钟，refreshToken 有效期 30 天
3. SSE 流式响应需要正确处理 `text/event-stream` Content-Type
4. 许可证验证结果应本地缓存，支持 72 小时离线使用
5. 设备指纹生成需要稳定（重启后不变），建议基于 MAC 地址 + 硬盘序列号
6. 代理模式下，LLM 错误会被后端包装，注意解析错误格式
