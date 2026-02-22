import * as vscode from 'vscode';
import { getEventBus } from './EventBus';

/**
 * 额度管理器
 *
 * 功能：
 * 1. 管理每日免费额度（50 次）
 * 2. 追踪使用情况
 * 3. 本地存储 + 云端同步
 */

export interface QuotaInfo {
  // 免费额度
  dailyFreeQuota: number; // 每日免费额度
  usedFreeQuota: number; // 已使用免费额度
  remainingFreeQuota: number; // 剩余免费额度
  lastResetDate: string; // 上次重置日期

  // 付费额度（未来扩展）
  paidQuota?: number;
  usedPaidQuota?: number;

  // 统计
  totalRequests: number; // 总请求数
  totalTokens: number; // 总 token 数
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'official' | 'custom';
  apiUrl?: string;
  apiKey?: string;
  model: string;
  costPerRequest?: number; // 每次请求消耗的额度
}

export interface UsageRecord {
  timestamp: number;
  modelId: string;
  quotaUsed: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

export class QuotaManager {
  private context: vscode.ExtensionContext;
  private quotaInfo: QuotaInfo;
  private models: Map<string, ModelConfig> = new Map();
  private usageHistory: UsageRecord[] = [];

  // 配置
  private readonly DAILY_FREE_QUOTA = 50;
  private readonly STORAGE_KEY_QUOTA = 'miaoda.quota';
  private readonly STORAGE_KEY_MODELS = 'miaoda.models';
  private readonly STORAGE_KEY_USAGE = 'miaoda.usage';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.quotaInfo = this.loadQuotaInfo();
    this.loadModels();
    this.loadUsageHistory();
    this.checkDailyReset();
  }

  /**
   * 获取额度信息
   */
  getQuotaInfo(): QuotaInfo {
    this.checkDailyReset();
    return { ...this.quotaInfo };
  }

  /**
   * 检查是否有足够额度
   */
  hasQuota(required: number = 1): boolean {
    this.checkDailyReset();
    return this.quotaInfo.remainingFreeQuota >= required;
  }

  /**
   * 消耗额度
   */
  async consumeQuota(
    modelId: string,
    amount: number = 1,
    tokensUsed: number = 0
  ): Promise<boolean> {
    this.checkDailyReset();

    if (!this.hasQuota(amount)) {
      vscode.window.showWarningMessage(
        `额度不足！今日剩余: ${this.quotaInfo.remainingFreeQuota}/${this.DAILY_FREE_QUOTA}`
      );
      return false;
    }

    // 消耗额度
    this.quotaInfo.usedFreeQuota += amount;
    this.quotaInfo.remainingFreeQuota -= amount;
    this.quotaInfo.totalRequests++;
    this.quotaInfo.totalTokens += tokensUsed;

    // 记录使用
    const record: UsageRecord = {
      timestamp: Date.now(),
      modelId,
      quotaUsed: amount,
      tokensUsed,
      success: true,
    };
    this.usageHistory.push(record);

    // 保存
    this.saveQuotaInfo();
    this.saveUsageHistory();

    // 发送事件
    const eventBus = getEventBus();
    eventBus.emit('quota.consumed', {
      quota: this.quotaInfo,
      record,
    });

    // 同步到云端
    this.syncToCloud();

    return true;
  }

  /**
   * 检查每日重置
   */
  private checkDailyReset(): void {
    const today = new Date().toISOString().split('T')[0];

    if (this.quotaInfo.lastResetDate !== today) {
      // 重置额度
      this.quotaInfo.usedFreeQuota = 0;
      this.quotaInfo.remainingFreeQuota = this.DAILY_FREE_QUOTA;
      this.quotaInfo.lastResetDate = today;
      this.saveQuotaInfo();

      vscode.window.showInformationMessage(
        `✨ 每日额度已重置！今日可用: ${this.DAILY_FREE_QUOTA} 次`
      );
    }
  }

  /**
   * 加载额度信息
   */
  private loadQuotaInfo(): QuotaInfo {
    const stored = this.context.globalState.get<QuotaInfo>(this.STORAGE_KEY_QUOTA);

    if (stored) {
      return stored;
    }

    // 初始化
    return {
      dailyFreeQuota: this.DAILY_FREE_QUOTA,
      usedFreeQuota: 0,
      remainingFreeQuota: this.DAILY_FREE_QUOTA,
      lastResetDate: new Date().toISOString().split('T')[0],
      totalRequests: 0,
      totalTokens: 0,
    };
  }

  /**
   * 保存额度信息
   */
  private saveQuotaInfo(): void {
    this.context.globalState.update(this.STORAGE_KEY_QUOTA, this.quotaInfo);
  }

