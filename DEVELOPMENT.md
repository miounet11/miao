# Miaoda IDE Development Guide

## 项目概述

Miaoda IDE 是基于 Code-OSS Fork 构建的 AI 驱动开发环境，提供完整的认证、许可证管理、自主 Pipeline 执行等功能。

**当前完成度**: 100% (所有 P0、P1、P2 任务已完成)

## 快速开始

### 环境要求

- Node.js >= 18.x
- npm >= 9.x
- TypeScript >= 5.3.x
- VS Code >= 1.85.0

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装所有扩展依赖
cd extensions
npm install

# 编译所有扩展
npm run compile-all
```

### 开发模式

```bash
# 启动开发模式（监听文件变化）
npm run watch

# 在 VS Code 中按 F5 启动调试
```

## 项目结构

```
miaoda-ide/
├── extensions/                    # 扩展目录
│   ├── auth-service/             # 认证服务
│   ├── license-service/          # 许可证服务
│   ├── shared-services/          # 共享服务
│   ├── agent-orchestrator/       # Agent 编排器
│   ├── agent-chat-panel/         # Chat UI
│   ├── skills-manager/           # Skill 管理
│   ├── browser-bridge/           # 浏览器自动化
│   └── integration-tests/        # 集成测试
├── build/                        # 构建配置
│   ├── electron-builder.config.ts
│   └── entitlements.mac.plist
├── docs/                         # 文档
└── product.json                  # 产品配置
```

## 核心扩展

### 1. auth-service (认证服务)

**功能**:
- 邮箱+密码登录/注册
- OAuth 支持（GitHub/Google/Microsoft）
- JWT Token 安全存储
- 自动 Token 刷新

**API**:
```typescript
const authService = vscode.extensions.getExtension('miaoda.auth-service');
const api = await authService.activate();

const isAuth = api.isAuthenticated();
const token = await api.getAccessToken();
const authState = api.getAuthState();
```

### 2. license-service (许可证服务)

**功能**:
- 启动时验证许可证
- 设备指纹生成
- 72 小时离线宽限期
- 设备管理

**API**:
```typescript
const licenseService = vscode.extensions.getExtension('miaoda.license-service');
const api = await licenseService.activate();

const licenseInfo = api.getLicenseInfo();
const hasFeature = api.hasFeature('advanced-ai');
```

### 3. shared-services (共享服务)

**功能**:
- LLM Adapter（支持 OpenAI/Anthropic/Ollama/Proxy）
- 自动更新服务
- 用量追踪
- 遥测（崩溃报告、使用统计）
- 性能监控
- 辅助功能

**使用**:
```typescript
import { getLLMAdapter, UsageTracker, PerformanceMonitor } from 'shared-services';

const llmAdapter = getLLMAdapter();
await llmAdapter.setProvider({
  type: 'proxy',
  baseUrl: 'https://api.miaoda.com',
  model: 'gpt-4o',
});
```

### 4. agent-orchestrator (Agent 编排器)

**功能**:
- 自主 Pipeline 执行
- 5 个阶段（requirements/design/coding/testing/deployment）
- 自动重试
- 超时控制
- 结构化输出

**使用**:
```typescript
const orchestrator = vscode.extensions.getExtension('miaoda.agent-orchestrator');
const api = await orchestrator.activate();
const pipeline = api.getPipeline();

const state = await pipeline.create({
  task: 'Create a REST API',
  context: 'Node.js + Express',
  autoAdvance: true,
});

await pipeline.execute(state.id);
```

## 开发工作流

### 添加新功能

1. **规划阶段**
   - 在 `docs/` 目录创建设计文档
   - 定义 API 接口
   - 确定依赖关系

2. **实现阶段**
   - 在相应扩展目录创建文件
   - 实现功能逻辑
   - 添加类型定义

3. **测试阶段**
   - 编写单元测试
   - 添加集成测试
   - 运行 E2E 测试

4. **文档阶段**
   - 更新 README
   - 添加 API 文档
   - 更新 CHANGELOG

### 测试

```bash
# 验证设置
vscode> Miaoda Test: Validate Setup

