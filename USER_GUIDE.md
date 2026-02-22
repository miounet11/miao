# 📖 Miaoda IDE 用户指南

欢迎使用 Miaoda IDE - 下一代 AI 编码工具！

---

## 🚀 快速开始

### 首次使用

1. **启动 Miaoda IDE**
   - 首次启动会自动显示欢迎页面
   - 选择「开始 7 天引导」快速上手

2. **完成 Day 1 任务**
   - 完成第一次 AI 聊天
   - 生成代码
   - 审查 AI 建议

3. **解锁更多功能**
   - 每完成一天的任务，解锁新功能
   - 7 天后成为 Miaoda 专家！

---

## 🎯 核心功能

### 1. 智能上下文引擎 🔍

**自动发现相关代码，零手动选择**

#### 智能搜索
```
快捷键: Cmd+Shift+F (Mac) / Ctrl+Shift+F (Windows)
命令: Miaoda: Smart Context Search
```

**使用场景**:
- 输入「用户认证逻辑」，自动找到所有相关文件
- 基于语义理解，不仅仅是关键词匹配
- 自动分析依赖关系

#### 语义搜索
```
快捷键: Cmd+Alt+F (Mac) / Ctrl+Alt+F (Windows)
命令: Miaoda: Semantic Code Search
```

**使用场景**:
- 搜索「处理用户登录的函数」
- 直接跳转到代码块
- 查看代码上下文

#### 依赖分析
```
命令: Miaoda: Analyze Dependencies
```

**使用场景**:
- 查看当前文件的所有依赖
- 理解模块关系
- 重构时评估影响范围

---

### 2. 透明成本系统 💰

**实时预测成本，节省 40% 开支**

#### 成本预测
```
命令: Miaoda: Predict Cost
```

**使用场景**:
- 执行任务前预估成本
- 查看详细分解（Prompt + Completion）
- 获取更便宜的替代方案

**示例**:
```
任务: 重构用户认证模块
预估成本: $0.0234

详细分解:
• Prompt: $0.0070 (2,333 tokens)
• Completion: $0.0164 (1,167 tokens)

💡 使用 claude-haiku 可节省 $0.0156 (67%)
```

#### 智能模型选择
```
命令: Miaoda: Smart Model Selection
```

**使用场景**:
- 自动选择最优模型
- 平衡性能和成本
- 查看推荐理由

**模型选择逻辑**:
- **简单任务** (复杂度 < 30%) → Haiku（最快最便宜）
- **中等任务** (30-70%) → Sonnet（平衡）
- **复杂任务** (> 70%) → Opus（最强）

#### 成本仪表板
```
快捷键: Cmd+Shift+$ (Mac) / Ctrl+Shift+$ (Windows)
命令: Miaoda: Cost Dashboard
```

**查看内容**:
- 今日/本周/本月成本
- 成本趋势（上升/下降/稳定）
- 最昂贵的任务
- 潜在节省建议

#### 优化建议
```
命令: Miaoda: Cost Optimization Suggestions
```

**4 类优化**:
1. **启用缓存** - 节省重复查询成本
2. **使用更便宜的模型** - 简单任务用 Haiku
3. **批处理请求** - 合并小请求
4. **优化提示词** - 减少 token 数量

---

### 3. 代码质量守护 🛡️

**四层质量检查，自动修复问题**

#### 完整质量检查
```
快捷键: Cmd+Shift+Q (Mac) / Ctrl+Shift+Q (Windows)
命令: Miaoda: Full Quality Check
```

**检查内容**:
- **Layer 1**: 静态分析（ESLint, TypeScript, 安全扫描）
- **Layer 2**: AI 审查（架构、最佳实践、性能）
- **Layer 3**: 自动修复（零成本）
- **Layer 4**: 质量评分（0-100 分，A-F 等级）

**报告示例**:
```
📊 代码质量报告

总体评分: B (82/100)

详细分数:
• 正确性: 90/100
• 可维护性: 75/100
• 性能: 85/100
• 安全性: 80/100
• 代码风格: 80/100

静态分析: 12 个问题
• [high] 未处理的 Promise 拒绝 - Line 45
• [medium] 变量未使用 - Line 78
• ...

AI 审查: 3/5 ⭐
• [maintainability] 函数过长 (85 行)
• [performance] 嵌套循环可优化

自动修复: 8 个可修复
```

#### 静态分析
```
命令: Miaoda: Static Analysis
```

**检查项**:
- ESLint 规则
- TypeScript 类型错误
- 安全漏洞（eval, innerHTML, 硬编码密码）

