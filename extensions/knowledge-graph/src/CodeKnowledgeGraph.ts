import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 代码知识图谱
 * 项目级语义理解和知识共享
 */
export class CodeKnowledgeGraph {
  private graph: Graph;
  private indexer: CodeIndexer;
  private analyzer: SemanticAnalyzer;
  private recommender: ContextRecommender;

  constructor(private context: vscode.ExtensionContext) {
    this.graph = new Graph();
    this.indexer = new CodeIndexer();
    this.analyzer = new SemanticAnalyzer();
    this.recommender = new ContextRecommender(this.graph);
  }

  /**
   * 构建知识图谱
   */
  async buildGraph(): Promise<BuildResult> {
    const startTime = Date.now();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }

    // 1. 索引所有文件
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,js,tsx,jsx,py,go,rs,java}',
      '**/node_modules/**'
    );

    let processedFiles = 0;
    let totalNodes = 0;
    let totalEdges = 0;

    for (const file of files) {
      const document = await vscode.workspace.openTextDocument(file);
      const entities = await this.indexer.extractEntities(document);

      // 2. 添加节点
      for (const entity of entities) {
        this.graph.addNode({
          id: entity.id,
          type: entity.type as 'class' | 'function' | 'interface' | 'variable',
          name: entity.name,
          filePath: file.fsPath,
          location: entity.location,
          metadata: entity.metadata,
        });
        totalNodes++;
      }

      // 3. 分析关系
      const relations = await this.analyzer.analyzeRelations(document, entities);
      for (const relation of relations) {
        this.graph.addEdge({
          from: relation.from,
          to: relation.to,
          type: relation.type as 'extends' | 'implements' | 'calls' | 'similar' | 'imports',
          weight: relation.weight,
        });
        totalEdges++;
      }

      processedFiles++;
    }

    // 4. 计算语义相似度
    await this.computeSemanticSimilarity();

    // 5. 持久化
    await this.saveGraph();

    const duration = Date.now() - startTime;

    return {
      processedFiles,
      totalNodes,
      totalEdges,
      duration,
    };
  }

  /**
   * 计算语义相似度
   */
  private async computeSemanticSimilarity(): Promise<void> {
    const nodes = this.graph.getAllNodes();

    // 计算所有节点对的相似度
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = this.analyzer.calculateSimilarity(nodes[i], nodes[j]);

        if (similarity > 0.5) {
          this.graph.addEdge({
            from: nodes[i].id,
            to: nodes[j].id,
            type: 'similar',
            weight: similarity,
          });
        }
      }
    }
  }

  /**
   * 查询知识图谱
   */
  async query(query: string): Promise<QueryResult[]> {
    const queryLower = query.toLowerCase();
    const results: QueryResult[] = [];

    // 1. 名称匹配
    const nodes = this.graph.getAllNodes();
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(queryLower)) {
        const neighbors = this.graph.getNeighbors(node.id);
        results.push({
          node,
          relevance: this.calculateRelevance(node, query),
          neighbors: neighbors.slice(0, 5),
        });
      }
    }

    // 2. 按相关性排序
    results.sort((a, b) => b.relevance - a.relevance);

    return results.slice(0, 20);
  }

  /**
   * 计算相关性
   */
  private calculateRelevance(node: Node, query: string): number {
    let score = 0;

    // 名称匹配
    if (node.name.toLowerCase() === query.toLowerCase()) {
      score += 1.0;
    } else if (node.name.toLowerCase().includes(query.toLowerCase())) {
      score += 0.5;
    }

    // 类型权重
    const typeWeights: { [key: string]: number } = {
      class: 0.3,
      function: 0.2,
      interface: 0.2,
      variable: 0.1,
    };
    score += typeWeights[node.type] || 0;

    // 连接数（重要性）
    const neighbors = this.graph.getNeighbors(node.id);
    score += Math.min(neighbors.length / 10, 0.3);

    return score;
  }

  /**
   * 获取上下文推荐
   */
  async getRecommendations(currentFile: string): Promise<Recommendation[]> {
    return await this.recommender.recommend(currentFile);
  }

  /**
   * 可视化图谱
   */
  async visualize(): Promise<string> {
    const nodes = this.graph.getAllNodes();
    const edges = this.graph.getAllEdges();

    // 生成 Mermaid 图
    const lines: string[] = ['graph TD'];

    // 添加节点
    for (const node of nodes.slice(0, 50)) {
      const shape = this.getNodeShape(node.type);
      lines.push(`  ${node.id}${shape}`);
    }

    // 添加边
    for (const edge of edges.slice(0, 100)) {
      const label = edge.type;
      lines.push(`  ${edge.from} -->|${label}| ${edge.to}`);
    }

    return lines.join('\n');
  }

  private getNodeShape(type: string): string {
    switch (type) {
      case 'class':
        return '[Class]';
      case 'function':
        return '(Function)';
      case 'interface':
        return '{Interface}';
      case 'variable':
        return '((Variable))';
      default:
        return '[Unknown]';
    }
  }

  /**
   * 导出图谱
   */
  async export(): Promise<ExportData> {
    return {
      nodes: this.graph.getAllNodes(),
      edges: this.graph.getAllEdges(),
      metadata: {
        version: '1.0',
        timestamp: Date.now(),
        nodeCount: this.graph.getNodeCount(),
        edgeCount: this.graph.getEdgeCount(),
      },
    };
  }

  /**
   * 保存图谱
   */
  private async saveGraph(): Promise<void> {
    const data = await this.export();
    await this.context.globalState.update('knowledgeGraph', data);
  }

  /**
   * 加载图谱
   */
  async loadGraph(): Promise<void> {
    const data = this.context.globalState.get<ExportData>('knowledgeGraph');
    if (data) {
      for (const node of data.nodes) {
        this.graph.addNode(node);
      }
      for (const edge of data.edges) {
        this.graph.addEdge(edge);
      }
    }
  }
}

