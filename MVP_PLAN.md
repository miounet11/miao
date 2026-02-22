# MVP 实施计划 - 务实的下一代开发工具

基于 Linear Method + EvoMap 理念

---

## 核心理念

### 从 EvoMap 学到的

1. **零摩擦接入** - 3 步开始，无需复杂配置
2. **极简界面** - 10 秒理解核心价值
3. **知识继承** - "一个学习，百万继承"
4. **透明评分** - 公开的质量体系
5. **协议优先** - 不绑定特定实现

### 我们的原则

```markdown
✅ 让程序员感觉到真的好
✅ 避免花里胡哨的东西
✅ 明眼人一看就懂
✅ 一用就扔不掉
```

---

## 砍掉的功能

基于 RICE 评分，暂时移除：

```markdown
❌ 成就系统 (RICE: 12.5)
   - 非核心功能
   - 游戏化过度
   - 不适合严肃开发

❌ TikTok 风格 UI (RICE: 15)
   - 花里胡哨
   - 不够专业
   - 学习成本高

❌ Skill 市场完整版 (RICE: 20)
   - 过早优化
   - 需要服务器支持
   - 本地版本足够

❌ 复杂推荐引擎 (RICE: 25)
   - 简单规则足够
   - 过度工程
```

---

## 保留的核心（3 个系统）

### 1. Skill 快速生成器 ⭐⭐⭐

**RICE Score: 120** (最高优先级)

**文件**: `extensions/skills-manager/src/SkillGenerator.ts`

**核心价值**:
- 3 步创建 Skill（零摩擦）
- 从代码学习（知识继承）
- 实时预览（即时反馈）

**使用流程**:
```
1. 描述问题
   "为 React 组件生成单元测试"

2. 提供示例（可选）
   选中代码或跳过

3. 选择类别
   💻 代码生成 / 🧪 测试 / 🔧 重构 / 📖 文档 / 🐛 调试

✅ 自动生成 Skill
```

**命令**:
- `Cmd+Shift+P` → "Miaoda: Generate Skill"
- 右键菜单 → "Learn Skill from Code"

---

### 2. 智能并行调度 ⭐⭐⭐

**RICE Score: 240** (核心竞争力)

**文件**: `extensions/agent-orchestrator/src/TaskScheduler.ts`

**核心价值**:
- 自动依赖分析
- 3-5x 性能提升
- 透明执行计划

**示例**:
```typescript
// 用户提交 3 个任务
const tasks = [
  { type: 'code_generation', description: '生成用户 API' },
  { type: 'code_generation', description: '生成产品 API' },
  { type: 'test_generation', description: '生成测试' },
];

// 自动分析依赖
// Layer 1 (并行): 生成用户 API + 生成产品 API
// Layer 2: 生成测试（等待 Layer 1）

// 结果: 6 秒 vs 串行 9 秒 (1.5x 加速)
```

---

### 3. 简化进度显示 ⭐⭐

**RICE Score: 133**

**文件**: `extensions/agent-orchestrator/src/SimpleProgressView.ts`

**核心价值**:
- 状态栏实时显示
- 输出面板详细日志
- 完成通知

**界面**:
```
状态栏:
$(sync~spin) 45% 生成 React 组件

输出面板:
[14:23:15] 📝 提交: 生成 React 组件
[14:23:16] 🔄 生成 React 组件: 分析上下文 (25%)
[14:23:18] 🔄 生成 React 组件: 生成代码 (75%)
[14:23:20] ✅ 完成: 生成 React 组件 (5s)
```

---

## 对比：复杂版 vs 简化版

### 之前（复杂版）

```
6 个系统:
├── LiveProgressPanel (TikTok UI)
├── TaskScheduler (并行调度)
├── AchievementSystem (成就系统)
├── SkillRecommender (推荐引擎)
├── SkillMarketplace (完整市场)
└── QuickActionPanel (快捷面板)

问题:
- 学习成本高
- 花里胡哨
- 维护困难
- 用户无感知
```

### 现在（简化版）

```
3 个系统:
├── SkillGenerator (快速生成) ⭐⭐⭐
├── TaskScheduler (并行调度) ⭐⭐⭐
└── SimpleProgressView (简化显示) ⭐⭐

优势:
- 核心价值清晰
- 专业简洁
- 易于维护
- 立即见效
```

---

## 用户体验流程

### 场景 1: 快速生成 Skill

```
用户: 我经常需要为 React 组件生成测试

操作:
1. Cmd+Shift+P → "Generate Skill"
2. 输入: "为 React 组件生成单元测试"
3. 选中组件代码作为示例
4. 选择类别: 🧪 测试
5. 预览 → 保存

结果:
✅ Skill "React Component Test" 已保存
下次直接使用，无需重复描述
```

### 场景 2: 并行执行任务

```
用户: 我需要生成 3 个 API 和对应的测试

操作:
1. 提交 3 个代码生成任务
2. 提交 3 个测试生成任务

系统:
📊 执行计划:
Layer 1 (3 tasks in parallel):
  💻 生成用户 API
  💻 生成产品 API
  💻 生成订单 API

Layer 2 (3 tasks in parallel):
  🧪 生成用户 API 测试
  🧪 生成产品 API 测试
  🧪 生成订单 API 测试

⚡ Performance:
  Serial: 18s
  Parallel: 6s
  Speedup: 3.0x faster

结果:
用户看到明显的速度提升
```

### 场景 3: 实时进度追踪

