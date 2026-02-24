import * as vscode from 'vscode';

/**
 * 混合模型路由器
 * 智能选择本地或云端模型
 */
export class HybridModelRouter {
  private localModels: Map<string, LocalModel> = new Map();
  private cloudModels: Map<string, CloudModel> = new Map();
  private routingStrategy: RoutingStrategy;
  private stats: ModelStats;

  constructor(private context: vscode.ExtensionContext) {
    this.routingStrategy = new SmartRoutingStrategy();
    this.stats = new ModelStats(context);
    this.initializeModels();
  }

  /**
   * 初始化模型
   */
  private initializeModels(): void {
    // 本地模型
    this.localModels.set('llama-3.2-1b', {
      id: 'llama-3.2-1b',
      name: 'Llama 3.2 1B',
      size: '1.3GB',
      maxTokens: 2048,
      speed: 'fast',
      quality: 'medium',
      capabilities: ['completion', 'chat'],
      downloaded: false,
    });

    this.localModels.set('codellama-7b', {
      id: 'codellama-7b',
      name: 'CodeLlama 7B',
      size: '4.1GB',
      maxTokens: 4096,
      speed: 'medium',
      quality: 'high',
      capabilities: ['completion', 'chat', 'code-generation'],
      downloaded: false,
    });

    this.localModels.set('deepseek-coder-1.3b', {
      id: 'deepseek-coder-1.3b',
      name: 'DeepSeek Coder 1.3B',
      size: '1.5GB',
      maxTokens: 2048,
      speed: 'fast',
      quality: 'medium',
      capabilities: ['completion', 'code-generation'],
      downloaded: false,
    });

    // 云端模型
    this.cloudModels.set('claude-opus-4', {
      id: 'claude-opus-4',
      name: 'Claude Opus 4',
      provider: 'anthropic',
      maxTokens: 200000,
      speed: 'slow',
      quality: 'highest',
      cost: 0.015,
      capabilities: ['completion', 'chat', 'code-generation', 'reasoning'],
    });

    this.cloudModels.set('claude-sonnet-4', {
      id: 'claude-sonnet-4',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      maxTokens: 200000,
      speed: 'medium',
      quality: 'high',
      cost: 0.003,
      capabilities: ['completion', 'chat', 'code-generation'],
    });

    this.cloudModels.set('claude-haiku-4', {
      id: 'claude-haiku-4',
      name: 'Claude Haiku 4',
      provider: 'anthropic',
      maxTokens: 200000,
      speed: 'fast',
      quality: 'medium',
      cost: 0.0003,
      capabilities: ['completion', 'chat'],
    });
  }

  /**
   * 智能路由：选择最佳模型
   */
  async route(request: ModelRequest): Promise<ModelSelection> {
    const config = vscode.workspace.getConfiguration('miaoda.hybrid');
    const offlineMode = config.get<boolean>('offlineMode', false);
    const preferLocal = config.get<boolean>('preferLocal', true);

    // 1. 离线模式：只用本地
    if (offlineMode) {
      return this.selectLocalModel(request);
    }

    // 2. 使用路由策略
    const decision = await this.routingStrategy.decide(request, {
      localModels: Array.from(this.localModels.values()),
      cloudModels: Array.from(this.cloudModels.values()),
      preferLocal,
    });

    // 3. 记录统计
    await this.stats.record(decision);

    return decision;
  }

  /**
   * 选择本地模型
   */
  private selectLocalModel(request: ModelRequest): ModelSelection {
    const available = Array.from(this.localModels.values()).filter(
      (m) => m.downloaded && this.canHandle(m, request)
    );

    if (available.length === 0) {
      throw new Error('No local model available. Please download a model first.');
    }

    // 选择最快的
    const model = available.sort((a, b) => {
      const speedOrder = { fast: 0, medium: 1, slow: 2 };
      return speedOrder[a.speed] - speedOrder[b.speed];
    })[0];

    return {
      modelId: model.id,
      modelName: model.name,
      type: 'local',
      reason: 'Offline mode or local preference',
      estimatedLatency: 100,
      estimatedCost: 0,
    };
  }