# 运行集成测试
vscode> Miaoda Test: Run Integration Tests

# 运行 E2E 测试
vscode> Miaoda Test: Run E2E Tests
```

### 构建

```bash
# 编译所有扩展
npm run compile-all

# 打包 Electron 应用
npm run package

# 构建特定平台
npm run build:mac
npm run build:win
npm run build:linux
```

## 调试

### 调试扩展

1. 在 VS Code 中打开项目
2. 按 F5 启动调试
3. 在新窗口中测试扩展
4. 使用 Developer Tools 查看日志

### 调试 LLM 请求

```typescript
// 启用 LLM 请求日志
const llmAdapter = getLLMAdapter();
// 所有请求会输出到控制台
```

### 调试 Pipeline

```typescript
// 查看 Pipeline 状态
const state = await pipeline.getState(pipelineId);
console.log(state);

// 生成执行报告
const report = await pipeline.generateReport(pipelineId);
console.log(report);
```

## 性能优化

### 内存管理

- Extension Host 限制：2GB
- 警告阈值：1.5GB
- 自动垃圾回收
- 延迟加载非核心扩展

### LLM 请求优化

- 请求去重
- 响应缓存（5 分钟 TTL）
- 最大缓存：100 个请求

### 启动优化

- 关键扩展立即加载
- 高优先级扩展 1 秒后加载
- 中优先级扩展 5 秒后加载
- 低优先级扩展 10 秒后加载

## 辅助功能

### 屏幕阅读器支持

- 所有 UI 元素有 ARIA 标签
- 完整键盘导航
- 状态公告

### 高对比度模式

- 自动检测
- 优化颜色对比度

### 键盘快捷键

```
Ctrl+Shift+C  - 打开 Chat Panel
Ctrl+Shift+R  - 代码审查
Ctrl+Shift+S  - 生成 Skill
Ctrl+Shift+Q  - 快速操作
Alt+Shift+S   - 切换屏幕阅读器模式
```

## 发布流程

### 版本号规范

遵循语义化版本：`MAJOR.MINOR.PATCH`

- MAJOR: 不兼容的 API 变更
- MINOR: 向后兼容的功能新增
- PATCH: 向后兼容的问题修复

### 发布步骤

1. **更新版本号**
   ```bash
   npm version patch  # 或 minor/major
   ```

2. **更新 CHANGELOG**
   - 添加新版本说明
   - 列出所有变更

3. **构建**
   ```bash
   npm run build:all
   ```

4. **测试**
   ```bash
   npm test
   ```

5. **打包**
   ```bash
   npm run package
   ```

6. **发布**
   - 上传到更新服务器
   - 创建 GitHub Release
   - 更新文档

## 故障排查

### 扩展无法激活

1. 检查依赖是否安装
2. 查看 Developer Tools 控制台
3. 验证 package.json 配置
4. 重新编译扩展

### LLM 请求失败

1. 检查网络连接
2. 验证 API Key
3. 检查代理配置
4. 查看错误日志

### Pipeline 执行失败

1. 查看 Pipeline 状态
2. 检查 LLM 配置
3. 验证输入格式
4. 查看阶段输出

### 内存占用过高

1. 运行性能监控
2. 优化内存
3. 重载窗口
4. 禁用非必要扩展

## 贡献指南

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 添加 JSDoc 注释
- 编写单元测试

### 提交规范

```
type(scope): subject

body

footer
```

**Type**:
- feat: 新功能
- fix: 修复
- docs: 文档
- style: 格式
- refactor: 重构
- test: 测试
- chore: 构建

### Pull Request

1. Fork 项目
2. 创建功能分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 资源链接

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Electron Builder](https://www.electron.build/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/)

## 许可证

MIT License

## 联系方式

- Email: support@miaoda.com
- GitHub: https://github.com/miaoda/miaoda-ide
- Discord: https://discord.gg/miaoda