  /**
   * 加载模型配置
   */
  private loadModels(): void {
    const stored = this.context.globalState.get<ModelConfig[]>(this.STORAGE_KEY_MODELS);

    if (stored) {
      stored.forEach((model) => this.models.set(model.id, model));
    } else {
      // 初始化官方模型
      this.initializeOfficialModels();
    }
  }

  /**
   * 初始化官方模型
   */
  private initializeOfficialModels(): void {
    const officialModels: ModelConfig[] = [
      {
        id: 'miaoda-auto',
        name: 'Miaoda Auto',
        provider: 'official',
        model: 'auto',
        costPerRequest: 1,
      },
      {
        id: 'claude-sonnet',
        name: 'Claude Sonnet 4.6',
        provider: 'official',
        model: 'claude-sonnet-4-6',
        costPerRequest: 1,
      },
      {
        id: 'claude-opus',
        name: 'Claude Opus 4.6',
        provider: 'official',
        model: 'claude-opus-4-6',
        costPerRequest: 2,
      },
    ];

    officialModels.forEach((model) => this.models.set(model.id, model));
    this.saveModels();
  }

  /**
   * 保存模型配置
   */
  private saveModels(): void {
    const modelsArray = Array.from(this.models.values());
    this.context.globalState.update(this.STORAGE_KEY_MODELS, modelsArray);
  }

  /**
   * 添加自定义模型
   */
  addCustomModel(config: Omit<ModelConfig, 'id' | 'provider'>): string {
    const id = `custom-${Date.now()}`;
    const model: ModelConfig = {
      ...config,
      id,
      provider: 'custom',
    };

    this.models.set(id, model);
    this.saveModels();

    return id;
  }

  /**
   * 获取所有模型
   */
  getModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取模型
   */
  getModel(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  /**
   * 删除自定义模型
   */
  removeModel(id: string): boolean {
    const model = this.models.get(id);
    if (model && model.provider === 'custom') {
      this.models.delete(id);
      this.saveModels();
      return true;
    }
    return false;
  }

  /**
   * 加载使用历史
   */
  private loadUsageHistory(): void {
    const stored = this.context.globalState.get<UsageRecord[]>(this.STORAGE_KEY_USAGE);
    if (stored) {
      // 只保留最近 7 天的记录
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.usageHistory = stored.filter((r) => r.timestamp > sevenDaysAgo);
    }
  }

  /**
   * 保存使用历史
   */
  private saveUsageHistory(): void {
    // 只保存最近 1000 条
    const recent = this.usageHistory.slice(-1000);
    this.context.globalState.update(this.STORAGE_KEY_USAGE, recent);
  }

  /**
   * 获取使用统计
   */
  getUsageStats(days: number = 7): {
    totalRequests: number;
    totalQuota: number;
    totalTokens: number;
    byModel: Record<string, { requests: number; quota: number; tokens: number }>;
    byDay: Record<string, { requests: number; quota: number; tokens: number }>;
  } {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentRecords = this.usageHistory.filter((r) => r.timestamp > cutoff);

    const stats = {
      totalRequests: recentRecords.length,
      totalQuota: recentRecords.reduce((sum, r) => sum + r.quotaUsed, 0),
      totalTokens: recentRecords.reduce((sum, r) => sum + r.tokensUsed, 0),
      byModel: {} as Record<string, { requests: number; quota: number; tokens: number }>,
      byDay: {} as Record<string, { requests: number; quota: number; tokens: number }>,
    };

    // 按模型统计
    recentRecords.forEach((record) => {
      if (!stats.byModel[record.modelId]) {
        stats.byModel[record.modelId] = { requests: 0, quota: 0, tokens: 0 };
      }
      stats.byModel[record.modelId].requests++;
      stats.byModel[record.modelId].quota += record.quotaUsed;
      stats.byModel[record.modelId].tokens += record.tokensUsed;
    });

    // 按天统计
    recentRecords.forEach((record) => {
      const day = new Date(record.timestamp).toISOString().split('T')[0];
      if (!stats.byDay[day]) {
        stats.byDay[day] = { requests: 0, quota: 0, tokens: 0 };
      }
      stats.byDay[day].requests++;
      stats.byDay[day].quota += record.quotaUsed;
      stats.byDay[day].tokens += record.tokensUsed;
    });

    return stats;
  }

  /**
   * 同步到云端
   */
  private async syncToCloud(): Promise<void> {
    // TODO: 实现云端同步
    // 将在 cloud-service 中实现
    const eventBus = getEventBus();
    eventBus.emit('quota.sync.requested', {
      quota: this.quotaInfo,
      usage: this.usageHistory.slice(-100), // 最近 100 条
    });
  }

  /**
   * 显示额度状态
   */
  showStatus(): void {
    const info = this.getQuotaInfo();
    vscode.window.showInformationMessage(
      `Quota: ${info.remainingFreeQuota}/${info.dailyFreeQuota} remaining`
    );
  }
}
