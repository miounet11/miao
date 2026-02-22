# Miaoda IDE 完整实施路线图

## 📋 总览

本文档整合了以下三个核心需求的实施方案：

1. **多语言支持**（英语、中文、日文）
2. **SSH 远程开发支持**
3. **增强的持久化存储**（项目记忆和上下文理解）

---

## 🎯 Phase 1: 基础设施修复（Week 1）

### 1.1 修复 SQLite 编译问题

**问题：**
```
Cannot find module '../build/Release/vscode-sqlite3.node'
```

**解决方案：**

```bash
# 方案 A: 使用 better-sqlite3（推荐）
cd /Users/lu/ide/miaoda-ide
npm install better-sqlite3

# 方案 B: 使用 sql.js（纯 JS，无需编译）
npm install sql.js

# 方案 C: 禁用 SQLite，使用 JSON
# 已经有 fallback 机制
```

**修改代码：**
```typescript
// src/vs/base/parts/storage/node/storage.ts
try {
  const sqlite3 = require('better-sqlite3');
  // 使用 better-sqlite3
} catch (e) {
  // Fallback to JSON storage
  console.warn('SQLite not available, using JSON storage');
}
```

### 1.2 修复语言包兼容性

**问题：**
```
Can't install 'ms-ceintl.vscode-language-pack-zh-hans' 
because it is not compatible with version 0.1.0
```

**解决方案：内置语言包**

```bash
# 创建内置语言包
mkdir -p extensions/miaoda-language-pack-zh-hans
mkdir -p extensions/miaoda-language-pack-ja
mkdir -p extensions/miaoda-language-pack-en
```

---

## 🌍 Phase 2: 多语言支持（Week 1-2）

### 2.1 创建语言包结构

```
extensions/
├── miaoda-language-pack-zh-hans/
│   ├── package.json
│   ├── translations/
│   │   └── main.i18n.json
│   └── README.md
├── miaoda-language-pack-ja/
│   ├── package.json
│   ├── translations/
│   │   └── main.i18n.json
│   └── README.md
└── miaoda-language-pack-en/
    ├── package.json
    └── README.md
```

### 2.2 首次启动语言选择

**创建欢迎扩展：**
```
extensions/miaoda-welcome/
├── package.json
├── src/
│   ├── extension.ts
│   └── languageSelector.ts
└── media/
    └── welcome.html
```

**功能：**
- ✅ 首次启动显示语言选择界面
- ✅ 三种语言：英语、中文、日文
- ✅ 选择后自动应用并重启
- ✅ 记住用户选择

### 2.3 翻译关键 UI 元素

**优先翻译：**
- 菜单栏
- 命令面板
- 侧边栏
- 状态栏
- 常用命令
- 错误消息

---

## 🔐 Phase 3: SSH 远程支持（Week 2-3）

### 3.1 创建 Remote-SSH 扩展

```
extensions/miaoda-remote-ssh/
├── package.json
├── src/
│   ├── extension.ts
│   ├── sshConnection.ts      # SSH 连接管理
│   ├── sshFileSystem.ts      # 远程文件系统
│   ├── sshTerminal.ts        # 远程终端
│   ├── sshConfig.ts          # SSH 配置解析
│   └── views/
│       ├── sshTargetsView.ts # SSH 目标列表
│       └── remoteExplorer.ts # 远程资源管理器
└── README.md
```

### 3.2 核心功能

**SSH 连接：**
- ✅ 支持密码认证
- ✅ 支持密钥认证
- ✅ 支持 SSH Agent
- ✅ 读取 ~/.ssh/config
- ✅ 连接状态管理

**远程文件系统：**
- ✅ 浏览远程文件
- ✅ 编辑远程文件
- ✅ 上传/下载文件
- ✅ 创建/删除文件夹
- ✅ 文件搜索

**远程终端：**
- ✅ 交互式 Shell
- ✅ 命令执行
- ✅ 多终端支持
- ✅ 终端历史

**端口转发：**
- ✅ 本地端口转发
- ✅ 远程端口转发
- ✅ 动态端口转发

### 3.3 远程资源管理器 UI

```
┌─────────────────────────────────┐
│  Remote Explorer                │
├─────────────────────────────────┤
│  📁 SSH Targets                 │
│    ├─ 🖥️  Production Server     │
│    ├─ 🖥️  Development Server    │
│    └─ 🖥️  Test Server           │
│                                 │
│  📁 Recent Connections          │
│    └─ 🖥️  prod-server (2h ago) │
│                                 │
│  [+ Add New SSH Host]           │
└─────────────────────────────────┘
```

---

## 💾 Phase 4: 增强持久化存储（Week 3-4）

### 4.1 三层存储架构

```
┌─────────────────────────────────────────┐
│      Unified Storage API                │
└─────────────────────────────────────────┘
     ↓              ↓              ↓
┌──────────┐  ┌──────────────┐  ┌──────────┐
│ SQLite   │  │Transformers.js│ │File Index│
│结构化数据 │  │  语义搜索     │  │快速检索  │
└──────────┘  └──────────────┘  └──────────┘
```

### 4.2 增强数据模型

