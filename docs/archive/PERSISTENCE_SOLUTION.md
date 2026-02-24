# Miaoda IDE 持久化存储解决方案

## 🎯 目标

为 Miaoda IDE 构建强大的项目记忆和上下文理解能力：

1. **项目上下文记忆** - 记住项目结构、代码关系、开发历史
2. **对话历史持久化** - 完整保存 AI 对话，支持快速检索
3. **代码理解和索引** - 语义级别的代码搜索和理解
4. **快速检索能力** - 毫秒级响应
5. **可靠性和性能** - 数据不丢失，性能稳定

---

## 📊 方案对比

### 方案 1: SQLite（当前）

**架构：**
```
Miaoda IDE
    ↓
  SQLite
    ↓
本地文件系统
```

**优势：**
- ✅ 零依赖，开箱即用
- ✅ 事务支持，ACID 保证
- ✅ 成熟稳定，广泛使用
- ✅ SQL 查询能力强

**劣势：**
- ❌ 无语义搜索
- ❌ 无向量检索
- ❌ 大数据性能受限
- ❌ 无智能推荐

**适用场景：**
- 配置存储
- 会话元数据
- 结构化数据

---

### 方案 2: OpenViking（字节跳动）

**架构：**
```
Miaoda IDE
    ↓
 OpenViking
    ↓
向量存储引擎
```

**特点：**
- 🔍 向量数据库
- 🚀 高性能检索
- 🧠 语义搜索
- 🏢 企业级方案

**优势：**
- ✅ 语义搜索能力强
- ✅ 大规模数据支持
- ✅ 性能优秀
- ✅ 企业级稳定性

**劣势：**
- ❌ 需要独立部署
- ❌ 资源占用高
- ❌ 复杂度增加
- ❌ 可能需要付费

**适用场景：**
- 大规模代码库
- 企业级部署
- 云端服务

---

### 方案 3: Wayfind Intent Engine

**架构：**
```
Miaoda IDE
    ↓
Intent Engine
    ↓
意图理解层
```

**特点：**
- 🎯 意图识别
- 🔄 上下文管理
- 🤖 智能路由

**优势：**
- ✅ 意图理解能力
- ✅ 上下文感知
- ✅ 智能决策

**劣势：**
- ❌ 不是存储方案
- ❌ 需要额外集成
- ❌ 学习成本高

**适用场景：**
- AI Agent 编排
- 意图识别
- 智能路由

---

### 方案 4: 混合架构（推荐）

**架构：**
```
┌─────────────────────────────────────────────┐
│           Miaoda IDE 应用层                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      统一存储接口（Unified Storage API）     │
│  - 自动路由                                  │
│  - 智能缓存                                  │
│  - 数据同步                                  │
└─────────────────────────────────────────────┘
         ↓              ↓              ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Layer 1     │ │  Layer 2     │ │  Layer 3     │
│              │ │              │ │              │
│  SQLite      │ │  Vector DB   │ │  File Index  │
│              │ │              │ │              │
│  结构化数据   │ │  语义搜索    │ │  快速检索    │
│  - 配置      │ │  - 代码嵌入  │ │  - 文件索引  │
│  - 会话      │ │  - 语义搜索  │ │  - 符号表    │
│  - 元数据    │ │  - 相似度    │ │  - AST 缓存  │
└──────────────┘ └──────────────┘ └──────────────┘
```

**优势：**
- ✅ 结合各方案优势
- ✅ 灵活可扩展
- ✅ 性能最优
- ✅ 渐进式增强

---

## 🏗️ 推荐实施方案

### Phase 1: 增强 SQLite（立即实施）

**目标：** 解决当前 SQLite 编译问题，增强基础能力

#### 1.1 修复 SQLite 编译

```bash
# 方案 A: 使用预编译二进制
npm install better-sqlite3

# 方案 B: 使用纯 JS 实现
npm install sql.js

# 方案 C: 使用 Deno SQLite（推荐）
npm install @sqlite.org/sqlite-wasm
```

#### 1.2 增强数据模型

