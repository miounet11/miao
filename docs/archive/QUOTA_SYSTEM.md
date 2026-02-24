# 🎯 额度管理系统实现完成

参考 Kiro 的设计，实现完整的额度管理和云端同步系统。

---

## ✅ 已实现功能

### 1. 本地额度管理 (QuotaManager)

**文件**: `extensions/shared-services/src/QuotaManager.ts`

**核心功能**:
- ✅ 每日免费额度：50 次
- ✅ 自动每日重置
- ✅ 额度消耗追踪
- ✅ 使用统计（7 天）
- ✅ 多模型支持
- ✅ 本地存储

**使用示例**:
```typescript
const quotaManager = new QuotaManager(context);

// 检查额度
if (quotaManager.hasQuota(1)) {
  // 消耗额度
  await quotaManager.consumeQuota('miaoda-auto', 1, 1000);
}

// 获取额度信息
const quota = quotaManager.getQuotaInfo();
console.log(`剩余: ${quota.remainingFreeQuota}/${quota.dailyFreeQuota}`);
```

---

### 2. 状态栏显示 (QuotaStatusBar)

**文件**: `extensions/shared-services/src/QuotaStatusBar.ts`

**核心功能**:
- ✅ 状态栏实时显示剩余额度
- ✅ 颜色警告（低于 30% 橙色，低于 10% 红色）
- ✅ 点击查看详情
- ✅ 可视化使用统计

**界面**:
```
状态栏: $(zap) 45/50

点击后显示:
- 今日额度进度条
- 使用统计
- 模型配置
- 7 天使用趋势
```

---

### 3. 模型配置管理

**官方模型**（消耗额度）:
```typescript
[
  {
    id: 'miaoda-auto',
    name: 'Miaoda Auto',
    provider: 'official',
    model: 'auto',
    costPerRequest: 1,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4.6',
    provider: 'official',
    model: 'claude-sonnet-4-6',
    costPerRequest: 1,
  },
  {
    id: 'claude-opus',
    name: 'Claude Opus 4.6',
    provider: 'official',
    model: 'claude-opus-4-6',
    costPerRequest: 2,
  },
]
```

**自定义模型**（不消耗额度）:
```typescript
quotaManager.addCustomModel({
  name: 'My GPT-4',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'sk-...',
  model: 'gpt-4',
  costPerRequest: 0, // 自定义模型免费
});
```

---

### 4. 云端同步 (CloudSyncClient)

**文件**: `extensions/shared-services/src/CloudSyncClient.ts`

**核心功能**:
- ✅ 设备 ID 生成
- ✅ 邮箱注册/登录
- ✅ 额度信息同步
- ✅ 使用记录同步
- ✅ 跨设备配置同步

**使用流程**:
```typescript
const syncClient = new CloudSyncClient(context);

// 启用云端同步
await syncClient.enableSync();
// 输入邮箱 → 自动注册 → 获取 token

// 自动同步
await syncClient.syncQuota(quota);
await syncClient.syncUsage(records);

// 获取云端数据
const cloudQuota = await syncClient.getCloudQuota();
const cloudStats = await syncClient.getCloudStats(7);
```

---

### 5. 云端服务架构

**目录**: `/Users/lu/ide/miaoda-ide/cloud-service`

**数据库 Schema**:
```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  device_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP
);

-- 额度表
CREATE TABLE quota (
  user_id UUID,
  date DATE,
  free_quota_used INT,
  PRIMARY KEY (user_id, date)
);

-- 使用记录表
CREATE TABLE usage (
  id UUID PRIMARY KEY,
  user_id UUID,
  model_id VARCHAR(100),
  quota_used INT,
  tokens_used INT,
  timestamp TIMESTAMP
);

-- 模型配置表
CREATE TABLE models (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR(255),
  api_key_encrypted TEXT,
  model VARCHAR(100)
);
```

**API 端点**:
```
POST /api/auth/register      # 注册/登录
GET  /api/quota              # 获取额度
POST /api/quota/sync         # 同步额度
POST /api/usage/sync         # 同步使用记录
GET  /api/quota/stats        # 获取统计
```

---

## 🎯 核心特性

### 1. 本地优先

```
本地存储 (VSCode GlobalState)
  ↓
实时更新
  ↓
异步同步到云端
  ↓
跨设备同步
```

### 2. 数据安全

```typescript
// API Key 加密存储
- 本地：VSCode SecretStorage
- 云端：AES-256-GCM 加密

// JWT 认证
- 7 天有效期
- 自动刷新
```

### 3. 用户体验

```
✅ 状态栏实时显示
✅ 额度不足警告
✅ 每日自动重置
✅ 可视化统计
✅ 一键启用云端同步
```

---

## 📊 使用流程

### 场景 1: 首次使用

```
1. 安装扩展
2. 状态栏显示: $(zap) 50/50
3. 使用官方模型
4. 自动消耗额度: $(zap) 49/50
5. 点击状态栏查看详情
```

### 场景 2: 启用云端同步