```
用户: 我想知道任务执行到哪一步了

界面:
状态栏: $(sync~spin) 2 个任务运行中

点击状态栏 → 输出面板:
[14:23:15] 📝 提交: 生成用户 API
[14:23:15] 📝 提交: 生成产品 API
[14:23:16] 🔄 生成用户 API: 分析上下文 (25%)
[14:23:16] 🔄 生成产品 API: 分析上下文 (25%)
[14:23:18] 🔄 生成用户 API: 生成代码 (75%)
[14:23:18] 🔄 生成产品 API: 生成代码 (75%)
[14:23:20] ✅ 完成: 生成用户 API (5s)
[14:23:21] ✅ 完成: 生成产品 API (6s)

结果:
清晰、专业、无干扰
```

---

## 技术实现

### 文件结构

```
extensions/
├── agent-orchestrator/src/
│   ├── AgentOrchestrator.ts      (已有，已集成)
│   ├── TaskScheduler.ts          (新增，核心)
│   ├── SimpleProgressView.ts     (新增，简化)
│   └── extension.ts              (已更新)
│
└── skills-manager/src/
    ├── SkillGenerator.ts         (新增，核心)
    └── SkillMarketplace.ts       (已有，简化版)
```

### 依赖关系

```
SkillGenerator
  ↓
SkillMarketplace (本地存储)
  ↓
AgentOrchestrator
  ↓
TaskScheduler (并行调度)
  ↓
SimpleProgressView (进度显示)
```

---

## 测试计划

### 1. Skill 生成器测试

```bash
# 测试场景
1. 生成代码 Skill
2. 生成测试 Skill
3. 从代码学习
4. 预览和保存
5. 导入导出

# 预期结果
- 3 步完成
- 预览正确
- 保存成功
- 可复用
```

### 2. 并行调度测试

```bash
# 测试场景
1. 提交 3 个独立任务
2. 提交有依赖的任务
3. 混合场景

# 预期结果
- 正确识别依赖
- 并行执行
- 显示加速比
```

### 3. 进度显示测试

```bash
# 测试场景
1. 单任务执行
2. 多任务并行
3. 任务完成通知

# 预期结果
- 状态栏实时更新
- 输出面板清晰
- 通知及时
```

---

## 成功指标

### 定量指标

```
✅ Skill 生成时间 < 30 秒
✅ 并行加速比 > 2x
✅ 状态栏更新延迟 < 500ms
✅ 用户满意度 > 4.5/5
```

### 定性指标

```
✅ 用户反馈: "一看就懂"
✅ 用户反馈: "一用就扔不掉"
✅ 用户反馈: "真的提升了效率"
✅ 用户反馈: "比 Cursor 好用"
```

---

## 实施步骤

### Week 1: 核心功能

- [x] SkillGenerator 实现
- [x] TaskScheduler 实现
- [x] SimpleProgressView 实现
- [x] Extension 集成
- [ ] 编译测试
- [ ] 功能测试

### Week 2: 优化完善

- [ ] Bug 修复
- [ ] 性能优化
- [ ] 用户文档
- [ ] 示例 Skills

### Week 3: 用户测试

- [ ] 内部测试
- [ ] 收集反馈
- [ ] 迭代改进

### Week 4: 发布

- [ ] 最终测试
- [ ] 文档完善
- [ ] 发布 v1.0

---

## 命令清单

### 用户命令

```
miaoda.skill.generate
  快速生成 Skill (3 步)

miaoda.skill.learnFromCode
  从选中代码学习生成 Skill

miaoda.showTaskOutput
  显示任务输出面板

miaoda.agent.submitTask
  提交单个任务

miaoda.submitBatchTasks
  批量提交任务（并行执行）
```

### 快捷键（建议）

```
Cmd+Shift+S  生成 Skill
Cmd+Shift+L  从代码学习
Cmd+Shift+O  显示输出
```

---

## 与竞品对比

### vs Cursor

| 功能 | Cursor | Miaoda MVP |
|------|--------|------------|
| Skill 生成 | ❌ 无 | ✅ 3 步生成 |
| 并行执行 | ❌ 串行 | ✅ 3-5x 加速 |
| 进度显示 | ❌ "Thinking..." | ✅ 实时详细 |
| 知识复用 | ❌ 每次重复 | ✅ Skill 系统 |
| 学习曲线 | 低 | 低 |
| 专业性 | 中 | 高 |

### vs VSCode Copilot

| 功能 | Copilot | Miaoda MVP |
|------|---------|------------|
| 代码补全 | ✅ 强 | ➖ 不是重点 |
| 任务执行 | ❌ 无 | ✅ 并行执行 |
| 工作流 | ❌ 无 | ✅ Skill 系统 |
| 自定义 | ❌ 弱 | ✅ 强 |

---

## 核心价值主张

```
🎯 3 步生成 Skill
   - 零摩擦接入
   - 知识继承
   - 立即复用

⚡ 3-5x 并行加速
   - 自动依赖分析
   - 透明执行计划
   - 显著提升效率

📊 简洁进度显示
   - 专业清晰
   - 实时反馈
   - 无干扰
```

---

## 下一步

```bash
# 1. 编译测试
cd /Users/lu/ide/miaoda-ide
npm run compile

# 2. 启动调试
按 F5

# 3. 测试命令
Cmd+Shift+P → "Miaoda: Generate Skill"

# 4. 验证功能
- 生成 Skill
- 并行执行
- 进度显示
```

---

**核心理念：简单、专业、高效**

**目标：让程序员一用就扔不掉**
