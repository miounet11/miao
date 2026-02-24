# Miaoda IDE 服务端团队开发文档

## 项目概述

Miaoda IDE 云服务（`cloud-service/`）是基于 Express + TypeScript 的后端服务，负责用户认证、会员订阅、LLM 代理、许可证管理、用量统计和 Skill 市场等功能。

**当前完成度：约 60%**

## 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Express.js
- **数据库**: PostgreSQL（主库）+ Redis（缓存/配额/限流）
- **支付**: Stripe SDK
- **认证**: RS256 JWT（非对称密钥）+ bcrypt
- **OAuth**: GitHub / Google / Microsoft

## 项目结构

```
cloud-service/
├── src/
│   ├── app.ts                    # Express 应用配置
│   ├── server.ts                 # 服务启动入口
│   ├── config/
│   │   └── database.ts           # PostgreSQL + Redis 连接配置
│   ├── middleware/
│   │   ├── logger.ts             # 请求日志
│   │   ├── errorHandler.ts       # 错误处理
│   │   └── rateLimit.ts          # 限流中间件
│   ├── routes/
│   │   ├── index.ts              # ⚠️ 路由注册入口（需修改）
│   │   ├── auth.ts               # ✅ 认证路由
│   │   ├── config.ts             # ✅ 配置路由
│   │   ├── user.ts               # ✅ 用户路由
│   │   ├── health.ts             # ✅ 健康检查路由
│   │   ├── storage.ts            # ✅ 存储路由
│   │   ├── llmRoutes.ts          # ✅ 已实现，❌ 未注册
│   │   ├── subscriptionRoutes.ts # ✅ 已实现，❌ 未注册
│   │   ├── usageRoutes.ts        # ❌ 不存在，需创建
│   │   ├── licenseRoutes.ts      # ❌ 不存在，需创建
│   │   └── skillRoutes.ts        # ❌ 不存在，需创建
│   ├── services/
│   │   ├── authService.ts        # ✅ 完整（RS256 JWT, bcrypt, 账号锁定）
│   │   ├── oauthService.ts       # ✅ 完整（GitHub/Google/Microsoft）
│   │   ├── subscriptionService.ts# ✅ 完整（Stripe 创建/取消/变更）
│   │   ├── quotaService.ts       # ✅ 完整（Redis Lua 原子操作）
│   │   ├── llmProxyService.ts    # ✅ 完整（转发/SSE 流式/配额检查）
│   │   ├── licenseService.ts     # ✅ 完整（密钥生成/设备绑定/离线宽限）
│   │   ├── usageService.ts       # ✅ 完整（异步记录/Redis 计数器/汇总）
│   │   └── skillMarketplaceService.ts # ✅ 完整（发布/扫描/审核/搜索/下载/评价）
│   └── utils/
│       └── jwt-rs256.ts          # ✅ RS256 JWT 工具
├── migrations/                   # ✅ 11 个迁移脚本
└── package.json
```

## 当前状态总结

### ✅ 已完成（无需修改）

| 模块 | 文件 | 说明 |
|------|------|------|
| AuthService | `services/authService.ts` | RS256 JWT、bcrypt(cost=12)、账号锁定(5次/15分钟)、Token 刷新/撤销 |
| OAuthService | `services/oauthService.ts` | GitHub/Google/Microsoft 完整 OAuth 流程 |
| SubscriptionService | `services/subscriptionService.ts` | Stripe 创建/取消/变更订阅 |
| QuotaService | `services/quotaService.ts` | Redis Lua 原子配额检查（Free:50/Pro:500/Business:无限） |
| LLMProxyService | `services/llmProxyService.ts` | JWT 验证、模型权限、配额检查、OpenAI/Anthropic 转发、SSE 流式 |
| LicenseService | `services/licenseService.ts` | XXXX-XXXX-XXXX-XXXX 密钥、设备绑定、72h 离线宽限 |
| UsageService | `services/usageService.ts` | 异步记录、Redis 实时计数器、用户/系统汇总 |
| SkillMarketplaceService | `services/skillMarketplaceService.ts` | 发布、SHA-256 校验、安全扫描、审核、搜索、下载、评价 |
| LLM Routes | `routes/llmRoutes.ts` | /complete、/stream(SSE)、/models，指数退避重试(3次) |
| Subscription Routes | `routes/subscriptionRoutes.ts` | Stripe Webhook(5种事件)、创建/取消/变更/查询订阅 |
| 数据库迁移 | `migrations/` | 11 个 SQL 迁移脚本 |