```typescript
// 项目上下文表
CREATE TABLE project_context (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  context_type TEXT NOT NULL, -- 'file' | 'symbol' | 'dependency'
  content TEXT NOT NULL,
  metadata JSON,
  embedding_id TEXT, -- 关联向量 ID
  created_at INTEGER,
  updated_at INTEGER,
  INDEX idx_project_path (project_path),
  INDEX idx_context_type (context_type)
);

// 对话历史表（增强）
CREATE TABLE chat_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_path TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER,
  model TEXT,
  metadata JSON,
  embedding_id TEXT,
  created_at INTEGER,
  INDEX idx_session (session_id),
  INDEX idx_project (project_path),
  FULLTEXT idx_content (content)
);

// 代码索引表
CREATE TABLE code_index (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_type TEXT NOT NULL, -- 'function' | 'class' | 'variable'
  line_start INTEGER,
  line_end INTEGER,
  signature TEXT,
  doc_comment TEXT,
  references JSON, -- 引用关系
  embedding_id TEXT,
  updated_at INTEGER,
  INDEX idx_file (file_path),
  INDEX idx_symbol (symbol_name),
  FULLTEXT idx_doc (doc_comment)
);

// 项目知识图谱
CREATE TABLE knowledge_graph (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'file' | 'function' | 'class' | 'concept'
  entity_id TEXT NOT NULL,
  relation_type TEXT NOT NULL, -- 'imports' | 'calls' | 'extends' | 'related'
  target_id TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  metadata JSON,
  INDEX idx_entity (entity_id),
  INDEX idx_target (target_id),
  INDEX idx_relation (relation_type)
);
```

#### 1.3 全文搜索增强

```typescript
// 使用 SQLite FTS5 全文搜索
CREATE VIRTUAL TABLE chat_fts USING fts5(
  content,
  content='chat_history',
  content_rowid='id'
);

CREATE VIRTUAL TABLE code_fts USING fts5(
  symbol_name,
  doc_comment,
  content='code_index',
  content_rowid='id'
);
```

---

### Phase 2: 集成轻量级向量搜索（1-2周）

**目标：** 添加语义搜索能力，无需额外服务

#### 2.1 选择方案：Transformers.js（推荐）

```typescript
import { pipeline } from '@xenova/transformers';

// 本地运行，无需服务器
const embedder = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2'
);

// 生成代码嵌入
const codeEmbedding = await embedder(codeSnippet);

// 存储到 SQLite
INSERT INTO embeddings (id, vector, source_id)
VALUES (?, ?, ?);
```

**优势：**
- ✅ 纯 JavaScript，无需 Python
- ✅ 本地运行，无需网络
- ✅ 轻量级（~50MB）
- ✅ 性能良好

#### 2.2 向量存储

```typescript
// 使用 SQLite 存储向量
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'code' | 'chat' | 'doc'
  source_id TEXT NOT NULL,
  vector BLOB NOT NULL, -- Float32Array
  dimension INTEGER NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER,
  INDEX idx_source (source_id)
);

// 向量相似度搜索（使用扩展）
// 方案 A: sqlite-vss 扩展
// 方案 B: 纯 JS 实现余弦相似度
```

#### 2.3 语义搜索实现

```typescript
class SemanticSearch {
  async searchSimilarCode(query: string, limit: number = 10) {
    // 1. 生成查询向量
    const queryVector = await this.embedder(query);

    // 2. 计算相似度
    const results = await this.db.all(`
      SELECT
        e.source_id,
        c.content,
        cosine_similarity(e.vector, ?) as similarity
      FROM embeddings e
      JOIN code_index c ON e.source_id = c.id
      WHERE e.source_type = 'code'
      ORDER BY similarity DESC
      LIMIT ?
    `, [queryVector, limit]);

    return results;
  }

  async findRelatedContext(currentFile: string) {
    // 基于当前文件找相关代码
    const fileEmbedding = await this.getFileEmbedding(currentFile);
    return this.searchSimilarCode(fileEmbedding, 5);
  }
}
```

---

### Phase 3: 智能上下文管理（1个月）

**目标：** 构建项目记忆和智能推荐系统

#### 3.1 项目上下文管理器

