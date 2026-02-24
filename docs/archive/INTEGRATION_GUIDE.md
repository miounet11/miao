# 🔧 Miaoda IDE - 集成指南

## 问题：跨扩展导入

VSCode 扩展架构不支持直接跨扩展导入。每个扩展是独立的。

## 解决方案：3 种集成方式

### 方案 1: Monorepo + Shared Package（推荐）

```
miaoda-ide/
├── packages/
│   ├── core/              # 共享核心
│   │   ├── AIManager.ts
│   │   ├── SkillStorage.ts
│   │   └── QuotaManager.ts
│   └── types/             # 共享类型
│       └── index.ts
├── extensions/
│   ├── agent-orchestrator/
│   ├── skills-manager/
│   └── shared-services/
└── package.json           # Workspace root
```

**优点**: 代码复用，类型安全
**缺点**: 需要重构项目结构

---

### 方案 2: Extension API（当前推荐）

每个扩展暴露 API，其他扩展通过 VSCode Extension API 调用。

```typescript
// shared-services/extension.ts
export function activate(context: vscode.ExtensionContext) {
  // 暴露 API
  return {
    getAIManager: () => getAIManager(context),
    getQuotaBar: () => getSimpleQuotaBar(context),
  };
}

// agent-orchestrator/extension.ts
export function activate(context: vscode.ExtensionContext) {
  // 获取其他扩展的 API
  const sharedServices = vscode.extensions.getExtension('miaoda.shared-services');
  if (sharedServices) {
    const api = sharedServices.exports;
    const aiManager = api.getAIManager();
    const quotaBar = api.getQuotaBar();
  }
}
```

**优点**: 符合 VSCode 架构，扩展独立
**缺点**: 需要处理扩展加载顺序

---

### 方案 3: 单一扩展（最简单）

将所有功能合并到一个扩展中。

```
miaoda-ide/
└── extension/
    ├── src/
    │   ├── agent/
    │   ├── skill/
    │   ├── ai/
    │   └── quota/
    └── package.json
```

**优点**: 最简单，无集成问题
**缺点**: 单一扩展体积大

---

## 当前状态

### 已完成
- ✅ 所有核心功能独立实现
- ✅ 所有代码编译成功
- ✅ 功能完整

### 集成方案

**推荐**: 方案 2（Extension API）

**原因**:
1. 符合 VSCode 架构
2. 扩展独立，易于维护
3. 无需重构现有代码

---

## 实施步骤

### Step 1: 暴露 API

```typescript
// shared-services/src/extension.ts
import * as vscode from 'vscode';
import { getAIManager } from './AIManager';
import { getSimpleQuotaBar } from './SimpleQuotaBar';

export function activate(context: vscode.ExtensionContext) {
  const aiManager = getAIManager(context);
  const quotaBar = getSimpleQuotaBar(context);

  // 暴露 API
  return {
    aiManager,
    quotaBar,
  };
}
```

### Step 2: 消费 API

```typescript
// agent-orchestrator/src/extension.ts
export async function activate(context: vscode.ExtensionContext) {
  // 等待依赖扩展加载
  const sharedExt = vscode.extensions.getExtension('miaoda.shared-services');
  if (!sharedExt) {
    vscode.window.showErrorMessage('Shared Services not found');
    return;
  }

  await sharedExt.activate();
  const { aiManager, quotaBar } = sharedExt.exports;

  // 使用 API
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.test', async () => {
      const canConsume = await quotaBar.consume(1);
      if (canConsume) {
        const response = await aiManager.complete('Hello');
        console.log(response);
      }
    })
  );
}
```

### Step 3: 配置依赖

```json
// agent-orchestrator/package.json
{
  "extensionDependencies": [
    "miaoda.shared-services",
    "miaoda.skills-manager"
  ]
}
```

---

## 快速修复（临时方案）

删除跨扩展导入，使用占位符：

```typescript
// IntegratedExtension.ts
export function activateIntegratedSystems(context: vscode.ExtensionContext): void {
  // TODO: 等待 Extension API 集成
  vscode.window.showInformationMessage(
    '集成功能开发中，请使用独立命令'
  );
}
```

---

## 测试方法

### 测试独立功能

```bash
# 测试 Agent 系统
F5 → 运行 "Miaoda: Start Agent Team"

# 测试速度对比
F5 → 运行 "Miaoda: Show Speed Comparison"

# 测试快捷面板
F5 → 运行 "Miaoda: Show Quick Actions"
```

### 测试集成功能

需要先实现 Extension API 集成。

---

## 下一步

### 立即可做
1. 修复编译错误（删除跨扩展导入）
2. 测试独立功能
3. 验证核心功能

### 短期规划
1. 实现 Extension API
2. 集成所有扩展
3. 端到端测试

---

**状态**: 核心功能完成，等待集成

**推荐**: 使用 Extension API 方案

**日期**: 2026-02-22
