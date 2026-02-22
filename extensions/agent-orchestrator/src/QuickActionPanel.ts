import * as vscode from 'vscode';

/**
 * 快捷操作
 */
export interface QuickAction {
  id: string;
  number: number;
  icon: string;
  title: string;
  description: string;
  command: string;
  category: 'code' | 'test' | 'review' | 'debug' | 'doc';
}

/**
 * 快捷操作面板
 * TikTok 风格的浮动面板
 */
export class QuickActionPanel {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private actions: QuickAction[];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.actions = this.initializeActions();
  }

  /**
   * 初始化快捷操作
   */
  private initializeActions(): QuickAction[] {
    return [
      {
        id: 'commit',
        number: 1,
        icon: '📝',
        title: '智能提交',
        description: '自动生成 commit 消息',
        command: 'miaoda.smartCommit',
        category: 'code',
      },
      {
        id: 'review',
        number: 2,
        icon: '🔍',
        title: '代码审查',
        description: '深度两阶段代码审查',
        command: 'miaoda.codeReview',
        category: 'review',
      },
      {
        id: 'test',
        number: 3,
        icon: '🧪',
        title: '编写测试',
        description: 'TDD 工作流',
        command: 'miaoda.writeTests',
        category: 'test',
      },
      {
        id: 'feature',
        number: 4,
        icon: '📋',
        title: '规划功能',
        description: '6步开发流程',
        command: 'miaoda.planFeature',
        category: 'code',
      },
      {
        id: 'debug',
        number: 5,
        icon: '🐛',
        title: '调试问题',
        description: '系统性调试',
        command: 'miaoda.debugIssue',
        category: 'debug',
      },
      {
        id: 'brainstorm',
        number: 6,
        icon: '💡',
        title: '头脑风暴',
        description: '探索想法和方案',
        command: 'miaoda.brainstorm',
        category: 'code',
      },
      {
        id: 'verify',
        number: 7,
        icon: '✅',
        title: '验证代码',
        description: '质量验证',
        command: 'miaoda.verifyCode',
        category: 'review',
      },
      {
        id: 'docs',
        number: 8,
        icon: '📖',
        title: '写文档',
        description: '生成文档',
        command: 'miaoda.generateDocs',
        category: 'doc',
      },
    ];
  }

  /**
   * 显示面板
   */
  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'miaodaQuickActions',
      '⚡ Quick Actions',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    // 处理消息
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === 'executeAction') {
          await this.executeAction(message.actionId);
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  /**
   * 执行快捷操作
   */
  async executeAction(actionId: string): Promise<void> {
    const action = this.actions.find((a) => a.id === actionId);
    if (!action) {
      return;
    }

    try {
      await vscode.commands.executeCommand(action.command);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to execute ${action.title}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 通过数字执行
   */
  async executeByNumber(number: number): Promise<void> {
    const action = this.actions.find((a) => a.number === number);
    if (action) {
      await this.executeAction(action.id);
    }
  }

  /**
   * 生成 Webview 内容
   */
  private getWebviewContent(): string {
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
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #858585;
            font-size: 14px;
        }
        .actions-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            max-width: 800px;
            margin: 0 auto;
        }
        .action-card {
            background: #252526;
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid transparent;
            position: relative;
        }
        .action-card:hover {
            background: #2d2d30;
            border-color: #007acc;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
        }
        .action-number {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 32px;
            height: 32px;
            background: #007acc;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 16px;
        }
        .action-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .action-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .action-description {
            font-size: 13px;
            color: #858585;
        }
        .shortcut-hint {
            text-align: center;
            margin-top: 30px;
            padding: 15px;
            background: #252526;
            border-radius: 8px;
            color: #858585;
        }
        .shortcut-hint strong {
            color: #ffd700;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .action-card:active {
            animation: pulse 0.3s;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ Quick Actions</h1>
        <p class="subtitle">一键触发常用功能</p>
    </div>

    <div class="actions-grid">
        ${this.actions
          .map(
            (action) => `
            <div class="action-card" onclick="executeAction('${action.id}')">
                <div class="action-number">${action.number}</div>
                <div class="action-icon">${action.icon}</div>
                <div class="action-title">${action.title}</div>
                <div class="action-description">${action.description}</div>
            </div>
        `
          )
          .join('')}
    </div>

    <div class="shortcut-hint">
        💡 <strong>快捷键提示</strong>: 在编辑器中输入数字 <strong>1-8</strong> 快速触发对应操作
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function executeAction(actionId) {
            vscode.postMessage({
                command: 'executeAction',
                actionId: actionId
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 8) {
                const actions = ${JSON.stringify(this.actions)};
                const action = actions.find(a => a.number === num);
                if (action) {
                    executeAction(action.id);
                }
            }
        });
    </script>
</body>
</html>
    `;
  }

  dispose(): void {
    this.panel?.dispose();
  }
}

/**
 * 单例
 */
let quickActionPanelInstance: QuickActionPanel | undefined;

export function getQuickActionPanel(
  context: vscode.ExtensionContext
): QuickActionPanel {
  if (!quickActionPanelInstance) {
    quickActionPanelInstance = new QuickActionPanel(context);
  }
  return quickActionPanelInstance;
}