#### AI 审查
```
命令: Miaoda: AI Code Review
```

**审查维度**:
- 架构设计
- 最佳实践
- 性能优化
- 安全性
- 可维护性

#### 自动修复
```
命令: Miaoda: Auto Fix Issues
```

**修复类型**:
- var → const/let
- 缺少分号
- 引号风格
- 其他 ESLint 可修复问题

**零成本**: 自动修复不消耗 AI 额度！

#### 质量评分
```
命令: Miaoda: Quality Score
```

**评分标准**:
- **A (90-100)**: 优秀 🏆
- **B (80-89)**: 良好 ✅
- **C (70-79)**: 及格 ⚠️
- **D (60-69)**: 需改进 ❌
- **F (< 60)**: 不合格 💀

#### 质量趋势
```
命令: Miaoda: Quality Trend
```

**查看内容**:
- 历史评分记录
- 趋势方向（改善/下降/稳定）
- 变化幅度

---

### 4. 渐进式引导 🎓

**7 天从新手到专家**

#### 7 天成长计划

**Day 1: 基础操作**
- 完成第一次 AI 聊天
- 生成代码
- 审查 AI 建议
- 🎁 解锁 Code Review 功能

**Day 2: 快捷键大师**
- 使用快捷操作面板
- 尝试数字快捷键 (1-8)
- 执行 Skill
- 🎁 解锁 Agent Team 功能

**Day 3: 智能上下文**
- 智能搜索
- 语义搜索
- 依赖分析
- 🎁 解锁成本优化功能

**Day 4: 成本优化**
- 查看成本仪表板
- 成本预测
- 应用优化建议
- 🎁 解锁代码质量守护

**Day 5: 质量保证**
- 代码审查
- 代码验证
- 自动修复
- 🎁 解锁 Agent 并行执行

**Day 6: Agent 团队**
- 启动 Agent Team
- 并行执行
- 查看 Agent 池
- 🎁 解锁高级功能

**Day 7: 高级功能**
- 智能提交
- 功能规划
- 生成文档
- 🎁 Miaoda 专家徽章 🏆

#### 查看进度
```
命令: Miaoda: View Learning Progress
```

**显示内容**:
- 当前天数
- 完成任务数
- 完成度百分比
- 当前等级
- 已获得成就

#### 功能推荐
```
命令: Miaoda: Get Feature Recommendation
```

**智能推荐**:
- 基于使用模式
- 推荐下一个功能
- 提供使用理由

**示例**:
```
💡 推荐功能: Agent Team

理由: 你已经生成了很多代码，
尝试多 Agent 并行执行，3-5x 加速！

[立即尝试] [稍后]
```

#### 查看成就
```
命令: Miaoda: View Achievements
```

**成就类型**:
- 🌟 初次尝试 - 完成第一个任务
- 🎯 基础掌握 - 完成 Day 1
- ⚡ 快速成长 - 达到 Level 50
- 🏆 Miaoda 专家 - 完成 7 天引导

---

## ⚡ 快捷操作

### 快捷操作面板
```
快捷键: Cmd+Shift+Q (Mac) / Ctrl+Shift+Q (Windows)
命令: Miaoda: Show Quick Actions
```

**数字快捷键 (1-8)**:
1. 📝 智能提交 - 自动生成 commit 消息
2. 🔍 代码审查 - 深度两阶段审查
3. 🧪 编写测试 - TDD 工作流
4. 📋 规划功能 - 6 步开发流程
5. 🐛 调试问题 - 系统性调试
6. 💡 头脑风暴 - 探索想法和方案
7. ✅ 验证代码 - 质量验证
8. 📖 写文档 - 生成文档

---

## 🎮 Agent 系统

### Agent 团队
```
快捷键: Cmd+Shift+A (Mac) / Ctrl+Shift+A (Windows)
命令: Miaoda: Start Agent Team
```

**功能**:
- 多 Agent 并行执行
- 3-5x 速度提升
- 实时可视化

### 速度对比
```
命令: Miaoda: Show Speed Comparison
```

**对比内容**:
- Cursor vs Miaoda
- 实时动画展示
- 3x 速度优势

### Agent 可视化
```
命令: Miaoda: Show Agent Visualization
```

**显示内容**:
- 3 个 Agent 工作状态
- 实时进度
- 透明展示协作

### Agent 池统计
```
命令: Miaoda: Show Agent Pool Stats
```

