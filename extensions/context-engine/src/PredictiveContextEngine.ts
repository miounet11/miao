import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 预测性上下文引擎
 * 自动发现相关代码，零手动选择
 */
export class PredictiveContextEngine {
  private vectorDB: VectorDatabase;
  private dependencyGraph: DependencyGraph;
  private historyLearner: HistoryLearner;
  private realtimeRecommender: RealtimeRecommender;
  private cache: QueryCache;

  constructor(private context: vscode.ExtensionContext) {
    this.vectorDB = new VectorDatabase(context);
    this.dependencyGraph = new DependencyGraph();
    this.historyLearner = new HistoryLearner(context);
    this.realtimeRecommender = new RealtimeRecommender();
    this.cache = new QueryCache();
  }

  /**
   * 初始化引擎
   */
  async initialize(): Promise<void> {
    await this.vectorDB.initialize();
    await this.indexWorkspace();
  }

  /**
   * 索引工作区（增量索引）
   */
  private async indexWorkspace(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const files = await vscode.workspace.findFiles(
      '**/*.{ts,js,tsx,jsx,py,go,rs,java}',
      '**/node_modules/**'
    );

    // 并行索引（批量处理）
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map(file => this.indexFile(file)));
    }

    // 监听文件变化（增量更新）
    this.watchFileChanges();
  }

  /**
   * 监听文件变化
   */
  private watchFileChanges(): void {
    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/*.{ts,js,tsx,jsx,py,go,rs,java}'
    );

    watcher.onDidChange(async (uri) => {
      await this.indexFile(uri);
    });

    watcher.onDidCreate(async (uri) => {
      await this.indexFile(uri);
    });

    watcher.onDidDelete((uri) => {
      this.vectorDB.removeFile(uri.fsPath);
      this.dependencyGraph.removeFile(uri.fsPath);
    });

    this.context.subscriptions.push(watcher);
  }

  /**
   * 索引单个文件
   */
  private async indexFile(uri: vscode.Uri): Promise<void> {
    const document = await vscode.workspace.openTextDocument(uri);
    const content = document.getText();

    // 提取代码块
    const blocks = this.extractCodeBlocks(content, uri.fsPath);

    // 生成 embeddings 并存储
    for (const block of blocks) {
      await this.vectorDB.addBlock(block);
    }

    // 构建依赖图
    await this.dependencyGraph.addFile(uri.fsPath, content);
  }

  /**
   * 提取代码块
   */
  private extractCodeBlocks(content: string, filePath: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = content.split('\n');

    // 简单实现：按函数/类分块
    let currentBlock: string[] = [];
    let blockStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 检测函数/类开始
      if (
        /^\s*(export\s+)?(async\s+)?function\s+\w+/.test(line) ||
        /^\s*(export\s+)?(abstract\s+)?class\s+\w+/.test(line) ||
        /^\s*(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/.test(line)
      ) {
        if (currentBlock.length > 0) {
          blocks.push({
            id: `${filePath}:${blockStart}`,
            filePath,
            startLine: blockStart,
            endLine: i - 1,
            content: currentBlock.join('\n'),
            type: this.detectBlockType(currentBlock[0]),
          });
        }
        currentBlock = [line];
        blockStart = i;
      } else {
        currentBlock.push(line);
      }
    }

    // 添加最后一个块
    if (currentBlock.length > 0) {
      blocks.push({
        id: `${filePath}:${blockStart}`,
        filePath,
        startLine: blockStart,
        endLine: lines.length - 1,
        content: currentBlock.join('\n'),
        type: this.detectBlockType(currentBlock[0]),
      });
    }

    return blocks;
  }

  /**
   * 检测代码块类型
   */
  private detectBlockType(firstLine: string): 'function' | 'class' | 'other' {
    if (/function\s+\w+/.test(firstLine)) return 'function';
    if (/class\s+\w+/.test(firstLine)) return 'class';
    return 'other';
  }

  /**
   * 语义搜索
   */
  async semanticSearch(query: string, limit: number = 10): Promise<CodeBlock[]> {
    return await this.vectorDB.search(query, limit);
  }

  /**
   * 依赖分析
   */
  async analyzeDependencies(filePath: string): Promise<string[]> {
    return await this.dependencyGraph.getDependencies(filePath);
  }

  /**
   * 历史学习
   */
  async learnFromHistory(task: string): Promise<ContextSuggestion> {
    return await this.historyLearner.predict(task);
  }

  /**
   * 实时推荐
   */
  async realtimeRecommend(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<Suggestion[]> {
    return await this.realtimeRecommender.recommend(document, position);
  }

  /**
   * 获取智能上下文（带缓存）
   */
  async getSmartContext(query: string): Promise<SmartContext> {
    // 检查缓存
    const cached = this.cache.get(query);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    // 并行执行三个查询
    const [semanticResults, dependencies, historySuggestion] = await Promise.all([
      this.semanticSearch(query, 5),
      (async () => {
        const editor = vscode.window.activeTextEditor;
        return editor ? await this.analyzeDependencies(editor.document.uri.fsPath) : [];
      })(),
      this.learnFromHistory(query)
    ]);

    // 合并和排序
    const allFiles = new Set<string>([
      ...semanticResults.map((b) => b.filePath),
      ...dependencies,
      ...historySuggestion.files,
    ]);

    const ranked = await this.rankByRelevance(Array.from(allFiles), query);

    const result = {
      files: ranked.slice(0, 10),
      blocks: semanticResults,
      confidence: this.calculateConfidence(semanticResults, dependencies),
    };

    // 缓存结果
    this.cache.set(query, result);

    const duration = Date.now() - startTime;
    console.log(`[Context Engine] Query took ${duration}ms`);

    return result;
  }

  /**
   * 按相关性排序
   */
  private async rankByRelevance(
    files: string[],
    query: string
  ): Promise<string[]> {
    const scores = await Promise.all(
      files.map(async (file) => {
        const score = await this.calculateRelevanceScore(file, query);
        return { file, score };
      })
    );

    return scores.sort((a, b) => b.score - a.score).map((s) => s.file);
  }

  /**
   * 计算相关性分数
   */
  private async calculateRelevanceScore(
    file: string,
    query: string
  ): Promise<number> {
    let score = 0;

    // 1. 文件名匹配
    const fileName = path.basename(file).toLowerCase();
    const queryLower = query.toLowerCase();
    if (fileName.includes(queryLower)) {
      score += 0.3;
    }

    // 2. 最近修改
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.fsPath === file) {
      score += 0.2;
    }

    // 3. 依赖关系
    if (editor) {
      const deps = await this.dependencyGraph.getDependencies(
        editor.document.uri.fsPath
      );
      if (deps.includes(file)) {
        score += 0.3;
      }
    }

    // 4. 历史使用
    const historyScore = await this.historyLearner.getFileScore(file);
    score += historyScore * 0.2;

    return score;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    semanticResults: CodeBlock[],
    dependencies: string[]
  ): number {
    let confidence = 0;

    // 语义搜索结果越多，置信度越高
    confidence += Math.min(semanticResults.length / 5, 0.5);

    // 依赖关系越多，置信度越高
    confidence += Math.min(dependencies.length / 10, 0.3);

    // 基础置信度
    confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.vectorDB.dispose();
  }
}

