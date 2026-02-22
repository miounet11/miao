import * as vscode from 'vscode';
import { QuotaManager, QuotaInfo } from './QuotaManager';
import { getEventBus } from './EventBus';

/**
 * 额度状态栏显示
 *
 * 显示当前剩余额度，点击查看详情
 */
export class QuotaStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private quotaManager: QuotaManager;

  constructor(quotaManager: QuotaManager) {
    this.quotaManager = quotaManager;

    // 创建状态栏项
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      200
    );
    this.statusBarItem.command = 'miaoda.showQuotaDetails';
    this.statusBarItem.show();

    // 初始更新
    this.updateStatusBar();

    // 监听额度变化
    this.setupEventListeners();
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    const eventBus = getEventBus();

    eventBus.on('quota.consumed', () => {
      this.updateStatusBar();
    });
  }

  /**
   * 更新状态栏
   */
  private updateStatusBar(): void {
    const quota = this.quotaManager.getQuotaInfo();
    const percentage = (quota.remainingFreeQuota / quota.dailyFreeQuota) * 100;

    // 图标和颜色
    let icon = '$(zap)';
    let color: string | undefined;

    if (percentage <= 10) {
      icon = '$(warning)';
      color = '#ff6b6b';
    } else if (percentage <= 30) {
      icon = '$(alert)';
      color = '#ffa500';
    }

    // 显示文本
    this.statusBarItem.text = `${icon} ${quota.remainingFreeQuota}/${quota.dailyFreeQuota}`;
    this.statusBarItem.tooltip = this.getTooltip(quota);
    this.statusBarItem.color = color;
  }

  /**
   * 获取提示文本
   */
  private getTooltip(quota: QuotaInfo): string {
    const lines: string[] = [];

    lines.push('🎯 Miaoda 额度');
    lines.push('');
    lines.push(`今日剩余: ${quota.remainingFreeQuota}/${quota.dailyFreeQuota}`);
    lines.push(`已使用: ${quota.usedFreeQuota}`);
    lines.push('');
    lines.push(`总请求数: ${quota.totalRequests}`);
    lines.push(`总 Tokens: ${quota.totalTokens.toLocaleString()}`);
    lines.push('');
    lines.push('点击查看详情');

    return lines.join('\n');
  }

  /**
   * 显示详情面板
   */
  async showDetails(): Promise<void> {
    const quota = this.quotaManager.getQuotaInfo();
    const stats = this.quotaManager.getUsageStats(7);
    const models = this.quotaManager.getModels();

    const panel = vscode.window.createWebviewPanel(
      'miaodaQuotaDetails',
      '额度详情',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.getWebviewContent(quota, stats, models);

    // 处理消息
    panel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'addModel':
          this.addCustomModel();
          break;
        case 'removeModel':
          this.quotaManager.removeModel(message.modelId);
          panel.webview.html = this.getWebviewContent(
            this.quotaManager.getQuotaInfo(),
            this.quotaManager.getUsageStats(7),
            this.quotaManager.getModels()
          );
          break;
      }
    });
  }

  /**
   * 添加自定义模型
   */
  private async addCustomModel(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: '模型名称',
      placeHolder: '例如：My GPT-4',
    });

    if (!name) return;

    const apiUrl = await vscode.window.showInputBox({
      prompt: 'API URL',
      placeHolder: 'https://api.openai.com/v1/chat/completions',
    });

    if (!apiUrl) return;

    const apiKey = await vscode.window.showInputBox({
      prompt: 'API Key',
      password: true,
    });

    if (!apiKey) return;

    const model = await vscode.window.showInputBox({
      prompt: '模型名称',
      placeHolder: 'gpt-4',
    });

    if (!model) return;

    this.quotaManager.addCustomModel({
      name,
      apiUrl,
      apiKey,
      model,
      costPerRequest: 0, // 自定义模型不消耗额度
    });

    vscode.window.showInformationMessage(`✅ 模型 "${name}" 已添加`);
  }

  /**
   * 生成 Webview 内容
   */
  private getWebviewContent(
    quota: QuotaInfo,
    stats: any,
    models: any[]
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .quota-card {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .quota-progress {
            height: 8px;
            background: #3c3c3c;
            border-radius: 4px;
            overflow: hidden;
            margin: 15px 0;
        }
        .quota-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #007acc, #00a8ff);
            transition: width 0.3s;
        }
        .quota-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat-item {
            background: #2d2d30;
            padding: 15px;
            border-radius: 6px;
        }
        .stat-label {
            font-size: 12px;
            color: #858585;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: 600;
        }
        .section {
            margin-top: 30px;
        }
        .section h2 {
            font-size: 20px;
            margin-bottom: 15px;
        }
        .model-list {
            display: grid;
            gap: 10px;
        }
        .model-item {
            background: #252526;
            padding: 15px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .model-info {
            flex: 1;
        }
        .model-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        .model-meta {
            font-size: 12px;
            color: #858585;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            margin-right: 5px;
        }
        .badge-official {
            background: #007acc;
            color: white;
        }
        .badge-custom {
            background: #6b6b6b;
            color: white;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        .btn-primary {
            background: #007acc;
            color: white;
        }
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        .chart {
            background: #252526;
            padding: 20px;
            border-radius: 8px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 额度管理</h1>
        </div>

        <div class="quota-card">
            <h2>今日额度</h2>
            <div class="quota-progress">
                <div class="quota-progress-bar" style="width: ${(quota.remainingFreeQuota / quota.dailyFreeQuota) * 100}%"></div>
            </div>
            <div style="text-align: center; margin: 10px 0;">
                <span style="font-size: 32px; font-weight: 600;">${quota.remainingFreeQuota}</span>
                <span style="color: #858585;"> / ${quota.dailyFreeQuota}</span>
            </div>

            <div class="quota-stats">
                <div class="stat-item">
                    <div class="stat-label">已使用</div>
                    <div class="stat-value">${quota.usedFreeQuota}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">总请求</div>
                    <div class="stat-value">${stats.totalRequests}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">总 Tokens</div>
                    <div class="stat-value">${stats.totalTokens.toLocaleString()}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h2>模型配置</h2>
                <button class="btn-primary" onclick="addModel()">+ 添加自定义模型</button>
            </div>
            <div class="model-list">
                ${models
                  .map(
                    (model) => `
                    <div class="model-item">
                        <div class="model-info">
                            <div class="model-name">
                                <span class="badge badge-${model.provider}">${model.provider === 'official' ? '官方' : '自定义'}</span>
                                ${model.name}
                            </div>
                            <div class="model-meta">
                                ${model.model} ${model.costPerRequest ? `• ${model.costPerRequest} 额度/次` : '• 免费'}
                            </div>
                        </div>
                        ${model.provider === 'custom' ? `<button class="btn-danger" onclick="removeModel('${model.id}')">删除</button>` : ''}
                    </div>
                `
                  )
                  .join('')}
            </div>
        </div>

        <div class="section">
            <h2>使用统计（最近 7 天）</h2>
            <div class="chart">
                ${Object.entries(stats.byDay)
                  .map(
                    ([day, data]: [string, any]) => `
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>${day}</span>
                            <span>${data.requests} 次 • ${data.quota} 额度</span>
                        </div>
                        <div style="height: 4px; background: #3c3c3c; border-radius: 2px;">
                            <div style="height: 100%; width: ${(data.quota / quota.dailyFreeQuota) * 100}%; background: #007acc; border-radius: 2px;"></div>
                        </div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function addModel() {
            vscode.postMessage({ command: 'addModel' });
        }

        function removeModel(modelId) {
            vscode.postMessage({ command: 'removeModel', modelId });
        }
    </script>
</body>
</html>
    `;
  }

  /**
   * 清理
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