```typescript
class ProjectContextManager {
  // 项目分析
  async analyzeProject(projectPath: string) {
    // 1. 扫描文件结构
    const files = await this.scanFiles(projectPath);

    // 2. 解析代码（AST）
    const symbols = await this.parseSymbols(files);

    // 3. 构建依赖图
    const dependencies = await this.buildDependencyGraph(symbols);

    // 4. 生成嵌入
    const embeddings = await this.generateEmbeddings(symbols);

    // 5. 存储到数据库
    await this.saveToDatabase({
      files,
      symbols,
      dependencies,
      embeddings
    });
  }

  // 智能上下文推荐
  async getRelevantContext(query: string, currentFile: string) {
    // 1. 当前文件上下文
    const fileContext = await this.getFileContext(currentFile);

    // 2. 语义相关代码
    const semanticContext = await this.semanticSearch.search(query);

    // 3. 依赖关系
    const dependencies = await this.getDependencies(currentFile);

    // 4. 历史对话
    const chatHistory = await this.getChatHistory(currentFile);

    // 5. 智能排序和合并
    return this.mergeAndRank([
      fileContext,
      semanticContext,
      dependencies,
      chatHistory
    ]);
  }
}
```

#### 3.2 对话历史智能检索

```typescript
class ChatHistoryManager {
  // 智能检索历史对话
  async searchRelevantHistory(query: string, projectPath: string) {
    // 1. 全文搜索
    const ftsResults = await this.fullTextSearch(query);

    // 2. 语义搜索
    const semanticResults = await this.semanticSearch(query);

    // 3. 项目相关
    const projectResults = await this.getProjectHistory(projectPath);

    // 4. 时间衰减
    const timeWeighted = this.applyTimeDecay([
      ...ftsResults,
      ...semanticResults,
      ...projectResults
    ]);

    // 5. 去重和排序
    return this.deduplicateAndRank(timeWeighted);
  }

  // 自动总结
  async summarizeSession(sessionId: string) {
    const messages = await this.getSession(sessionId);

    // 提取关键信息
    const summary = {
      topics: this.extractTopics(messages),
      decisions: this.extractDecisions(messages),
      codeChanges: this.extractCodeChanges(messages),
      nextSteps: this.extractNextSteps(messages)
    };

    return summary;
  }
}
```

---

### Phase 4: 高级功能（可选，2-3个月）

#### 4.1 集成专业向量数据库（可选）

如果需要处理超大规模代码库（100万+ 文件），可以集成：

**选项 A: Chroma（推荐）**
```typescript
import { ChromaClient } from 'chromadb';

const client = new ChromaClient();
const collection = await client.createCollection({
  name: 'miaoda-code',
  metadata: { 'hnsw:space': 'cosine' }
});

// 添加代码嵌入
await collection.add({
  ids: ['file1', 'file2'],
  embeddings: [embedding1, embedding2],
  metadatas: [{ path: '/src/a.ts' }, { path: '/src/b.ts' }]
});

// 查询
const results = await collection.query({
  queryEmbeddings: [queryEmbedding],
  nResults: 10
});
```

**优势：**
- ✅ 开源免费
- ✅ 易于集成
- ✅ 性能优秀
- ✅ 支持本地部署

**选项 B: Qdrant**
```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({ url: 'http://localhost:6333' });

await client.upsert('miaoda-code', {
  points: [
    {
      id: 1,
      vector: embedding,
      payload: { file: '/src/a.ts', type: 'function' }
    }
  ]
});
```

#### 4.2 知识图谱可视化

```typescript
class KnowledgeGraphVisualizer {
  async generateGraph(projectPath: string) {
    // 1. 获取所有关系
    const relations = await this.db.all(`
      SELECT * FROM knowledge_graph
      WHERE project_path = ?
    `, [projectPath]);

    // 2. 构建图结构
    const graph = {
      nodes: this.extractNodes(relations),
      edges: this.extractEdges(relations)
    };

    // 3. 使用 D3.js 或 Cytoscape.js 可视化
    return graph;
  }
}
```

---

## 🎯 最终推荐方案

### 短期（立即实施）