  /**
   * 检查模型是否能处理请求
   */
  private canHandle(model: LocalModel | CloudModel, request: ModelRequest): boolean {
    // 检查能力
    if (!model.capabilities.includes(request.capability)) {
      return false;
    }

    // 检查 token 限制
    if (request.estimatedTokens > model.maxTokens) {
      return false;
    }

    return true;
  }

  /**
   * 下载本地模型
   */
  async downloadModel(modelId: string): Promise<void> {
    const model = this.localModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (model.downloaded) {
      vscode.window.showInformationMessage(`${model.name} is already downloaded`);
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Downloading ${model.name}`,
        cancellable: true,
      },
      async (progress, token) => {
        // 模拟下载
        for (let i = 0; i <= 100; i += 10) {
          if (token.isCancellationRequested) {
            throw new Error('Download cancelled');
          }

          progress.report({ increment: 10, message: `${i}%` });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        model.downloaded = true;
        vscode.window.showInformationMessage(
          `✅ ${model.name} downloaded successfully`
        );
      }
    );
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): ModelInfo[] {
    const models: ModelInfo[] = [];

    // 本地模型
    for (const model of this.localModels.values()) {
      models.push({
        id: model.id,
        name: model.name,
        type: 'local',
        available: model.downloaded,
        size: model.size,
        speed: model.speed,
        quality: model.quality,
        cost: 0,
      });
    }

    // 云端模型
    for (const model of this.cloudModels.values()) {
      models.push({
        id: model.id,
        name: model.name,
        type: 'cloud',
        available: true,
        size: 'N/A',
        speed: model.speed,
        quality: model.quality,
        cost: model.cost,
      });
    }

    return models;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<StatsReport> {
    return await this.stats.getReport();
  }
}

/**
 * 智能路由策略
 */
class SmartRoutingStrategy implements RoutingStrategy {
  async decide(
    request: ModelRequest,
    context: RoutingContext
  ): Promise<ModelSelection> {
    const { localModels, cloudModels, preferLocal } = context;

    // 1. 计算任务复杂度
    const complexity = this.calculateComplexity(request);

    // 2. 过滤可用模型
    const availableLocal = localModels.filter(
      (m) => m.downloaded && m.maxTokens >= request.estimatedTokens
    );
    const availableCloud = cloudModels.filter(
      (m) => m.maxTokens >= request.estimatedTokens
    );

    // 3. 决策逻辑
    if (complexity < 0.3 && availableLocal.length > 0) {
      // 简单任务 → 本地快速模型
      const model = availableLocal.sort((a, b) => {
        const speedOrder = { fast: 0, medium: 1, slow: 2 };
        return speedOrder[a.speed] - speedOrder[b.speed];
      })[0];

      return {
        modelId: model.id,
        modelName: model.name,
        type: 'local',
        reason: `Low complexity (${(complexity * 100).toFixed(0)}%), using fast local model`,
        estimatedLatency: 100,
        estimatedCost: 0,
      };
    }

    if (complexity < 0.7 && preferLocal && availableLocal.length > 0) {
      // 中等任务 + 偏好本地 → 本地高质量模型
      const model = availableLocal.sort((a, b) => {
        const qualityOrder = { medium: 0, high: 1, highest: 2 };
        return qualityOrder[b.quality] - qualityOrder[a.quality];
      })[0];

      return {
        modelId: model.id,
        modelName: model.name,
        type: 'local',
        reason: `Medium complexity (${(complexity * 100).toFixed(0)}%), prefer local`,
        estimatedLatency: 200,
        estimatedCost: 0,
      };
    }

    // 复杂任务 → 云端强大模型
    const model = availableCloud.sort((a, b) => {
      const qualityOrder = { medium: 0, high: 1, highest: 2 };
      return qualityOrder[b.quality] - qualityOrder[a.quality];
    })[0];

    if (!model) {
      throw new Error('No suitable model available');
    }

    return {
      modelId: model.id,
      modelName: model.name,
      type: 'cloud',
      reason: `High complexity (${(complexity * 100).toFixed(0)}%), using cloud model`,
      estimatedLatency: 2000,
      estimatedCost: model.cost * (request.estimatedTokens / 1000),
    };
  }

  private calculateComplexity(request: ModelRequest): number {
    let complexity = 0;

    // Token 数量
    if (request.estimatedTokens > 4000) complexity += 0.3;
    else if (request.estimatedTokens > 2000) complexity += 0.2;
    else complexity += 0.1;

    // 能力要求
    if (request.capability === 'reasoning') complexity += 0.4;
    else if (request.capability === 'code-generation') complexity += 0.3;
    else if (request.capability === 'chat') complexity += 0.2;
    else complexity += 0.1;

    // 上下文复杂度
    if (request.contextFiles && request.contextFiles.length > 10) complexity += 0.2;
    else if (request.contextFiles && request.contextFiles.length > 5) complexity += 0.1;

    return Math.min(complexity, 1.0);
  }
}

/**
 * 模型统计
 */
class ModelStats {
  constructor(private context: vscode.ExtensionContext) {}

  async record(selection: ModelSelection): Promise<void> {
    const stats = this.context.globalState.get<any>('modelStats', {
      local: { count: 0, totalLatency: 0, totalCost: 0 },
      cloud: { count: 0, totalLatency: 0, totalCost: 0 },
    });

    if (selection.type === 'local') {
      stats.local.count++;
      stats.local.totalLatency += selection.estimatedLatency;
    } else {
      stats.cloud.count++;
      stats.cloud.totalLatency += selection.estimatedLatency;
      stats.cloud.totalCost += selection.estimatedCost;
    }

    await this.context.globalState.update('modelStats', stats);
  }

  async getReport(): Promise<StatsReport> {
    const stats = this.context.globalState.get<any>('modelStats', {
      local: { count: 0, totalLatency: 0, totalCost: 0 },
      cloud: { count: 0, totalLatency: 0, totalCost: 0 },
    });

    const total = stats.local.count + stats.cloud.count;

    return {
      totalRequests: total,
      localRequests: stats.local.count,
      cloudRequests: stats.cloud.count,
      localPercentage: total > 0 ? (stats.local.count / total) * 100 : 0,
      avgLocalLatency:
        stats.local.count > 0 ? stats.local.totalLatency / stats.local.count : 0,
      avgCloudLatency:
        stats.cloud.count > 0 ? stats.cloud.totalLatency / stats.cloud.count : 0,
      totalCost: stats.cloud.totalCost,
      costSavings: stats.local.count * 0.003, // 假设每次本地节省 $0.003
    };
  }
}

// ==================== 类型定义 ====================

export interface LocalModel {
  id: string;
  name: string;
  size: string;
  maxTokens: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'medium' | 'high' | 'highest';
  capabilities: string[];
  downloaded: boolean;
}

export interface CloudModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'medium' | 'high' | 'highest';
  cost: number; // per 1k tokens
  capabilities: string[];
}

export interface ModelRequest {
  capability: 'completion' | 'chat' | 'code-generation' | 'reasoning';
  estimatedTokens: number;
  contextFiles?: string[];
  priority?: 'low' | 'medium' | 'high';
}

export interface ModelSelection {
  modelId: string;
  modelName: string;
  type: 'local' | 'cloud';
  reason: string;
  estimatedLatency: number;
  estimatedCost: number;
}

export interface RoutingContext {
  localModels: LocalModel[];
  cloudModels: CloudModel[];
  preferLocal: boolean;
}

export interface RoutingStrategy {
  decide(request: ModelRequest, context: RoutingContext): Promise<ModelSelection>;
}

export interface ModelInfo {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  available: boolean;
  size: string;
  speed: string;
  quality: string;
  cost: number;
}

export interface StatsReport {
  totalRequests: number;
  localRequests: number;
  cloudRequests: number;
  localPercentage: number;
  avgLocalLatency: number;
  avgCloudLatency: number;
  totalCost: number;
  costSavings: number;
}
