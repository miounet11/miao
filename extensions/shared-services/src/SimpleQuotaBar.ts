import * as vscode from 'vscode';

/**
 * 极简额度状态栏
 * 设计原则：一眼看懂，零学习成本
 */
export class SimpleQuotaBar {
  private statusBar: vscode.StatusBarItem;
  private context: vscode.ExtensionContext;
  private quota: number = 50;
  private used: number = 0;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // 创建状态栏（右侧，高优先级）
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      1000
    );

    this.statusBar.command = 'miaoda.showQuotaDetails';
    this.loadQuota();
    this.update();
    this.statusBar.show();
  }

  /**
   * 加载额度
   */
  private loadQuota(): void {
    const today = new Date().toDateString();
    const lastDate = this.context.globalState.get<string>('quotaDate');

    if (lastDate !== today) {
      // 新的一天，重置额度
      this.used = 0;
      this.context.globalState.update('quotaDate', today);
      this.context.globalState.update('quotaUsed', 0);
    } else {
      this.used = this.context.globalState.get<number>('quotaUsed', 0);
    }
  }

  /**
   * 更新显示
   */
  private update(): void {
    const remaining = this.quota - this.used;
    const percentage = remaining / this.quota;

    // 选择图标和颜色
    let icon: string;
    let color: string | undefined;

    if (percentage > 0.3) {
      icon = '⚡';
      color = undefined; // 默认颜色
    } else if (percentage > 0.1) {
      icon = '⚠️';
      color = 'statusBarItem.warningBackground';
    } else {
      icon = '🔴';
      color = 'statusBarItem.errorBackground';
    }

    // 更新状态栏
    this.statusBar.text = `${icon} ${remaining}/${this.quota}`;
    this.statusBar.tooltip = `今日剩余额度：${remaining}/${this.quota}\n点击查看详情`;
    this.statusBar.backgroundColor = color ? new vscode.ThemeColor(color) : undefined;
  }

  /**
   * 消耗额度
   */
  async consume(amount: number = 1): Promise<boolean> {
    if (this.used + amount > this.quota) {
      // 额度不足
      const action = await vscode.window.showWarningMessage(
        `额度不足！今日剩余 ${this.quota - this.used}/${this.quota}`,
        '使用自己的 API Key',
        '明天再试'
      );

      if (action === '使用自己的 API Key') {
        await vscode.commands.executeCommand('miaoda.addApiKey');
      }

      return false;
    }

    this.used += amount;
    await this.context.globalState.update('quotaUsed', this.used);
    this.update();

    return true;
  }

  /**
   * 显示详情
   */
  async showDetails(): Promise<void> {
    const remaining = this.quota - this.used;
    const percentage = Math.round((remaining / this.quota) * 100);

    // 计算重置时间
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const hoursUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));

    const panel = vscode.window.createWebviewPanel(
      'miaodaQuota',
      '额度详情',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = this.getDetailsHTML(remaining, percentage, hoursUntilReset);

    // 处理消息
    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === 'addApiKey') {
          await vscode.commands.executeCommand('miaoda.addApiKey');
          panel.dispose();
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * 生成详情 HTML（极简风格）
   */
  private getDetailsHTML(remaining: number, percentage: number, hoursUntilReset: number): string {
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
            padding: 40px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 30px;
            text-align: center;
        }
        .quota-display {
            text-align: center;
            margin-bottom: 30px;
        }
        .quota-number {
            font-size: 64px;
            font-weight: 600;
            color: ${percentage > 30 ? '#0fa958' : percentage > 10 ? '#ffd700' : '#e5484d'};
        }
        .quota-total {
            font-size: 24px;
            color: #858585;
        }
        .progress-bar {
            height: 8px;
            background: #3c3c3c;
            border-radius: 4px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: ${percentage > 30 ? '#0fa958' : percentage > 10 ? '#ffd700' : '#e5484d'};
            width: ${percentage}%;
            transition: width 0.3s;
        }
        .info {
            background: #252526;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #3c3c3c;
        }
        .info-item:last-child {
            border-bottom: none;
        }
        .info-label {
            color: #858585;
        }
        .info-value {
            font-weight: 600;
        }
        button {
            width: 100%;
            padding: 15px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            background: #007acc;
            color: white;
            transition: background 0.3s;
        }
        button:hover {
            background: #005a9e;
        }
        .tip {
            text-align: center;
            margin-top: 20px;
            color: #858585;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>今日额度</h1>

        <div class="quota-display">
            <div class="quota-number">${remaining}</div>
            <div class="quota-total">/ ${this.quota}</div>
        </div>

        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>

        <div class="info">
            <div class="info-item">
                <span class="info-label">已使用</span>
                <span class="info-value">${this.used} 次</span>
            </div>
            <div class="info-item">
                <span class="info-label">重置时间</span>
                <span class="info-value">${hoursUntilReset} 小时后</span>
            </div>
        </div>

        <button onclick="addApiKey()">使用自己的 API Key（无限额度）</button>

        <div class="tip">
            💡 添加 API Key 后无需消耗免费额度
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function addApiKey() {
            vscode.postMessage({ command: 'addApiKey' });
        }
    </script>
</body>
</html>
    `;
  }

  dispose(): void {
    this.statusBar.dispose();
  }
}

/**
 * 单例
 */
let simpleQuotaBarInstance: SimpleQuotaBar | undefined;

export function getSimpleQuotaBar(context: vscode.ExtensionContext): SimpleQuotaBar {
  if (!simpleQuotaBarInstance) {
    simpleQuotaBarInstance = new SimpleQuotaBar(context);
  }
  return simpleQuotaBarInstance;
}
