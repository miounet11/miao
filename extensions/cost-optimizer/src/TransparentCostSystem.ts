import * as vscode from 'vscode';

/**
 * 透明成本系统
 * 实时成本预测 + 智能模型选择 + 优化建议
 */
export class TransparentCostSystem {
  private usageHistory: UsageRecord[] = [];
  private modelPricing: ModelPricing;
  private tokenCounter: TokenCounter;

  constructor(private context: vscode.ExtensionContext) {
    this.modelPricing = new ModelPricing();
    this.tokenCounter = new TokenCounter();
    this.loadHistory();
  }

  /**
   * 加载历史记录
   */
  private async loadHistory(): Promise<void> {
    const history = this.context.globalState.get<UsageRecord[]>('usageHistory', []);
    this.usageHistory = history;
  }

  /**
   * 保存历史记录
   */
  private async saveHistory(): Promise<void> {
    await this.context.globalState.update('usageHistory', this.usageHistory);
  }

  /**
   * 实时成本预测
   */
  async predictCost(task: string, model?: string): Promise<CostEstimate> {
    // 1. 估算 token 数量
    const tokens = await this.tokenCounter.estimate(task);

    // 2. 获取当前模型（或使用指定模型）
    const currentModel = model || this.getCurrentModel();

    // 3. 计算成本
    const pricing = this.modelPricing.getPricing(currentModel);
    const promptCost = (tokens.prompt / 1000) * pricing.promptPrice;
    const completionCost = (tokens.completion / 1000) * pricing.completionPrice;
    const totalCost = promptCost + completionCost;

    // 4. 查找更便宜的替代方案
    const alternatives = await this.suggestCheaperOptions(task, currentModel, totalCost);

    return {
      model: currentModel,
      estimated: totalCost,
      breakdown: {
        prompt: promptCost,
        completion: completionCost,
        tokens: tokens,
      },
      alternatives,
      confidence: this.calculateConfidence(tokens),
    };
  }

  /**
   * 智能模型选择
   */
  async smartModelSelection(task: string): Promise<ModelRecommendation> {
    // 1. 分析任务复杂度
    const complexity = await this.analyzeComplexity(task);

    // 2. 分析延迟要求
    const latencyRequirement = this.getLatencyRequirement();

    // 3. 分析成本约束
    const costConstraint = this.getCostConstraint();

    // 4. 选择最优模型
    let recommendedModel: string;
    let reason: string;

    if (complexity < 0.3) {
      // 简单任务 - 使用最便宜的模型
      recommendedModel = 'claude-haiku';
      reason = '简单任务，使用 Haiku 模型（最快最便宜）';
    } else if (complexity < 0.7) {
      // 中等任务 - 平衡性能和成本
      if (latencyRequirement === 'low') {
        recommendedModel = 'claude-haiku';
        reason = '中等任务，低延迟要求，使用 Haiku';
      } else {
        recommendedModel = 'claude-sonnet';
        reason = '中等任务，使用 Sonnet（平衡性能和成本）';
      }
    } else {
      // 复杂任务 - 使用最强模型
      if (costConstraint === 'strict') {
        recommendedModel = 'claude-sonnet';
        reason = '复杂任务，但成本受限，使用 Sonnet';
      } else {
        recommendedModel = 'claude-opus';
        reason = '复杂任务，使用 Opus（最强性能）';
      }
    }

    // 5. 计算预期成本
    const estimate = await this.predictCost(task, recommendedModel);

    return {
      model: recommendedModel,
      reason,
      complexity,
      estimatedCost: estimate.estimated,
      estimatedTime: this.estimateTime(recommendedModel, complexity),
    };
  }

