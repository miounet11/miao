import * as vscode from 'vscode';
import { getSkillRecommender } from '../../skills-manager/src/SkillRecommender';
import { getLiveProgressTracker } from '../../agent-orchestrator/src/LiveProgressPanel';
import { getAchievementSystem } from '../../agent-orchestrator/src/AchievementSystem';

/**
 * 快捷操作
 */
export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  command: string;
  priority: number;
  highlighted?: boolean;
  badge?: string;
}

/**
 * 快捷操作面板
 */
export class QuickActionPanel {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private recentActions: string[] = [];
  private maxRecentActions = 5;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadRecentActions();
  }

  /**
   * 显示快捷操作面板
   */
  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'miaodaQuickActions',
      '💡 快捷操作',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = await this.getWebviewContent();

    // 处理消息
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'executeAction':
            await this.executeAction(message.actionId);
            break;
          case 'refresh':
            await this.refresh();
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // 启动实时更新
    this.startLiveUpdates();
  }

  /**
   * 获取快捷操作列表
   */
  private async getQuickActions(): Promise<QuickAction[]> {
    const actions: QuickAction[] = [
      {
        id: '1',
        label: '📝 智能提交',
        description: '自动生成 commit 消息',
        icon: '📝',
        command: 'miaoda.skill.commit',
        priority: 10,
      },
      {
        id: '2',
        label: '🔍 代码审查',
        description: '深度两阶段代码审查',
        icon: '🔍',
        command: 'miaoda.skill.review',
        priority: 9,
      },
      {
        id: '3',
        label: '🧪 编写测试',
        description: 'TDD 工作流',
        icon: '🧪',
        command: 'miaoda.skill.tdd',
        priority: 8,
      },
      {
        id: '4',
        label: '📋 规划功能',
        description: '6步开发流程',
        icon: '📋',
        command: 'miaoda.skill.workflow',
        priority: 7,
      },
      {
        id: '5',
        label: '🐛 调试问题',
        description: '系统性调试',
        icon: '🐛',
        command: 'miaoda.skill.debug',
        priority: 6,
      },
      {
        id: '6',
        label: '💡 头脑风暴',
        description: '探索想法和方案',
        icon: '💡',
        command: 'miaoda.skill.brainstorm',
        priority: 5,
      },
      {
        id: '7',
        label: '✅ 验证代码',
        description: '质量验证',
        icon: '✅',
        command: 'miaoda.skill.verify',
        priority: 4,
      },
      {
        id: '8',
        label: '📖 写文档',
        description: '生成文档',
        icon: '📖',
        command: 'miaoda.skill.docs',
        priority: 3,
      },
    ];

    // 获取智能推荐
    const recommender = getSkillRecommender();
    const recommendations = await recommender.recommendSkills();

    // 高亮推荐的操作
    for (const rec of recommendations.slice(0, 3)) {
      const action = actions.find((a) => a.command.includes(rec.skillName.replace('/', '')));
      if (action) {
        action.highlighted = true;
        action.badge = '推荐';
        action.priority += 10;
      }
    }

    // 按优先级排序
    return actions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 执行操作
   */
  private async executeAction(actionId: string): Promise<void> {
    const actions = await this.getQuickActions();
    const action = actions.find((a) => a.id === actionId);

    if (!action) {
      return;
    }

    // 记录到最近使用
    this.addRecentAction(actionId);

    // 执行命令
    await vscode.commands.executeCommand(action.command);

    // 关闭面板
    this.panel?.dispose();
  }

  /**
   * 刷新面板
   */
  private async refresh(): Promise<void> {
    if (this.panel) {
      this.panel.webview.html = await this.getWebviewContent();
    }
  }

  /**
   * 启动实时更新
   */
  private startLiveUpdates(): void {
    const tracker = getLiveProgressTracker();
    tracker.start();

    tracker.onProgress((progress) => {
      if (this.panel) {
        this.panel.webview.postMessage({
          command: 'updateProgress',
          progress,
        });
      }
    });

    // 监听成就解锁
    const achievementSystem = getAchievementSystem();
    achievementSystem.onAchievementUnlocked((unlocked) => {
      if (this.panel) {
        this.panel.webview.postMessage({
          command: 'achievementUnlocked',
          achievement: unlocked,
        });
      }
    });
  }

  /**
   * 生成 Webview 内容
   */
  private async getWebviewContent(): Promise<string> {
    const actions = await this.getQuickActions();
    const tracker = getLiveProgressTracker();
    const achievementSystem = getAchievementSystem();
    const stats = achievementSystem.getStats();

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>快捷操作</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }

        .header p {
            opacity: 0.9;
            font-size: 14px;
        }

        .stats-bar {
            display: flex;
            justify-content: space-around;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 20px;
        }

        .stat-item {
            text-align: center;
        }

        .stat-value {
            font-size: 24px;
            font-weight: bold;
            display: block;
        }

        .stat-label {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 5px;
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .action-card {
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
            position: relative;
            overflow: hidden;
        }

        .action-card:hover {
            transform: translateY(-5px);
            background: rgba(255,255,255,0.25);
            border-color: rgba(255,255,255,0.3);
        }

        .action-card.highlighted {
            border-color: #ffd700;
            box-shadow: 0 0 20px rgba(255,215,0,0.3);
        }

        .action-card.highlighted::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #ffd700, #ffed4e);
        }

        .action-icon {
            font-size: 32px;
            margin-bottom: 10px;
            display: block;
        }

        .action-label {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .action-description {
            font-size: 12px;
            opacity: 0.8;
        }

        .action-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ffd700;
            color: #333;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
        }

        .progress-section {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin-top: 20px;
        }

        .progress-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
        }

        .progress-item {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 10px;
            margin-bottom: 10px;
        }

        .recent-actions {
            margin-top: 20px;
        }

        .recent-title {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 10px;
        }

        .recent-list {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .recent-item {
            background: rgba(255,255,255,0.1);
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💡 快捷操作</h1>
            <p>输入数字 (1-8) 或点击卡片执行操作</p>
        </div>

        <div class="stats-bar">
            <div class="stat-item">
                <span class="stat-value">${stats.tasksCompleted}</span>
                <span class="stat-label">已完成任务</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.linesRefactored}</span>
                <span class="stat-label">重构代码行</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.testCoverage}%</span>
                <span class="stat-label">测试覆盖率</span>
            </div>
        </div>

        <div class="actions-grid">
            ${actions
              .map(
                (action) => `
                <div class="action-card ${action.highlighted ? 'highlighted' : ''}"
                     onclick="executeAction('${action.id}')">
                    ${action.badge ? `<div class="action-badge">${action.badge}</div>` : ''}
                    <span class="action-icon">${action.icon}</span>
                    <div class="action-label">${action.label}</div>
                    <div class="action-description">${action.description}</div>
                </div>
            `
              )
              .join('')}
        </div>

        <div class="progress-section" id="progressSection" style="display: none;">
            <div class="progress-title">🔄 实时进度</div>
            <div id="progressContent"></div>
        </div>

        ${this.recentActions.length > 0 ? `
        <div class="recent-actions">
            <div class="recent-title">最近使用</div>
            <div class="recent-list">
                ${this.recentActions.map((id) => {
                  const action = actions.find((a) => a.id === id);
                  return action ? `<div class="recent-item">${action.icon} ${action.label}</div>` : '';
                }).join('')}
            </div>
        </div>
        ` : ''}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function executeAction(actionId) {
            vscode.postMessage({
                command: 'executeAction',
                actionId: actionId
            });
        }

        // 监听键盘输入
        document.addEventListener('keydown', (e) => {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 8) {
                executeAction(num.toString());
            }
        });

        // 接收消息
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'updateProgress':
                    updateProgress(message.progress);
                    break;
                case 'achievementUnlocked':
                    showAchievement(message.achievement);
                    break;
            }
        });

        function updateProgress(progress) {
            const section = document.getElementById('progressSection');
            const content = document.getElementById('progressContent');

            if (progress.runningTasks > 0) {
                section.style.display = 'block';
                content.innerHTML = \`
                    <div class="progress-item">
                        <div>📊 \${progress.completedTasks}/\${progress.totalTasks} 任务完成</div>
                        \${progress.currentTask ? \`
                            <div style="margin-top: 10px;">
                                <div>🔄 \${progress.currentTask.name}</div>
                                <div style="opacity: 0.8; font-size: 12px;">
                                    \${progress.currentTask.currentStep} - \${progress.currentTask.progress}%
                                </div>
                            </div>
                        \` : ''}
                    </div>
                \`;
            } else {
                section.style.display = 'none';
            }
        }

        function showAchievement(achievement) {
            // TODO: 显示成就解锁动画
            console.log('Achievement unlocked:', achievement);
        }
    </script>
</body>
</html>
    `;
  }

  /**
   * 添加到最近使用
   */
  private addRecentAction(actionId: string): void {
    this.recentActions = this.recentActions.filter((id) => id !== actionId);
    this.recentActions.unshift(actionId);
    if (this.recentActions.length > this.maxRecentActions) {
      this.recentActions.pop();
    }
    this.saveRecentActions();
  }

  /**
   * 保存最近使用
   */
  private saveRecentActions(): void {
    this.context.globalState.update('recentActions', this.recentActions);
  }

  /**
   * 加载最近使用
   */
  private loadRecentActions(): void {
    this.recentActions = this.context.globalState.get('recentActions', []);
  }
}