```
┌─────────────────────────────────────┐
│        Miaoda IDE                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Enhanced SQLite Storage           │
│   - 全文搜索（FTS5）                 │
│   - 项目上下文表                     │
│   - 代码索引表                       │
│   - 知识图谱表                       │
└─────────────────────────────────────┘
```

**优势：**
- ✅ 零额外依赖
- ✅ 立即可用
- ✅ 性能良好
- ✅ 满足 80% 需求

### 中期（1-2周）

```
┌─────────────────────────────────────┐
│        Miaoda IDE                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Unified Storage Layer             │
└─────────────────────────────────────┘
       ↓                    ↓
┌──────────────┐    ┌──────────────────┐
│   SQLite     │    │ Transformers.js  │
│   结构化数据  │    │ 语义搜索         │
└──────────────┘    └──────────────────┘
```

**优势：**
- ✅ 语义搜索能力
- ✅ 本地运行
- ✅ 无需额外服务
- ✅ 满足 95% 需求

### 长期（可选）

```
┌─────────────────────────────────────┐
│        Miaoda IDE                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Unified Storage API               │
└─────────────────────────────────────┘
   ↓           ↓            ↓
┌──────┐  ┌──────────┐  ┌─────────┐
│SQLite│  │Transformers│ │ Chroma  │
│      │  │.js        │  │(可选)   │
└──────┘  └──────────┘  └─────────┘
```

**优势：**
- ✅ 企业级能力
- ✅ 超大规模支持
- ✅ 灵活扩展
- ✅ 满足 100% 需求

---

## 📝 实施计划

### Week 1: 修复 SQLite + 增强数据模型
- [ ] 修复 SQLite 编译问题
- [ ] 创建增强的数据表
- [ ] 实现全文搜索
- [ ] 迁移现有数据

### Week 2: 集成 Transformers.js
- [ ] 集成 Transformers.js
- [ ] 实现代码嵌入生成
- [ ] 实现语义搜索
- [ ] 测试性能

### Week 3-4: 智能上下文管理
- [ ] 项目分析器
- [ ] 上下文推荐
- [ ] 对话历史智能检索
- [ ] 知识图谱构建

### Month 2+: 高级功能（可选）
- [ ] 集成 Chroma（如需要）
- [ ] 知识图谱可视化
- [ ] 性能优化
- [ ] 云端同步

---

## 🎯 预期效果

### 用户体验提升

**Before:**
```
用户: "这个函数在哪里定义的？"
IDE: [搜索文件名] → 需要手动查找
```

**After:**
```
用户: "这个函数在哪里定义的？"
IDE:
  ✅ 直接定位到定义位置
  ✅ 显示所有引用
  ✅ 推荐相关代码
  ✅ 显示历史讨论
```

### 性能指标

| 操作 | 目标 | 预期 |
|------|------|------|
| 全文搜索 | < 100ms | ~50ms |
| 语义搜索 | < 500ms | ~200ms |
| 上下文加载 | < 200ms | ~100ms |
| 项目分析 | < 30s | ~10s |

### 能力提升

- ✅ **记忆能力**: 记住所有项目上下文和对话历史
- ✅ **理解能力**: 语义级别理解代码和意图
- ✅ **推荐能力**: 智能推荐相关代码和上下文
- ✅ **检索能力**: 毫秒级精准检索
- ✅ **可靠性**: 数据持久化，不丢失

---

## 💡 总结

**推荐方案：SQLite + Transformers.js 混合架构**

**理由：**
1. ✅ 无需额外服务，开箱即用
2. ✅ 本地运行，隐私安全
3. ✅ 性能优秀，满足需求
4. ✅ 渐进式增强，灵活扩展
5. ✅ 成本低，维护简单

**vs OpenViking:**
- OpenViking 适合云端大规模部署
- 我们的方案适合本地 IDE，更轻量

**vs Intent Engine:**
- Intent Engine 是意图理解层
- 我们的方案是存储层
- 可以结合使用

**最佳实践：**
- Phase 1: 增强 SQLite（立即）
- Phase 2: 集成 Transformers.js（1-2周）
- Phase 3: 智能上下文（1个月）
- Phase 4: 可选高级功能（按需）

---

**Miaoda IDE** - 更强的记忆，更好的理解，更完美的结果！