  /**
   * 成本优化建议
   */
  async optimizeCost(history?: UsageRecord[]): Promise<Optimization[]> {
    const records = history || this.usageHistory;
    if (records.length === 0) {
      return [];
    }

    const patterns = this.analyzeUsagePatterns(records);
    const suggestions: Optimization[] = [];

    // 建议 1: 缓存重复查询
    if (patterns.duplicateQueries > 0.2) {
      const savings = this.calculateDuplicateSavings(records);
      suggestions.push({
        type: 'cache',
        title: '启用查询缓存',
        description: `检测到 ${(patterns.duplicateQueries * 100).toFixed(0)}% 的重复查询`,
        savings: savings,
        savingsPercent: (savings / patterns.totalCost) * 100,
        action: 'miaoda.cost.enableCache',
        priority: 'high',
      });
    }

    // 建议 2: 使用更便宜的模型
    if (patterns.simpleTasksWithExpensiveModel > 0.3) {
      const savings = this.calculateModelDowngradeSavings(records);
      suggestions.push({
        type: 'model',
        title: '简单任务使用 Haiku',
        description: `${(patterns.simpleTasksWithExpensiveModel * 100).toFixed(0)}% 的简单任务使用了昂贵模型`,
        savings: savings,
        savingsPercent: (savings / patterns.totalCost) * 100,
        action: 'miaoda.cost.autoSelectModel',
        priority: 'high',
      });
    }

    // 建议 3: 批处理请求
    if (patterns.smallRequests > 0.4) {
      const savings = this.calculateBatchSavings(records);
      suggestions.push({
        type: 'batch',
        title: '批处理小请求',
        description: `${(patterns.smallRequests * 100).toFixed(0)}% 的请求可以批处理`,
        savings: savings,
        savingsPercent: (savings / patterns.totalCost) * 100,
        action: 'miaoda.cost.enableBatch',
        priority: 'medium',
      });
    }

    // 建议 4: 优化提示词
    if (patterns.longPrompts > 0.3) {
      const savings = this.calculatePromptOptimizationSavings(records);
      suggestions.push({
        type: 'prompt',
        title: '优化提示词长度',
        description: `${(patterns.longPrompts * 100).toFixed(0)}% 的提示词过长`,
        savings: savings,
        savingsPercent: (savings / patterns.totalCost) * 100,
        action: 'miaoda.cost.optimizePrompts',
        priority: 'medium',
      });
    }

    return suggestions.sort((a, b) => b.savings - a.savings);
  }

  /**
   * 成本仪表板
   */
  async getCostDashboard(): Promise<CostDashboard> {
    const now = Date.now();
    const today = this.filterByTimeRange(this.usageHistory, now - 24 * 60 * 60 * 1000, now);
    const week = this.filterByTimeRange(this.usageHistory, now - 7 * 24 * 60 * 60 * 1000, now);
    const month = this.filterByTimeRange(this.usageHistory, now - 30 * 24 * 60 * 60 * 1000, now);

    return {
      today: this.calculateTotalCost(today),
      week: this.calculateTotalCost(week),
      month: this.calculateTotalCost(month),
      trend: this.calculateTrend(this.usageHistory),
      topExpensive: this.getTopExpensiveTasks(this.usageHistory, 5),
      savings: await this.getPotentialSavings(),
      breakdown: this.getCostBreakdown(month),
    };
  }

