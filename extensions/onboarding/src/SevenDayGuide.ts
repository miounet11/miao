import * as vscode from 'vscode';

/**
 * 7 天引导系统
 * 目标：让用户逐步深入，形成使用习惯
 */

export interface DailyTask {
  id: string;
  day: number;
  title: string;
  description: string;
  reward: string;
  completed: boolean;
  guide: string;
  action?: string;
}

export interface DayProgress {
  day: number;
  title: string;
  tasks: DailyTask[];
  unlockFeature?: string;
  completed: boolean;
}

export class SevenDayGuide {
  private context: vscode.ExtensionContext;
  private currentDay: number = 1;
  private progress: Map<number, DayProgress> = new Map();
  private statusBarItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadProgress();
    this.initializeDays();

    // 创建状态栏
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'miaoda.showDailyTasks';
    this.statusBarItem.show();

    this.updateStatusBar();
    this.setupEventListeners();
  }

  /**
   * 初始化 7 天任务
   */
  private initializeDays(): void {
    const days: DayProgress[] = [
      {
        day: 1,
        title: '🎯 Day 1: 感受速度',
        tasks: [
          {
            id: 'day1-task1',
            day: 1,
            title: '生成一个函数',
            description: '使用 AI 生成你的第一个函数',
            reward: '+5 额度',
            completed: false,
            guide: '选中代码 → 右键 → Miaoda: Generate Function',
            action: 'miaoda.generateFunction',
          },
          {
            id: 'day1-task2',
            day: 1,
            title: '重构一段代码',
            description: '体验 AI 重构的强大',
            reward: '+5 额度',
            completed: false,
            guide: '选中代码 → Cmd+Shift+R',
            action: 'miaoda.refactorCode',
          },
          {
            id: 'day1-task3',
            day: 1,
            title: '使用快捷键',
            description: '尝试 3 次快捷键操作',
            reward: '+3 额度',
            completed: false,
            guide: 'Cmd+Shift+P → 查看所有快捷键',
          },
        ],
        unlockFeature: '快捷键面板',
        completed: false,
      },
      {
        day: 2,
        title: '🤖 Day 2: 认识你的 AI 团队',
        tasks: [
          {
            id: 'day2-task1',
            day: 2,
            title: '启动 Agent Team',
            description: '看 3 个 Agent 并行工作',
            reward: '+10 额度',
            completed: false,
            guide: 'Cmd+Shift+A → 选择任务',
            action: 'miaoda.startAgentTeam',
          },
          {
            id: 'day2-task2',
            day: 2,
            title: '对比串行 vs 并行',
            description: '感受 3x 的速度提升',
            reward: '解锁成就：速度之王',
            completed: false,
            guide: '系统自动对比',
          },
        ],
        unlockFeature: 'Agent 可视化面板',
        completed: false,
      },
      {
        day: 3,
        title: '⚡ Day 3: 创建你的第一个 Skill',
        tasks: [
          {
            id: 'day3-task1',
            day: 3,
            title: '生成一个 Skill',
            description: '把常用操作保存为 Skill',
            reward: '+15 额度',
            completed: false,
            guide: 'Cmd+Shift+S → 描述问题',
            action: 'miaoda.skill.generate',
          },
          {
            id: 'day3-task2',
            day: 3,
            title: '使用 Skill',
            description: '体验一键复用的快感',
            reward: '+5 额度',
            completed: false,
            guide: '快捷面板 → 选择 Skill',
          },
        ],
        unlockFeature: 'Skill 系统',
        completed: false,
      },
      {
        day: 4,
        title: '⌨️ Day 4: 命令行的力量',
        tasks: [
          {
            id: 'day4-task1',
            day: 4,
            title: '在终端使用 Miaoda',
            description: 'CLI 和 IDE 无缝切换',
            reward: '+10 额度',
            completed: false,
            guide: '$ miaoda chat "帮我优化这个函数"',
          },
        ],
        unlockFeature: 'CLI 深度集成',
        completed: false,
      },
      {
        day: 5,
        title: '🔑 Day 5: 使用你自己的 API Key',
        tasks: [
          {
            id: 'day5-task1',
            day: 5,
            title: '添加自定义模型',
            description: '不再受限于免费额度',
            reward: '无限使用',
            completed: false,
            guide: '设置 → 添加模型 → 输入 API Key',
            action: 'miaoda.addCustomModel',
          },
        ],
        unlockFeature: '无限可能',
        completed: false,
      },
      {
        day: 6,
        title: '🌟 Day 6: 分享你的成就',
        tasks: [
          {
            id: 'day6-task1',
            day: 6,
            title: '查看你的统计',
            description: '看看你节省了多少时间',
            reward: '+5 额度',
            completed: false,
            guide: '点击状态栏 → 查看统计',
          },
        ],
        unlockFeature: '统计面板',
        completed: false,
      },
      {
        day: 7,
        title: '🚀 Day 7: 成为 Miaoda 大师',
        tasks: [
          {
            id: 'day7-task1',
            day: 7,
            title: '完成 7 天挑战',
            description: '恭喜你养成了使用习惯',
            reward: '+50 额度 + 专属徽章',
            completed: false,
            guide: '继续保持！',
          },
        ],
        unlockFeature: '全部功能',
        completed: false,
      },
    ];

    days.forEach((day) => this.progress.set(day.day, day));
  }

  /**
   * 加载进度
   */
  private loadProgress(): void {
    const saved = this.context.globalState.get<any>('onboardingProgress');
    if (saved) {
      this.currentDay = saved.currentDay || 1;
      // TODO: 恢复任务完成状态
    }
  }

  /**
   * 保存进度
   */
  private saveProgress(): void {
    this.context.globalState.update('onboardingProgress', {
      currentDay: this.currentDay,
      progress: Array.from(this.progress.values()),
    });
  }

  /**
   * 更新状态栏
   */
  private updateStatusBar(): void {
    const dayProgress = this.progress.get(this.currentDay);
    if (!dayProgress) return;

    const completedTasks = dayProgress.tasks.filter((t) => t.completed).length;
    const totalTasks = dayProgress.tasks.length;

    this.statusBarItem.text = `$(mortar-board) Day ${this.currentDay}/7 (${completedTasks}/${totalTasks})`;
    this.statusBarItem.tooltip = `${dayProgress.title}\n点击查看今日任务`;
  }

  /**
   * 显示每日任务
   */
  async showDailyTasks(): Promise<void> {
    const dayProgress = this.progress.get(this.currentDay);
    if (!dayProgress) return;

    const panel = vscode.window.createWebviewPanel(
      'miaodaDailyTasks',
      `Day ${this.currentDay} 任务`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.getTasksWebviewContent(dayProgress);

    panel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'startTask':
          this.startTask(message.taskId);
          break;
        case 'completeTask':
          this.completeTask(message.taskId);
          break;
      }
    });
  }

  /**
   * 开始任务
   */
  private async startTask(taskId: string): Promise<void> {
    const dayProgress = this.progress.get(this.currentDay);
    if (!dayProgress) return;

    const task = dayProgress.tasks.find((t) => t.id === taskId);
    if (!task || !task.action) return;

    // 执行任务关联的命令
    await vscode.commands.executeCommand(task.action);
  }

  /**
   * 完成任务
   */
  private completeTask(taskId: string): void {
    const dayProgress = this.progress.get(this.currentDay);
    if (!dayProgress) return;

    const task = dayProgress.tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.completed = true;

    // 检查是否完成当天所有任务
    const allCompleted = dayProgress.tasks.every((t) => t.completed);
    if (allCompleted) {
      dayProgress.completed = true;
      this.onDayCompleted(this.currentDay);
    }

    this.saveProgress();
    this.updateStatusBar();
  }

  /**
   * 当天完成
   */
  private onDayCompleted(day: number): void {
    const dayProgress = this.progress.get(day);
    if (!dayProgress) return;

    // 显示完成通知
    vscode.window
      .showInformationMessage(
        `🎉 Day ${day} 完成！${dayProgress.unlockFeature ? `解锁：${dayProgress.unlockFeature}` : ''}`,
        '查看奖励',
        '继续'
      )
      .then((action) => {
        if (action === '查看奖励') {
          this.showRewards(day);
        }
      });

    // 如果不是最后一天，准备下一天
    if (day < 7) {
      setTimeout(() => {
        this.currentDay = day + 1;
        this.saveProgress();
        this.updateStatusBar();
        this.showDailyTasks();
      }, 2000);
    } else {
      // 完成 7 天挑战
      this.onChallengeCompleted();
    }
  }

  /**
   * 显示奖励
   */
  private showRewards(day: number): void {
    const dayProgress = this.progress.get(day);
    if (!dayProgress) return;

    const rewards = dayProgress.tasks.map((t) => t.reward).join('\n');
    vscode.window.showInformationMessage(`🎁 Day ${day} 奖励：\n${rewards}`);
  }

  /**
   * 完成 7 天挑战
   */
  private onChallengeCompleted(): void {
    vscode.window
      .showInformationMessage(
        '🏆 恭喜完成 7 天挑战！\n你已经成为 Miaoda 大师\n\n奖励：+50 额度 + 专属徽章',
        '查看成就',
        '分享'
      )
      .then((action) => {
        if (action === '查看成就') {
          vscode.commands.executeCommand('miaoda.showAchievements');
        } else if (action === '分享') {
          // TODO: 分享到社交媒体
        }
      });
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // TODO: 集成事件系统后实现自动任务完成检测
  }

  /**
   * 检查任务完成
   */
  private checkTaskCompletion(type: string): void {
    const dayProgress = this.progress.get(this.currentDay);
    if (!dayProgress) return;

    // 根据类型自动完成相关任务
    dayProgress.tasks.forEach((task) => {
      if (!task.completed && task.id.includes(type)) {
        this.completeTask(task.id);
      }
    });
  }

  /**
   * 生成任务 Webview 内容
   */
  private getTasksWebviewContent(dayProgress: DayProgress): string {
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
        .header {
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .progress-bar {
            height: 8px;
            background: #3c3c3c;
            border-radius: 4px;
            overflow: hidden;
            margin: 15px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #007acc, #00a8ff);
            transition: width 0.3s;
        }
        .task-list {
            display: grid;
            gap: 15px;
        }
        .task-card {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #007acc;
        }
        .task-card.completed {
            opacity: 0.6;
            border-left-color: #0fa958;
        }
        .task-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .task-title {
            font-size: 18px;
            font-weight: 600;
        }
        .task-reward {
            background: #ffd700;
            color: #333;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .task-description {
            color: #858585;
            margin-bottom: 10px;
        }
        .task-guide {
            background: #2d2d30;
            padding: 10px;
            border-radius: 4px;
            font-size: 13px;
            margin-bottom: 10px;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .btn-primary {
            background: #007acc;
            color: white;
        }
        .btn-success {
            background: #0fa958;
            color: white;
        }
        .unlock-badge {
            background: #ffd700;
            color: #333;
            padding: 10px 20px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 20px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${dayProgress.title}</h1>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${(dayProgress.tasks.filter((t) => t.completed).length / dayProgress.tasks.length) * 100}%"></div>
        </div>
        <p>${dayProgress.tasks.filter((t) => t.completed).length}/${dayProgress.tasks.length} 任务完成</p>
    </div>

    <div class="task-list">
        ${dayProgress.tasks
          .map(
            (task) => `
            <div class="task-card ${task.completed ? 'completed' : ''}">
                <div class="task-header">
                    <div class="task-title">${task.completed ? '✅' : '⏳'} ${task.title}</div>
                    <div class="task-reward">${task.reward}</div>
                </div>
                <div class="task-description">${task.description}</div>
                <div class="task-guide">💡 ${task.guide}</div>
                ${!task.completed && task.action ? `<button class="btn-primary" onclick="startTask('${task.id}')">开始任务</button>` : ''}
                ${task.completed ? '<button class="btn-success" disabled>已完成</button>' : ''}
            </div>
        `
          )
          .join('')}
    </div>

    ${dayProgress.unlockFeature ? `<div class="unlock-badge">🎁 完成后解锁：${dayProgress.unlockFeature}</div>` : ''}

    <script>
        const vscode = acquireVsCodeApi();

        function startTask(taskId) {
            vscode.postMessage({ command: 'startTask', taskId });
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

/**
 * 单例
 */
let sevenDayGuideInstance: SevenDayGuide | undefined;

export function getSevenDayGuide(context: vscode.ExtensionContext): SevenDayGuide {
  if (!sevenDayGuideInstance) {
    sevenDayGuideInstance = new SevenDayGuide(context);
  }
  return sevenDayGuideInstance;
}