**统计信息**:
- 总数 / 空闲 / 忙碌 / 错误
- 已完成任务数
- 队列中任务数

---

## 🔧 高级功能

### Skill 系统

#### 执行 Skill
```
快捷键: Cmd+Shift+K (Mac) / Ctrl+Shift+K (Windows)
命令: Miaoda: Execute Skill
```

#### 搜索 Skill
```
命令: Miaoda: Search Skills
```

#### 热门 Skill
```
命令: Miaoda: Trending Skills
```

### AI 模型管理

#### 选择模型
```
命令: Miaoda: Select AI Model
```

**可用模型**:
- Claude Opus 4.6 - 最强性能
- Claude Sonnet 4.6 - 平衡性能和成本
- Claude Haiku 4.5 - 最快最便宜

#### 添加自定义模型
```
命令: Miaoda: Add API Key
```

**支持提供商**:
- Claude (Anthropic)
- OpenAI

#### 查看模型列表
```
命令: Miaoda: List Models
```

### Quota 系统

#### 查看额度详情
```
命令: Miaoda: Show Quota Details
```

**显示内容**:
- 当前额度 / 总额度
- 使用百分比
- 今日使用量

**状态栏显示**:
```
⚡ 45/50  (90%)
```

---

## 💡 使用技巧

### 1. 成本优化

**最佳实践**:
- ✅ 简单任务用 Haiku（快 + 便宜）
- ✅ 启用查询缓存（节省 90%）
- ✅ 批处理小请求（节省 20%）
- ✅ 优化提示词长度（节省 30%）

**避免**:
- ❌ 所有任务都用 Opus
- ❌ 重复相同查询
- ❌ 过长的提示词

### 2. 质量保证

**最佳实践**:
- ✅ 代码生成后立即运行质量检查
- ✅ 应用自动修复（零成本）
- ✅ 定期查看质量趋势
- ✅ 保持质量评分 > 80 分

**避免**:
- ❌ 忽略质量警告
- ❌ 跳过代码审查
- ❌ 不修复安全问题

### 3. 上下文管理

**最佳实践**:
- ✅ 使用智能搜索自动发现相关代码
- ✅ 依赖分析理解模块关系
- ✅ 让历史学习优化推荐

**避免**:
- ❌ 手动选择大量文件
- ❌ 包含无关代码

### 4. 学习路径

**最佳实践**:
- ✅ 完成 7 天引导计划
- ✅ 每天完成所有任务
- ✅ 解锁所有成就
- ✅ 达到 Level 100+

**避免**:
- ❌ 跳过引导
- ❌ 不尝试新功能

---

## 🆘 常见问题

### Q: 如何开始使用？
A: 首次启动选择「开始 7 天引导」，按照每日任务学习。

### Q: 如何节省成本？
A:
1. 查看成本仪表板 (Cmd+Shift+$)
2. 应用优化建议
3. 启用缓存和自动模型选择
4. 预期节省 40%

### Q: 如何提高代码质量？
A:
1. 运行完整质量检查 (Cmd+Shift+Q)
2. 应用自动修复（零成本）
3. 查看 AI 审查建议
4. 保持评分 > 80 分

### Q: 如何加速开发？
A:
1. 启动 Agent Team (Cmd+Shift+A)
2. 使用并行执行
3. 预期 3-5x 加速

### Q: 如何找到相关代码？
A:
1. 使用智能搜索 (Cmd+Shift+F)
2. 输入语义描述（不是关键词）
3. 自动发现相关文件

### Q: 支持哪些语言？
A: TypeScript, JavaScript, Python, Go, Rust, Java, C++

### Q: 支持哪些 AI 模型？
A: Claude Opus/Sonnet/Haiku, OpenAI GPT 系列，支持自定义模型

### Q: 如何查看使用统计？
A:
- 成本: Cmd+Shift+$
- 质量: Miaoda: Quality Trend
- 进度: Miaoda: View Learning Progress
- Agent: Miaoda: Show Agent Pool Stats

---

## 📚 更多资源

- **竞争优势报告**: `COMPETITIVE_ADVANTAGE.md`
- **Q2 交付报告**: `Q2_2026_DELIVERY.md`
- **完整总结**: `COMPLETE_SUMMARY.md`
- **快速启动**: `QUICKSTART.md`

---

## 🎊 开始你的 Miaoda 之旅！

1. 启动 Miaoda IDE
2. 开始 7 天引导
3. 完成 Day 1 任务
4. 解锁更多功能
5. 成为 Miaoda 专家！

**祝你编码愉快！⚡**