  /**
   * 记录使用
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    this.usageHistory.push(record);
    await this.saveHistory();

    // 限制历史记录数量（保留最近 1000 条）
    if (this.usageHistory.length > 1000) {
      this.usageHistory = this.usageHistory.slice(-1000);
      await this.saveHistory();
    }
  }

  // ==================== 私有方法 ====================

  private getCurrentModel(): string {
    return this.context.globalState.get('currentModel', 'claude-sonnet');
  }

  private async analyzeComplexity(task: string): Promise<number> {
    // 简单的复杂度分析
    let complexity = 0;

    // 1. 长度
    if (task.length > 1000) complexity += 0.3;
    else if (task.length > 500) complexity += 0.2;
    else complexity += 0.1;

    // 2. 关键词
    const complexKeywords = ['refactor', 'architecture', 'design', 'optimize', 'complex'];
    const simpleKeywords = ['fix', 'add', 'update', 'simple', 'quick'];

    for (const keyword of complexKeywords) {
      if (task.toLowerCase().includes(keyword)) {
        complexity += 0.2;
      }
    }

    for (const keyword of simpleKeywords) {
      if (task.toLowerCase().includes(keyword)) {
        complexity -= 0.1;
      }
    }

    // 3. 代码块数量
    const codeBlocks = (task.match(/```/g) || []).length / 2;
    complexity += Math.min(codeBlocks * 0.1, 0.3);

    return Math.max(0, Math.min(1, complexity));
  }

  private getLatencyRequirement(): 'low' | 'medium' | 'high' {
    // 从配置读取
    return this.context.globalState.get('latencyRequirement', 'medium');
  }

  private getCostConstraint(): 'strict' | 'moderate' | 'flexible' {
    // 从配置读取
    return this.context.globalState.get('costConstraint', 'moderate');
  }

  private estimateTime(model: string, complexity: number): number {
    const baseTime = {
      'claude-haiku': 2,
      'claude-sonnet': 5,
      'claude-opus': 10,
    }[model] || 5;

    return baseTime * (1 + complexity);
  }

  private async suggestCheaperOptions(
    task: string,
    currentModel: string,
    currentCost: number
  ): Promise<Alternative[]> {
    const alternatives: Alternative[] = [];
    const models = ['claude-haiku', 'claude-sonnet', 'claude-opus'];

    for (const model of models) {
      if (model === currentModel) continue;

      const estimate = await this.predictCost(task, model);
      const savings = currentCost - estimate.estimated;

      if (savings > 0) {
        alternatives.push({
          model,
          cost: estimate.estimated,
          savings,
          savingsPercent: (savings / currentCost) * 100,
        });
      }
    }

    return alternatives.sort((a, b) => b.savings - a.savings);
  }

  private calculateConfidence(tokens: TokenEstimate): number {
    // 基于 token 估算的准确性
    if (tokens.prompt < 100) return 0.95;
    if (tokens.prompt < 500) return 0.9;
    if (tokens.prompt < 1000) return 0.85;
    return 0.8;
  }

  private analyzeUsagePatterns(records: UsageRecord[]): UsagePatterns {
    const totalCost = this.calculateTotalCost(records);
    const totalCount = records.length;

    // 重复查询
    const queries = records.map((r) => r.task);
    const uniqueQueries = new Set(queries);
    const duplicateQueries = 1 - uniqueQueries.size / queries.length;

    // 简单任务使用昂贵模型
    const simpleWithExpensive = records.filter(
      (r) => r.complexity < 0.3 && (r.model === 'claude-opus' || r.model === 'claude-sonnet')
    ).length;
    const simpleTasksWithExpensiveModel = simpleWithExpensive / totalCount;

    // 小请求
    const small = records.filter((r) => r.tokens.prompt < 100).length;
    const smallRequests = small / totalCount;

    // 长提示词
    const long = records.filter((r) => r.tokens.prompt > 1000).length;
    const longPrompts = long / totalCount;

    return {
      totalCost,
      totalCount,
      duplicateQueries,
      simpleTasksWithExpensiveModel,
      smallRequests,
      longPrompts,
    };
  }

  private calculateDuplicateSavings(records: UsageRecord[]): number {
    const queries = new Map<string, UsageRecord[]>();

    for (const record of records) {
      const existing = queries.get(record.task) || [];
      existing.push(record);
      queries.set(record.task, existing);
    }

    let savings = 0;
    for (const [_, records] of queries) {
      if (records.length > 1) {
        // 第一次查询需要付费，后续可以缓存
        const duplicateCost = records.slice(1).reduce((sum, r) => sum + r.cost, 0);
        savings += duplicateCost * 0.9; // 假设缓存可以节省 90%
      }
    }

    return savings;
  }

  private calculateModelDowngradeSavings(records: UsageRecord[]): number {
    let savings = 0;

    for (const record of records) {
      if (record.complexity < 0.3 && record.model !== 'claude-haiku') {
        // 计算如果使用 Haiku 的成本
        const haikuPricing = this.modelPricing.getPricing('claude-haiku');
        const haikuCost =
          (record.tokens.prompt / 1000) * haikuPricing.promptPrice +
          (record.tokens.completion / 1000) * haikuPricing.completionPrice;
        savings += record.cost - haikuCost;
      }
    }

    return savings;
  }

  private calculateBatchSavings(records: UsageRecord[]): number {
    // 简化：假设批处理可以节省 20%
    const smallRequests = records.filter((r) => r.tokens.prompt < 100);
    const totalCost = smallRequests.reduce((sum, r) => sum + r.cost, 0);
    return totalCost * 0.2;
  }

  private calculatePromptOptimizationSavings(records: UsageRecord[]): number {
    // 简化：假设优化可以减少 30% 的 token
    const longPrompts = records.filter((r) => r.tokens.prompt > 1000);
    const totalCost = longPrompts.reduce((sum, r) => sum + r.cost, 0);
    return totalCost * 0.3;
  }

  private filterByTimeRange(
    records: UsageRecord[],
    start: number,
    end: number
  ): UsageRecord[] {
    return records.filter((r) => r.timestamp >= start && r.timestamp <= end);
  }

  private calculateTotalCost(records: UsageRecord[]): number {
    return records.reduce((sum, r) => sum + r.cost, 0);
  }

  private calculateTrend(records: UsageRecord[]): CostTrend {
    if (records.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const now = Date.now();
    const lastWeek = this.filterByTimeRange(records, now - 7 * 24 * 60 * 60 * 1000, now);
    const previousWeek = this.filterByTimeRange(
      records,
      now - 14 * 24 * 60 * 60 * 1000,
      now - 7 * 24 * 60 * 60 * 1000
    );

    const lastWeekCost = this.calculateTotalCost(lastWeek);
    const previousWeekCost = this.calculateTotalCost(previousWeek);

    if (previousWeekCost === 0) {
      return { direction: 'stable', change: 0 };
    }

    const change = ((lastWeekCost - previousWeekCost) / previousWeekCost) * 100;

    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      change,
    };
  }

  private getTopExpensiveTasks(records: UsageRecord[], limit: number): ExpensiveTask[] {
    return records
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit)
      .map((r) => ({
        task: r.task.substring(0, 100),
        model: r.model,
        cost: r.cost,
        timestamp: r.timestamp,
      }));
  }

  private async getPotentialSavings(): Promise<number> {
    const optimizations = await this.optimizeCost();
    return optimizations.reduce((sum, o) => sum + o.savings, 0);
  }

  private getCostBreakdown(records: UsageRecord[]): CostBreakdown {
    const byModel: { [key: string]: number } = {};

    for (const record of records) {
      byModel[record.model] = (byModel[record.model] || 0) + record.cost;
    }

    return { byModel };
  }
}

// ==================== 类型定义 ====================

export interface CostEstimate {
  model: string;
  estimated: number;
  breakdown: {
    prompt: number;
    completion: number;
    tokens: TokenEstimate;
  };
  alternatives: Alternative[];
  confidence: number;
}

export interface TokenEstimate {
  prompt: number;
  completion: number;
  total: number;
}

export interface Alternative {
  model: string;
  cost: number;
  savings: number;
  savingsPercent: number;
}

export interface ModelRecommendation {
  model: string;
  reason: string;
  complexity: number;
  estimatedCost: number;
  estimatedTime: number;
}

export interface Optimization {
  type: 'cache' | 'model' | 'batch' | 'prompt';
  title: string;
  description: string;
  savings: number;
  savingsPercent: number;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CostDashboard {
  today: number;
  week: number;
  month: number;
  trend: CostTrend;
  topExpensive: ExpensiveTask[];
  savings: number;
  breakdown: CostBreakdown;
}

export interface CostTrend {
  direction: 'up' | 'down' | 'stable';
  change: number;
}

export interface ExpensiveTask {
  task: string;
  model: string;
  cost: number;
  timestamp: number;
}

export interface CostBreakdown {
  byModel: { [key: string]: number };
}

export interface UsageRecord {
  task: string;
  model: string;
  tokens: TokenEstimate;
  cost: number;
  complexity: number;
  timestamp: number;
}

interface UsagePatterns {
  totalCost: number;
  totalCount: number;
  duplicateQueries: number;
  simpleTasksWithExpensiveModel: number;
  smallRequests: number;
  longPrompts: number;
}

// ==================== 辅助类 ====================

class ModelPricing {
  private pricing: { [key: string]: { promptPrice: number; completionPrice: number } } = {
    'claude-haiku': { promptPrice: 0.00025, completionPrice: 0.00125 },
    'claude-sonnet': { promptPrice: 0.003, completionPrice: 0.015 },
    'claude-opus': { promptPrice: 0.015, completionPrice: 0.075 },
  };

  getPricing(model: string): { promptPrice: number; completionPrice: number } {
    return this.pricing[model] || this.pricing['claude-sonnet'];
  }
}

class TokenCounter {
  async estimate(text: string): Promise<TokenEstimate> {
    // 简化：1 token ≈ 4 字符
    const prompt = Math.ceil(text.length / 4);
    const completion = Math.ceil(prompt * 0.5); // 假设回复是输入的 50%

    return {
      prompt,
      completion,
      total: prompt + completion,
    };
  }
}