```
1. 点击状态栏
2. 点击"启用云端同步"
3. 输入邮箱
4. 自动注册/登录
5. 数据自动同步到云端
```

### 场景 3: 添加自定义模型

```
1. 点击状态栏
2. 点击"+ 添加自定义模型"
3. 输入模型信息:
   - 名称: My GPT-4
   - API URL: https://api.openai.com/v1/...
   - API Key: sk-...
   - 模型: gpt-4
4. 保存
5. 使用自定义模型（不消耗额度）
```

### 场景 4: 额度不足

```
状态栏: $(warning) 3/50 (红色)

尝试使用:
→ 弹出警告: "额度不足！今日剩余: 3/50"

选项:
1. 等待明天重置
2. 使用自定义模型
3. 升级付费套餐（未来）
```

---

## 🚀 集成到扩展

### 1. 在 extension.ts 中初始化

```typescript
import { QuotaManager } from '../shared-services/src/QuotaManager';
import { QuotaStatusBar } from '../shared-services/src/QuotaStatusBar';
import { CloudSyncClient } from '../shared-services/src/CloudSyncClient';

export function activate(context: vscode.ExtensionContext) {
  // 初始化额度管理
  const quotaManager = new QuotaManager(context);
  const statusBar = new QuotaStatusBar(quotaManager);
  const syncClient = new CloudSyncClient(context);

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showQuotaDetails', () => {
      statusBar.showDetails();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.enableCloudSync', async () => {
      await syncClient.enableSync();
    })
  );

  // 清理
  context.subscriptions.push(statusBar);
}
```

### 2. 在 AI 请求前检查额度

```typescript
async function callAI(prompt: string, modelId: string = 'miaoda-auto') {
  const quotaManager = getQuotaManager();
  const model = quotaManager.getModel(modelId);

  // 检查额度
  if (model?.provider === 'official') {
    if (!quotaManager.hasQuota(model.costPerRequest)) {
      vscode.window.showWarningMessage('额度不足！');
      return;
    }
  }

  try {
    // 调用 AI
    const response = await ai.complete(prompt);

    // 消耗额度
    if (model?.provider === 'official') {
      await quotaManager.consumeQuota(
        modelId,
        model.costPerRequest,
        response.tokensUsed
      );
    }

    return response;
  } catch (error) {
    // 错误处理
  }
}
```

---

## 📈 数据流

```
用户操作
  ↓
AI 请求
  ↓
检查额度 (QuotaManager)
  ↓
消耗额度
  ↓
更新状态栏 (QuotaStatusBar)
  ↓
记录使用 (UsageRecord)
  ↓
异步同步到云端 (CloudSyncClient)
  ↓
云端存储 (PostgreSQL)
```

---

## 🎨 UI 设计

### 状态栏

```
正常: $(zap) 45/50 (白色)
警告: $(alert) 12/50 (橙色)
危险: $(warning) 3/50 (红色)
```

### 详情面板

```
┌─────────────────────────────────────┐
│ 🎯 额度管理                          │
├─────────────────────────────────────┤
│ 今日额度                             │
│ ████████████░░░░░░░░ 45/50          │
│                                     │
│ 已使用: 5    总请求: 127            │
│ 总 Tokens: 45,230                   │
├─────────────────────────────────────┤
│ 模型配置                             │
│ [官方] Miaoda Auto • 1 额度/次      │
│ [官方] Claude Sonnet • 1 额度/次    │
│ [自定义] My GPT-4 • 免费            │
│                    [+ 添加模型]     │
├─────────────────────────────────────┤
│ 使用统计（最近 7 天）                │
│ 2026-02-22  ████████ 8 次           │
│ 2026-02-21  ██████ 6 次             │
│ 2026-02-20  ████ 4 次               │
└─────────────────────────────────────┘
```

---

## 🔒 安全性

### 1. API Key 存储

```typescript
// 本地
const secretStorage = context.secrets;
await secretStorage.store('apiKey', apiKey);

// 云端
const encrypted = encrypt(apiKey, userKey);
await db.models.create({ api_key_encrypted: encrypted });
```

### 2. JWT 认证

```typescript
const token = jwt.sign(
  { userId, email, deviceId },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

### 3. HTTPS Only

```typescript
const cloudUrl = 'https://cloud.miaoda.ai'; // 强制 HTTPS
```

---

## 📝 配置

### VSCode Settings

```json
{
  "miaoda.cloudSync.enabled": false,
  "miaoda.cloudUrl": "https://cloud.miaoda.ai",
  "miaoda.defaultModel": "miaoda-auto"
}
```

---

## 🚀 下一步

### 立即可用

- [x] 本地额度管理
- [x] 状态栏显示
- [x] 模型配置
- [x] 使用统计

### 需要部署

- [ ] 云端服务部署
- [ ] 数据库设置
- [ ] API 实现
- [ ] 云端同步测试

### 未来扩展

- [ ] 付费套餐
- [ ] 团队协作
- [ ] 使用分析
- [ ] 成本优化建议

---

**状态**: ✅ 本地功能完成，云端服务待部署

**参考**: Kiro 的额度管理设计