### ❌ 需要完成的工作

见下方任务清单。

---

## 环境变量配置

开发前请确保 `.env` 文件包含以下配置：

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/miaoda
REDIS_URL=redis://localhost:6379

# JWT RS256 密钥
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# OAuth（需要真实值才能联调）
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Stripe（需要真实值才能联调）
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxx
STRIPE_PRICE_BUSINESS_YEARLY=price_xxx

# LLM API Keys（服务端代理用）
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# 应用
BASE_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

---

## 任务清单

### 🔴 P0 - 紧急（阻塞联调）

#### 任务 S-1：注册缺失路由到 routes/index.ts

**优先级**: 🔴 最高（不做这个，所有已实现的服务都无法访问）

**文件**: `cloud-service/src/routes/index.ts`

**当前代码**:
```typescript
// 当前只注册了 5 个路由
router.use('/auth', authRoutes);
router.use('/config', configRoutes);
router.use('/user', userRoutes);
router.use('/health', healthRoutes);
router.use('/storage', storageRoutes);
```

**需要添加**:
```typescript
import llmRoutes from './llmRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import usageRoutes from './usageRoutes';
import licenseRoutes from './licenseRoutes';
import skillRoutes from './skillRoutes';

// 新增路由挂载
router.use('/llm', llmRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/usage', usageRoutes);
router.use('/licenses', licenseRoutes);
router.use('/skills', skillRoutes);
```

**注意**: `llmRoutes.ts` 和 `subscriptionRoutes.ts` 已存在但未挂载。`usageRoutes.ts`、`licenseRoutes.ts`、`skillRoutes.ts` 需要先创建（见任务 S-2/S-3/S-4）。

**完成后 API 路径**:
- `POST /api/v1/llm/complete` - LLM 补全
- `POST /api/v1/llm/stream` - LLM 流式
- `GET /api/v1/llm/models` - 可用模型
- `POST /api/v1/subscriptions/create` - 创建订阅
- `POST /api/v1/subscriptions/cancel` - 取消订阅
- `POST /api/v1/subscriptions/webhook` - Stripe Webhook
- `GET /api/v1/usage/...` - 用量查询
- `POST /api/v1/licenses/verify` - 许可证验证
- `POST /api/v1/skills/publish` - 发布 Skill

---

#### 任务 S-2：创建 usageRoutes.ts

**文件**: `cloud-service/src/routes/usageRoutes.ts`（新建）

**依赖服务**: `UsageService`（已完整实现）

**需要实现的端点**:

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/summary` | 获取当前用户用量摘要 | JWT |
| GET | `/current` | 获取当前周期实时用量（Redis） | JWT |
| GET | `/system` | 获取系统用量概览 | JWT + Admin |

**参考**: `UsageService` 已提供 `getUsageSummary()`、`getCurrentPeriodUsage()`、`getSystemUsageSummary()` 方法。

---

#### 任务 S-3：创建 licenseRoutes.ts

**文件**: `cloud-service/src/routes/licenseRoutes.ts`（新建）

**依赖服务**: `LicenseService`（已完整实现）

**需要实现的端点**:

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/verify` | 验证许可证 + 设备指纹 | 无（客户端启动时调用） |
| GET | `/` | 获取当前用户许可证信息 | JWT |
| GET | `/devices` | 获取设备绑定列表 | JWT |
| DELETE | `/devices/:fingerprint` | 解绑设备 | JWT |

**参考**: `LicenseService` 已提供 `verifyLicense()`、`getLicenseByUserId()`、`getDeviceBindings()`、`unbindDevice()` 方法。

---

#### 任务 S-4：创建 skillRoutes.ts

**文件**: `cloud-service/src/routes/skillRoutes.ts`（新建）

**依赖服务**: `SkillMarketplaceService`（已完整实现）

