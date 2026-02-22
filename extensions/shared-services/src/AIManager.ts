import * as vscode from 'vscode';
import { AIRequest, AIResponse, IAIClient, AIModel, StreamCallback } from './AIProvider';
import { ClaudeClient } from './ClaudeClient';
import { OpenAIClient } from './OpenAIClient';

/**
 * 模型配置
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'claude' | 'openai';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  isOfficial: boolean;
}

/**
 * AI 管理器
 * 统一管理所有 AI 模型
 */
export class AIManager {
  private context: vscode.ExtensionContext;
  private clients: Map<string, IAIClient> = new Map();
  private models: Map<string, ModelConfig> = new Map();
  private currentModel: string = 'miaoda-auto';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadModels();
  }

  /**
   * 加载模型配置
   */
  private loadModels(): void {
    // 官方模型（使用 Miaoda 的 API Key）
    const officialModels: ModelConfig[] = [
      {
        id: 'miaoda-auto',
        name: 'Miaoda Auto',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        isOfficial: true,
      },
      {
        id: 'miaoda-fast',
        name: 'Miaoda Fast',
        provider: 'claude',
        model: 'claude-haiku-4-5',
        isOfficial: true,
      },
      {
        id: 'miaoda-powerful',
        name: 'Miaoda Powerful',
        provider: 'claude',
        model: 'claude-opus-4-6',
        isOfficial: true,
      },
    ];

    officialModels.forEach((model) => {
      this.models.set(model.id, model);
    });

    // 加载用户自定义模型
    const customModels = this.context.globalState.get<ModelConfig[]>('customModels', []);
    customModels.forEach((model) => {
      this.models.set(model.id, model);
    });
  }

  /**
   * 获取或创建客户端
   */
  private getClient(config: ModelConfig): IAIClient {
    const cacheKey = `${config.provider}-${config.apiKey || 'official'}`;

    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!;
    }

    let client: IAIClient;

    if (config.isOfficial) {
      // 使用 Miaoda 官方 API Key
      const officialKey = this.getOfficialApiKey(config.provider);
      if (config.provider === 'claude') {
        client = new ClaudeClient(officialKey);
      } else {
        client = new OpenAIClient(officialKey);
      }
    } else {
      // 使用用户自定义 API Key
      if (!config.apiKey) {
        throw new Error('API Key is required for custom models');
      }

      if (config.provider === 'claude') {
        client = new ClaudeClient(config.apiKey, config.baseUrl);
      } else {
        client = new OpenAIClient(config.apiKey, config.baseUrl);
      }
    }

    this.clients.set(cacheKey, client);
    return client;
  }

  /**
   * 获取官方 API Key
   */
  private getOfficialApiKey(provider: 'claude' | 'openai'): string {
    // TODO: 从安全存储或环境变量获取
    // 这里暂时返回占位符
    return process.env[`MIAODA_${provider.toUpperCase()}_KEY`] || 'placeholder-key';
  }

  /**
   * 完成请求
   */
  async complete(prompt: string, options?: Partial<AIRequest>): Promise<AIResponse> {
    const modelConfig = this.models.get(this.currentModel);
    if (!modelConfig) {
      throw new Error(`Model ${this.currentModel} not found`);
    }

    const client = this.getClient(modelConfig);

    const request: AIRequest = {
      model: modelConfig.model,
      prompt,
      systemPrompt: options?.systemPrompt,
      temperature: options?.temperature || 0.7,
      maxTokens: options?.maxTokens || 4096,
      stream: false,
    };

    return await client.complete(request);
  }

  /**
   * 流式完成
   */
  async completeStream(
    prompt: string,
    callback: StreamCallback,
    options?: Partial<AIRequest>
  ): Promise<AIResponse> {
    const modelConfig = this.models.get(this.currentModel);
    if (!modelConfig) {
      throw new Error(`Model ${this.currentModel} not found`);
    }

    const client = this.getClient(modelConfig);

    const request: AIRequest = {
      model: modelConfig.model,
      prompt,
      systemPrompt: options?.systemPrompt,
      temperature: options?.temperature || 0.7,
      maxTokens: options?.maxTokens || 4096,
      stream: true,
    };

    return await client.completeStream(request, callback);
  }

  /**
   * 添加自定义模型
   */
  async addCustomModel(config: Omit<ModelConfig, 'id' | 'isOfficial'>): Promise<string> {
    const id = `custom-${Date.now()}`;
    const modelConfig: ModelConfig = {
      ...config,
      id,
      isOfficial: false,
    };

    this.models.set(id, modelConfig);

    // 保存到存储
    const customModels = Array.from(this.models.values()).filter((m) => !m.isOfficial);
    await this.context.globalState.update('customModels', customModels);

    return id;
  }

  /**
   * 删除自定义模型
   */
  async removeCustomModel(id: string): Promise<boolean> {
    const model = this.models.get(id);
    if (!model || model.isOfficial) {
      return false;
    }

    this.models.delete(id);

    // 保存到存储
    const customModels = Array.from(this.models.values()).filter((m) => !m.isOfficial);
    await this.context.globalState.update('customModels', customModels);

    return true;
  }

  /**
   * 设置当前模型
   */
  setCurrentModel(modelId: string): void {
    if (!this.models.has(modelId)) {
      throw new Error(`Model ${modelId} not found`);
    }
    this.currentModel = modelId;
  }

  /**
   * 获取当前模型
   */
  getCurrentModel(): ModelConfig | undefined {
    return this.models.get(this.currentModel);
  }

  /**
   * 获取所有模型
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取官方模型
   */
  getOfficialModels(): ModelConfig[] {
    return this.getAllModels().filter((m) => m.isOfficial);
  }

  /**
   * 获取自定义模型
   */
  getCustomModels(): ModelConfig[] {
    return this.getAllModels().filter((m) => !m.isOfficial);
  }

  /**
   * 列出可用模型
   */
  async listAvailableModels(provider: 'claude' | 'openai'): Promise<AIModel[]> {
    const config = this.models.get('miaoda-auto')!;
    const client = this.getClient(config);
    return await client.listModels();
  }
}

/**
 * 单例
 */
let aiManagerInstance: AIManager | undefined;

export function getAIManager(context: vscode.ExtensionContext): AIManager {
  if (!aiManagerInstance) {
    aiManagerInstance = new AIManager(context);
  }
  return aiManagerInstance;
}