/**
 * 图数据结构
 */
class Graph {
  private nodes: Map<string, Node> = new Map();
  private edges: Map<string, Edge[]> = new Map();

  addNode(node: Node): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, []);
    }
  }

  addEdge(edge: Edge): void {
    if (!this.edges.has(edge.from)) {
      this.edges.set(edge.from, []);
    }
    this.edges.get(edge.from)!.push(edge);
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getNeighbors(id: string): Node[] {
    const edges = this.edges.get(id) || [];
    return edges
      .map((e) => this.nodes.get(e.to))
      .filter((n): n is Node => n !== undefined);
  }

  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): Edge[] {
    const allEdges: Edge[] = [];
    for (const edges of this.edges.values()) {
      allEdges.push(...edges);
    }
    return allEdges;
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getEdgeCount(): number {
    return this.getAllEdges().length;
  }
}

/**
 * 代码索引器
 */
class CodeIndexer {
  async extractEntities(document: vscode.TextDocument): Promise<Entity[]> {
    const entities: Entity[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // 提取类
    const classRegex = /^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/gm;
    let match: RegExpExecArray | null;

    while ((match = classRegex.exec(text)) !== null) {
      const name = match[3];
      const line = text.substring(0, match.index).split('\n').length - 1;

      entities.push({
        id: `${document.uri.fsPath}:class:${name}`,
        type: 'class',
        name,
        location: { line, column: match.index },
        metadata: { exported: !!match[1], abstract: !!match[2] },
      });
    }

    // 提取函数
    const funcRegex = /^\s*(export\s+)?(async\s+)?function\s+(\w+)/gm;
    while ((match = funcRegex.exec(text)) !== null) {
      const name = match[3];
      const line = text.substring(0, match.index).split('\n').length - 1;

      entities.push({
        id: `${document.uri.fsPath}:function:${name}`,
        type: 'function',
        name,
        location: { line, column: match.index },
        metadata: { exported: !!match[1], async: !!match[2] },
      });
    }

    // 提取接口
    const interfaceRegex = /^\s*(export\s+)?interface\s+(\w+)/gm;
    while ((match = interfaceRegex.exec(text)) !== null) {
      const name = match[2];
      const line = text.substring(0, match.index).split('\n').length - 1;

      entities.push({
        id: `${document.uri.fsPath}:interface:${name}`,
        type: 'interface',
        name,
        location: { line, column: match.index },
        metadata: { exported: !!match[1] },
      });
    }

    return entities;
  }
}

/**
 * 语义分析器
 */
class SemanticAnalyzer {
  async analyzeRelations(
    document: vscode.TextDocument,
    entities: Entity[]
  ): Promise<Relation[]> {
    const relations: Relation[] = [];
    const text = document.getText();

    // 分析继承关系
    const extendsRegex = /class\s+(\w+)\s+extends\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = extendsRegex.exec(text)) !== null) {
      const child = match[1];
      const parent = match[2];

      const childEntity = entities.find((e) => e.name === child);
      const parentEntity = entities.find((e) => e.name === parent);

      if (childEntity && parentEntity) {
        relations.push({
          from: childEntity.id,
          to: parentEntity.id,
          type: 'extends',
          weight: 1.0,
        });
      }
    }