**需要实现的端点**:

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/publish` | 发布 Skill 包 | JWT (Pro/Business) |
| POST | `/:id/approve` | 审核通过 Skill | JWT + Admin |
| GET | `/search` | 搜索 Skill（keyword, page, limit） | 无 |
| GET | `/:id/download` | 下载 Skill | JWT |
| POST | `/:id/review` | 提交评价 | JWT |

**参考**: `SkillMarketplaceService` 已提供 `publishSkill()`、`approveSkill()`、`searchSkills()`、`downloadSkill()`、`submitReview()` 方法。

---

#### 任务 S-5：实现邮件发送功能

**文件**: `cloud-service/src/services/emailService.ts`（新建）

**说明**: 当前 `authService.ts` 中有两处 `TODO` 注释：
- 注册成功后发送邮箱验证邮件
- 密码重置时发送重置邮件

**需要实现**:
1. 创建 `EmailService` 类
2. 集成邮件发送库（推荐 `nodemailer` 或 `@sendgrid/mail`）
3. 实现 `sendVerificationEmail(email, token)` 方法
4. 实现 `sendPasswordResetEmail(email, token)` 方法
5. 替换 `authService.ts` 中的 TODO 注释为实际调用

**环境变量**:
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@miaoda.com
SMTP_PASS=xxx
# 或使用 SendGrid
SENDGRID_API_KEY=SG.xxx
```

---

#### 任务 S-6：Stripe Webhook 的 raw body 处理

**文件**: `cloud-service/src/app.ts`

**说明**: Stripe Webhook 签名验证需要原始请求体（raw body），但当前 `app.ts` 全局使用了 `express.json()` 中间件，会导致 Webhook 签名验证失败。

**需要修改**:
```typescript
// 在 express.json() 之前，为 webhook 路径使用 raw body
app.use('/api/v1/subscriptions/webhook', express.raw({ type: 'application/json' }));

// 其他路径继续使用 json 解析
app.use(express.json({ limit: '10mb' }));
```

---

### 🟡 P1 - 重要（产品功能完善）

#### 任务 S-7：添加认证中间件到路由

**说明**: 新创建的路由需要统一的 JWT 认证中间件保护。

**需要实现**:
1. 确认 `middleware/` 下有可用的 JWT 验证中间件
2. 在 `usageRoutes.ts`、`licenseRoutes.ts`、`skillRoutes.ts` 中应用认证中间件
3. 部分端点需要 Admin 角色检查（如系统用量、Skill 审核）

---

#### 任务 S-8：更新 app.ts 根端点的 API 文档

**文件**: `cloud-service/src/app.ts`

**说明**: 根端点 `/` 返回的 API 列表只包含 auth/config/user/health，需要更新为完整的端点列表。

---

#### 任务 S-9：subscriptionRoutes 添加认证中间件

**文件**: `cloud-service/src/routes/subscriptionRoutes.ts`

**说明**: 当前 `subscriptionRoutes.ts` 的 `/create`、`/cancel`、`/change-plan`、`/:userId` 端点没有 JWT 认证保护，任何人都可以调用。需要添加认证中间件，并从 JWT payload 中获取 userId 而非从 request body 中获取。

---

### 🟢 P2 - 后续优化

#### 任务 S-10：Object Storage 集成

**说明**: `SkillMarketplaceService` 中的 `uploadToStorage()` 和 `generateSignedUrl()` 目前是占位实现，返回假 URL。

**需要实现**:
- 集成 AWS S3 或 MinIO
- 实现真实的文件上传和签名 URL 生成

---

#### 任务 S-11：OpenAPI 文档

**说明**: 为所有 API 端点生成 OpenAPI 3.0 规范文件，在开发环境暴露 Swagger UI（`/docs`）。

---

#### 任务 S-12：微服务拆分准备

**说明**: 当前是单体架构，后续需要拆分为独立微服务。建议先创建 `shared-types` 包，提取公共接口和类型定义。

---

## 联调检查清单

完成以上 P0 任务后，可以与客户端进行以下联调：

- [ ] 注册/登录流程：`POST /api/v1/auth/register` → `POST /api/v1/auth/login`
- [ ] Token 刷新：`POST /api/v1/auth/refresh`
- [ ] OAuth 登录：`GET /api/v1/auth/oauth/:provider`
- [ ] LLM 代理：`POST /api/v1/llm/complete` 和 `POST /api/v1/llm/stream`
- [ ] 许可证验证：`POST /api/v1/licenses/verify`
- [ ] 用量查询：`GET /api/v1/usage/current`
- [ ] 订阅管理：`POST /api/v1/subscriptions/create`

## 注意事项

1. 所有路由前缀为 `/api/v1`（在 `app.ts` 中配置）
2. JWT 使用 RS256 非对称密钥，需要生成密钥对放在 `keys/` 目录
3. Stripe Webhook 需要配置 raw body 解析（任务 S-6）
4. OAuth 需要在各平台注册应用获取 Client ID/Secret
5. 数据库迁移脚本已存在，启动前确保 PostgreSQL 和 Redis 已运行