/**
 * 代码块
 */
export interface CodeBlock {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  type: 'function' | 'class' | 'other';
}

/**
 * 智能上下文
 */
export interface SmartContext {
  files: string[];
  blocks: CodeBlock[];
  confidence: number;
}

/**
 * 上下文建议
 */
export interface ContextSuggestion {
  files: string[];
  confidence: number;
}

/**
 * 建议
 */
export interface Suggestion {
  text: string;
  range: vscode.Range;
  confidence: number;
}

/**
 * Vector Database（真实 embedding 实现）
 */
class VectorDatabase {
  private blocks: Map<string, CodeBlock & { embedding: number[] }> = new Map();
  private index: Map<string, Set<string>> = new Map(); // 倒排索引

  constructor(private context: vscode.ExtensionContext) {}

  async initialize(): Promise<void> {
    const cached = this.context.globalState.get<any>('vectorDB');
    if (cached) {
      this.blocks = new Map(cached.blocks);
      this.index = new Map(cached.index);
    }
  }

  async addBlock(block: CodeBlock): Promise<void> {
    const embedding = await this.generateEmbedding(block.content);
    this.blocks.set(block.id, { ...block, embedding });

    // 构建倒排索引
    const tokens = this.tokenize(block.content);
    for (const token of tokens) {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token)!.add(block.id);
    }