**新增表：**
```sql
-- 项目上下文
CREATE TABLE project_context (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  context_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSON,
  embedding_id TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- 代码索引
CREATE TABLE code_index (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_type TEXT NOT NULL,
  line_start INTEGER,
  line_end INTEGER,
  signature TEXT,
  doc_comment TEXT,
  embedding_id TEXT,
  updated_at INTEGER
);

-- 知识图谱
CREATE TABLE knowledge_graph (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  metadata JSON
);
```

### 4.3 语义搜索集成

**使用 Transformers.js：**
```typescript
import { pipeline } from '@xenova/transformers';

class SemanticSearch {
  private embedder: any;

  async initialize() {
    this.embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }

  async searchCode(query: string) {
    const queryEmbedding = await this.embedder(query);
    // 在数据库中搜索相似向量
    return this.findSimilar(queryEmbedding);
  }
}
```

### 4.4 智能上下文管理

**功能：**
- ✅ 项目结构分析
- ✅ 代码依赖图谱
- ✅ 语义相似度搜索
- ✅ 智能上下文推荐
- ✅ 对话历史检索
- ✅ 自动会话总结

---

## 📅 完整时间表

### Week 1: 基础修复 + 多语言
- [ ] Day 1-2: 修复 SQLite 编译
- [ ] Day 3-4: 创建内置语言包
- [ ] Day 5: 实现语言选择界面
- [ ] Day 6-7: 测试和优化

### Week 2: SSH 远程支持（基础）
- [ ] Day 1-2: SSH 连接管理
- [ ] Day 3-4: 远程文件系统
- [ ] Day 5: 远程终端
- [ ] Day 6-7: UI 集成和测试

### Week 3: SSH 远程支持（高级）+ 持久化（基础）
- [ ] Day 1-2: 端口转发
- [ ] Day 3-4: 远程资源管理器
- [ ] Day 5: 增强 SQLite 数据模型
- [ ] Day 6-7: 全文搜索集成

### Week 4: 持久化存储（高级）
- [ ] Day 1-2: 集成 Transformers.js
- [ ] Day 3-4: 语义搜索实现
- [ ] Day 5: 智能上下文管理
- [ ] Day 6-7: 测试和优化

---

## 🎯 优先级排序

### P0 - 必须立即完成
1. ✅ 修复 SQLite 编译问题
2. ✅ 创建内置语言包（避免兼容性错误）
3. ✅ 语言选择界面

### P1 - 高优先级（Week 1-2）
4. ✅ SSH 基础连接
5. ✅ 远程文件浏览
6. ✅ 远程终端

### P2 - 中优先级（Week 3）
7. ✅ 增强数据模型
8. ✅ 全文搜索
9. ✅ 端口转发

### P3 - 低优先级（Week 4+）
10. ✅ 语义搜索
11. ✅ 智能上下文
12. ✅ 知识图谱

---

## 🔧 技术栈

### 多语言支持
- VSCode i18n API
- JSON 翻译文件
- 自定义语言选择 UI

### SSH 远程支持
- **ssh2**: SSH 客户端
- **ssh2-sftp-client**: SFTP 文件传输
- VSCode FileSystemProvider API
- VSCode Terminal API

### 持久化存储
- **better-sqlite3**: SQLite 数据库
- **@xenova/transformers**: 本地 AI 模型
- **FTS5**: SQLite 全文搜索
- 自定义向量相似度算法

---

## 📊 预期效果

### 多语言支持
```
Before: 只有英文，中文用户看不懂
After:  支持中英日三语，首次启动选择
```

### SSH 远程支持
```
Before: 无法连接远程服务器
After:  完整的远程开发体验
        - 浏览远程文件
        - 编辑远程代码
        - 运行远程命令
        - 端口转发
```

### 持久化存储
```
Before: 简单的会话存储
After:  智能项目记忆
        - 记住项目结构
        - 理解代码关系
        - 语义搜索代码
        - 智能推荐上下文
        - 快速检索历史
```

---

## 🚀 快速开始

### Step 1: 修复 SQLite
```bash
cd /Users/lu/ide/miaoda-ide
npm install better-sqlite3
npm run compile
```

### Step 2: 创建语言包
```bash
./scripts/create-language-packs.sh
```

### Step 3: 创建 SSH 扩展
```bash
./scripts/create-ssh-extension.sh
```

### Step 4: 测试
```bash
./scripts/code.sh
```

---

## 📝 下一步行动

### 立即执行（今天）
1. 修复 SQLite 编译问题
2. 创建语言包目录结构
3. 实现语言选择界面

### 本周完成
4. 完成三种语言的翻译
5. 开始 SSH 扩展开发
6. 测试多语言切换

### 下周完成
7. 完成 SSH 基础功能
8. 集成远程资源管理器
9. 开始持久化存储增强

---

## 🎉 最终目标

**Miaoda IDE = VSCode 基础 + 多语言支持 + SSH 远程 + 智能记忆**

用户体验：
- ✅ 选择自己的语言（中/英/日）
- ✅ 连接任何远程服务器
- ✅ IDE 记住所有项目上下文
- ✅ 智能推荐相关代码
- ✅ 快速检索历史对话
- ✅ 完美的开发体验

**让 Miaoda IDE 成为真正的下一代开发工具！**

---

**开发者**: Coco 🇨🇳  
**项目**: Miaoda IDE (妙搭)  
**定位**: Universal LLM Integration - Your Way  
**状态**: 🚀 Ready to Build