    // 分析实现关系
    const implementsRegex = /class\s+(\w+)\s+implements\s+(\w+)/g;
    while ((match = implementsRegex.exec(text)) !== null) {
      const impl = match[1];
      const iface = match[2];

      const implEntity = entities.find((e) => e.name === impl);
      const ifaceEntity = entities.find((e) => e.name === iface);

      if (implEntity && ifaceEntity) {
        relations.push({
          from: implEntity.id,
          to: ifaceEntity.id,
          type: 'implements',
          weight: 1.0,
        });
      }
    }

    // 分析调用关系
    for (const entity of entities) {
      if (entity.type === 'function') {
        const callRegex = new RegExp(`\\b(\\w+)\\s*\\(`, 'g');
        while ((match = callRegex.exec(text)) !== null) {
          const callee = match[1];
          const calleeEntity = entities.find((e) => e.name === callee);

          if (calleeEntity && calleeEntity.id !== entity.id) {
            relations.push({
              from: entity.id,
              to: calleeEntity.id,
              type: 'calls',
              weight: 0.5,
            });
          }
        }
      }
    }

    return relations;
  }

  calculateSimilarity(node1: Node, node2: Node): number {
    let similarity = 0;

    // 类型相同
    if (node1.type === node2.type) {
      similarity += 0.3;
    }

    // 名称相似
    const name1 = node1.name.toLowerCase();
    const name2 = node2.name.toLowerCase();

    if (name1 === name2) {
      similarity += 0.5;
    } else if (name1.includes(name2) || name2.includes(name1)) {
      similarity += 0.3;
    }

    // 文件路径相似
    const dir1 = path.dirname(node1.filePath);
    const dir2 = path.dirname(node2.filePath);

    if (dir1 === dir2) {
      similarity += 0.2;
    }

    return similarity;
  }
}

/**
 * 上下文推荐器
 */
class ContextRecommender {
  constructor(private graph: Graph) {}

  async recommend(currentFile: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 1. 找到当前文件的所有节点
    const currentNodes = this.graph
      .getAllNodes()
      .filter((n) => n.filePath === currentFile);

    // 2. 找到相关节点
    const relatedNodes = new Map<string, number>();

    for (const node of currentNodes) {
      const neighbors = this.graph.getNeighbors(node.id);

      for (const neighbor of neighbors) {
        const score = relatedNodes.get(neighbor.filePath) || 0;
        relatedNodes.set(neighbor.filePath, score + 1);
      }
    }

    // 3. 排序并返回
    const sorted = Array.from(relatedNodes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [filePath, score] of sorted) {
      if (filePath !== currentFile) {
        recommendations.push({
          filePath,
          reason: `${score} related entities`,
          confidence: Math.min(score / 10, 1.0),
        });
      }
    }

    return recommendations;
  }
}

// ==================== 类型定义 ====================

export interface Node {
  id: string;
  type: 'class' | 'function' | 'interface' | 'variable';
  name: string;
  filePath: string;
  location: { line: number; column: number };
  metadata: any;
}

export interface Edge {
  from: string;
  to: string;
  type: 'extends' | 'implements' | 'calls' | 'similar' | 'imports';
  weight: number;
}

export interface Entity {
  id: string;
  type: string;
  name: string;
  location: { line: number; column: number };
  metadata: any;
}

export interface Relation {
  from: string;
  to: string;
  type: string;
  weight: number;
}

export interface BuildResult {
  processedFiles: number;
  totalNodes: number;
  totalEdges: number;
  duration: number;
}

export interface QueryResult {
  node: Node;
  relevance: number;
  neighbors: Node[];
}

export interface Recommendation {
  filePath: string;
  reason: string;
  confidence: number;
}

export interface ExportData {
  nodes: Node[];
  edges: Edge[];
  metadata: {
    version: string;
    timestamp: number;
    nodeCount: number;
    edgeCount: number;
  };
}