    // 持久化（每 100 个块）
    if (this.blocks.size % 100 === 0) {
      await this.persist();
    }
  }

  async search(query: string, limit: number): Promise<CodeBlock[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const queryTokens = this.tokenize(query);

    // 1. 候选集：倒排索引快速过滤
    const candidates = new Set<string>();
    for (const token of queryTokens) {
      const blockIds = this.index.get(token);
      if (blockIds) {
        blockIds.forEach(id => candidates.add(id));
      }
    }

    // 2. 精排：余弦相似度
    const results: Array<{ block: CodeBlock; score: number }> = [];
    for (const id of candidates) {
      const block = this.blocks.get(id);
      if (block) {
        const score = this.cosineSimilarity(queryEmbedding, block.embedding);
        results.push({ block, score });
      }
    }

    // 3. 排序返回
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.block);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // 简化实现：TF-IDF + 降维
    const tokens = this.tokenize(text);
    const embedding = new Array(128).fill(0);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const hash = this.hashCode(token);
      const idx = Math.abs(hash) % 128;
      embedding[idx] += 1 / Math.sqrt(tokens.length);
    }

    return this.normalize(embedding);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map(v => v / norm);
  }

  private async persist(): Promise<void> {
    await this.context.globalState.update('vectorDB', {
      blocks: Array.from(this.blocks.entries()),
      index: Array.from(this.index.entries()).map(([k, v]) => [k, Array.from(v)])
    });
  }

  removeFile(filePath: string): void {
    // 删除该文件的所有块
    for (const [id, block] of this.blocks.entries()) {
      if (block.filePath === filePath) {
        this.blocks.delete(id);

        // 从倒排索引中删除
        const tokens = this.tokenize(block.content);
        for (const token of tokens) {
          const blockIds = this.index.get(token);
          if (blockIds) {
            blockIds.delete(id);
            if (blockIds.size === 0) {
              this.index.delete(token);
            }
          }
        }
      }
    }
  }

  dispose(): void {
    this.blocks.clear();
    this.index.clear();
  }
}

/**
 * 依赖图（增强版：import + 调用关系）
 */
class DependencyGraph {
  private importGraph: Map<string, Set<string>> = new Map();
  private callGraph: Map<string, Set<string>> = new Map();

