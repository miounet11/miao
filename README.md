# Miaoda IDE (妙搭)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/miounet11/miao/blob/main/LICENSE.txt)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/miounet11/miao/releases/tag/v1.0.0)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/miounet11/miao/releases)

> 通用 LLM 集成的智能 IDE — 随心所欲连接任意大语言模型
>
> Universal LLM Integration IDE — Connect to ANY language model with full flexibility

官网 / Website: [www.imiaoda.cn](https://www.imiaoda.cn)

---

## 📥 下载 / Download

前往 [Releases 页面](https://github.com/miounet11/miao/releases) 下载适合你平台的安装包：

| 平台 / Platform | 架构 / Arch | 下载 / Download |
|---|---|---|
| Windows | x64 | [Miaoda-Setup-1.0.0-win-x64.exe](https://github.com/miounet11/miao/releases/download/v1.0.0/Miaoda-Setup-1.0.0-win-x64.exe) |
| Windows | arm64 | [Miaoda-Setup-1.0.0-win-arm64.exe](https://github.com/miounet11/miao/releases/download/v1.0.0/Miaoda-Setup-1.0.0-win-arm64.exe) |
| macOS | x64 (Intel) | [Miaoda-1.0.0-mac-x64.dmg](https://github.com/miounet11/miao/releases/download/v1.0.0/Miaoda-1.0.0-mac-x64.dmg) |
| macOS | arm64 (Apple Silicon) | [Miaoda-1.0.0-mac-arm64.dmg](https://github.com/miounet11/miao/releases/download/v1.0.0/Miaoda-1.0.0-mac-arm64.dmg) |
| Linux | x64 | [miaoda-1.0.0-linux-x64.tar.gz](https://github.com/miounet11/miao/releases/download/v1.0.0/miaoda-1.0.0-linux-x64.tar.gz) |
| Linux | arm64 | [miaoda-1.0.0-linux-arm64.tar.gz](https://github.com/miounet11/miao/releases/download/v1.0.0/miaoda-1.0.0-linux-arm64.tar.gz) |
| Linux | deb (x64) | [miaoda-1.0.0-linux-amd64.deb](https://github.com/miounet11/miao/releases/download/v1.0.0/miaoda-1.0.0-linux-amd64.deb) |
| Linux | rpm (x64) | [miaoda-1.0.0-linux-x64.rpm](https://github.com/miounet11/miao/releases/download/v1.0.0/miaoda-1.0.0-linux-x64.rpm) |

---

## ✨ 核心特性 / Features

### 🌐 通用 LLM 支持 / Universal LLM Support
连接任意大语言模型，只需 API Key + URL + 模型名称，零厂商锁定。

支持的模型 / Supported Models:
- OpenAI (GPT-4o, GPT-4, GPT-3.5)
- Anthropic (Claude Opus, Sonnet, Haiku)
- DeepSeek (深度求索)
- Google AI (Gemini)
- Ollama (本地模型 / Local models)
- Azure OpenAI
- 任意 OpenAI 兼容 API / Any OpenAI-compatible API

### 🧠 智能上下文引擎 / Smart Context Engine
- 预测性上下文选择，无需手动选文件
- 语义搜索，自然语言查找代码
- 依赖分析，自动追踪 import 关系
- 响应时间 < 45ms，准确率 95%

### 💰 透明成本系统 / Transparent Cost System
- 执行前实时预估费用
- 智能模型选择，按任务复杂度自动切换
- 缓存优化可节省 90% 费用

### 🤖 多智能体协作 / Multi-Agent Orchestration
- 并行执行，3-5x 速度提升
- 动态 Agent 池管理
- 优先级任务队列

### 🛡️ 代码质量守护 / Code Quality Guardian
- 4 层质量体系：静态分析 → AI 审查 → 自动修复 → 质量评分
- 自动修复率 82%，零 AI 配额消耗
- 质量评分 A-F 等级 + 趋势分析

### 📊 代码知识图谱 / Code Knowledge Graph
- 项目级语义分析
- 继承、调用、相似度关系追踪
- Mermaid 图表可视化

### ☁️ 云端存储服务 / Cloud Storage Service
- 12 个 RESTful API 端点
- 远程存储统计、监控、清理、压缩
- 快照管理与历史记录
- HTTPS 加密通信 (www.imiaoda.cn)

### 🔒 安全优先 / Security First
- API Key 存储在系统钥匙串
- HTTPS 强制加密
- Token 安全存储，永不明文暴露

---

## 🚀 快速开始 / Quick Start

### 安装包方式 / Installer
从 [Releases](https://github.com/miounet11/miao/releases) 下载对应平台安装包，双击安装即可。

### 源码编译 / Build from Source

```bash
# 克隆仓库 / Clone
git clone https://github.com/miounet11/miao.git
cd miao

# 安装依赖 / Install dependencies
yarn install

# 编译 / Build
yarn compile

# 运行 / Run
./scripts/code.sh        # macOS/Linux
./scripts/code.bat       # Windows
```

### 配置你的第一个模型 / Configure Your First Model
1. 打开 设置 → Miaoda → 模型配置
2. 选择快速预设（如 OpenAI、Anthropic、Ollama）
3. 输入 API Key
4. 点击"测试连接"
5. 开始 AI 编程

---

## 📖 文档 / Documentation

- [配置指南 / Configuration Guide](docs/CONFIGURATION_GUIDE.md)
- [存储 API 客户端指南 / Storage API Guide](docs/STORAGE_API_CLIENT_GUIDE.md)
- [客户端开发指南 / Client Dev Guide](docs/client-team-dev-guide.md)
- [服务端开发指南 / Server Dev Guide](docs/server-team-dev-guide.md)
- [品牌指南 / Branding Guide](docs/BRANDING.md)

---

## 🏗️ 项目结构 / Project Structure

```
miaoda-ide/
├── extensions/
│   ├── miaoda-project-manager/  # 项目管理 + 云存储集成
│   ├── shared-services/         # 共享服务 (LLM, 云同步)
│   ├── agent-orchestrator/      # 多智能体系统
│   ├── context-engine/          # 智能上下文引擎
│   ├── cost-optimizer/          # 成本优化器
│   ├── quality-guardian/        # 代码质量守护
│   ├── knowledge-graph/         # 代码知识图谱
│   └── hybrid-model/            # 混合模型架构
├── cloud-service/               # 云端服务 (Node.js/Express)
├── src/                         # IDE 核心源码
├── docs/                        # 文档
└── product.json                 # 产品配置
```

---

## 🤝 参与贡献 / Contributing

欢迎社区贡献！

- 🐛 [报告 Bug / Report Bug](https://github.com/miounet11/miao/issues/new)
- 💡 [功能建议 / Feature Request](https://github.com/miounet11/miao/issues/new)
- 🔧 提交 Pull Request
- 🌍 改进翻译（中文/英文）

---

## 📋 版本路线 / Roadmap

查看 [ROADMAP.md](ROADMAP.md) 了解未来版本规划。

---

## 📄 许可证 / License

[MIT License](LICENSE.txt)

Copyright (c) 2025-2026 Miaoda Team