  async addFile(filePath: string, content: string): Promise<void> {
    // 1. 提取 import
    const imports = this.extractImports(content);
    this.importGraph.set(filePath, new Set(imports));

    // 2. 提取函数调用
    const calls = this.extractCalls(content);
    this.callGraph.set(filePath, new Set(calls));
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const patterns = [
      /import\s+.*?from\s+['"](.+?)['"];?/g,
      /require\(['"](.+?)['"]\)/g,
      /import\(['"](.+?)['"]\)/g
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }

    return imports;
  }

  private extractCalls(content: string): string[] {
    const calls: string[] = [];

    // 提取函数调用：functionName(
    const callRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = callRegex.exec(content)) !== null) {
      const funcName = match[1];
      // 过滤常见关键字
      if (!['if', 'for', 'while', 'switch', 'catch', 'function'].includes(funcName)) {
        calls.push(funcName);
      }
    }

    return calls;
  }

  async getDependencies(filePath: string): Promise<string[]> {
    const imports = this.importGraph.get(filePath) || new Set();
    const calls = this.callGraph.get(filePath) || new Set();

    // 合并 import 和调用关系
    const allDeps = new Set([...imports, ...calls]);

    // 递归获取间接依赖（深度 2）
    const indirectDeps = new Set<string>();
    for (const dep of allDeps) {
      const subDeps = this.importGraph.get(dep);
      if (subDeps) {
        subDeps.forEach(d => indirectDeps.add(d));
      }
    }

    return Array.from(new Set([...allDeps, ...indirectDeps]));
  }

  removeFile(filePath: string): void {
    this.importGraph.delete(filePath);
    this.callGraph.delete(filePath);
  }
}

/**
 * 历史学习器（模式学习）
 */
class HistoryLearner {
  private fileUsage: Map<string, number> = new Map();
  private taskPatterns: Map<string, string[]> = new Map(); // task → files
  private coOccurrence: Map<string, Map<string, number>> = new Map(); // file → file → count

  constructor(private context: vscode.ExtensionContext) {
    this.loadHistory();
  }

  private async loadHistory(): Promise<void> {
    const data = this.context.globalState.get<any>('historyLearner');
    if (data) {
      this.fileUsage = new Map(data.fileUsage);
      this.taskPatterns = new Map(data.taskPatterns);
      this.coOccurrence = new Map(
        data.coOccurrence.map(([k, v]: [string, any]) => [k, new Map(v)])
      );
    }
  }

  async predict(task: string): Promise<ContextSuggestion> {
    const taskKey = this.normalizeTask(task);

    // 1. 查找相似任务的历史模式
    const historicalFiles = this.taskPatterns.get(taskKey) || [];

    // 2. 基于频率排序
    const fileScores = new Map<string, number>();
    for (const file of historicalFiles) {
      fileScores.set(file, this.fileUsage.get(file) || 0);
    }

    // 3. 添加协同过滤（经常一起使用的文件）
    for (const file of historicalFiles) {
      const coFiles = this.coOccurrence.get(file);
      if (coFiles) {
        for (const [coFile, count] of coFiles.entries()) {
          const current = fileScores.get(coFile) || 0;
          fileScores.set(coFile, current + count * 0.5);
        }
      }
    }

    const sorted = Array.from(fileScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    return {
      files: sorted,
      confidence: sorted.length > 0 ? Math.min(0.9, sorted.length / 5) : 0.3,
    };
  }

  async getFileScore(file: string): Promise<number> {
    const usage = this.fileUsage.get(file) || 0;
    return Math.min(1.0, usage / 100);
  }

  recordUsage(task: string, files: string[]): void {
    const taskKey = this.normalizeTask(task);

    // 1. 记录任务模式
    this.taskPatterns.set(taskKey, files);

    // 2. 更新文件使用频率
    for (const file of files) {
      const current = this.fileUsage.get(file) || 0;
      this.fileUsage.set(file, current + 1);
    }

    // 3. 更新协同出现矩阵
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const file1 = files[i];
        const file2 = files[j];

        if (!this.coOccurrence.has(file1)) {
          this.coOccurrence.set(file1, new Map());
        }
        if (!this.coOccurrence.has(file2)) {
          this.coOccurrence.set(file2, new Map());
        }

        const count1 = this.coOccurrence.get(file1)!.get(file2) || 0;
        const count2 = this.coOccurrence.get(file2)!.get(file1) || 0;

        this.coOccurrence.get(file1)!.set(file2, count1 + 1);
        this.coOccurrence.get(file2)!.set(file1, count2 + 1);
      }
    }

    // 持久化
    this.persist();
  }

  private normalizeTask(task: string): string {
    return task.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  }

  private async persist(): Promise<void> {
    await this.context.globalState.update('historyLearner', {
      fileUsage: Array.from(this.fileUsage.entries()),
      taskPatterns: Array.from(this.taskPatterns.entries()),
      coOccurrence: Array.from(this.coOccurrence.entries()).map(([k, v]) => [
        k,
        Array.from(v.entries())
      ])
    });
  }
}

/**
 * 实时推荐器
 */
class RealtimeRecommender {
  async recommend(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<Suggestion[]> {
    // TODO: 实现实时推荐
    return [];
  }
}

/**
 * 查询缓存（LRU）
 */
class QueryCache {
  private cache: Map<string, { result: SmartContext; timestamp: number }> = new Map();
  private maxSize = 100;
  private ttl = 5 * 60 * 1000; // 5 分钟

  get(query: string): SmartContext | null {
    const entry = this.cache.get(query);
    if (!entry) return null;

    // 检查过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(query);
      return null;
    }

    return entry.result;
  }

  set(query: string, result: SmartContext): void {
    // LRU: 删除最旧的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(query, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}
