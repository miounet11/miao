import * as vscode from 'vscode';

/**
 * 渐进式引导系统
 * 7 天成长计划 + 智能推荐 + 游戏化
 */
export class ProgressiveOnboarding {
  private currentDay: number = 0;
  private completedTasks: Set<string> = new Set();
  private userLevel: number = 0;
  private achievements: Achievement[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.loadProgress();
  }

  /**
   * 加载进度
   */
  private async loadProgress(): Promise<void> {
    this.currentDay = this.context.globalState.get('onboardingDay', 0);
    this.completedTasks = new Set(
      this.context.globalState.get<string[]>('completedTasks', [])
    );
    this.userLevel = this.context.globalState.get('userLevel', 0);
    this.achievements = this.context.globalState.get<Achievement[]>('achievements', []);
  }

  /**
   * 保存进度
   */
  private async saveProgress(): Promise<void> {
    await this.context.globalState.update('onboardingDay', this.currentDay);
    await this.context.globalState.update(
      'completedTasks',
      Array.from(this.completedTasks)
    );
    await this.context.globalState.update('userLevel', this.userLevel);
    await this.context.globalState.update('achievements', this.achievements);
  }

  /**
   * 开始引导
   */
  async startOnboarding(): Promise<void> {
    this.currentDay = 1;
    this.completedTasks.clear();
    this.userLevel = 0;
    this.achievements = [];
    await this.saveProgress();

    await this.showDayPlan(1);
  }

  /**
   * 显示每日计划
   */
  async showDayPlan(day: number): Promise<void> {
    const plan = this.getDayPlan(day);
    if (!plan) {
      vscode.window.showInformationMessage('🎉 恭喜完成 7 天引导！');
      return;
    }

    const content = [
      `# 📅 Day ${day}: ${plan.title}`,
      '',
      `## 今日目标`,
      '',
      plan.description,
      '',
      `## 任务清单`,
      '',
      ...plan.tasks.map(
        (task, i) =>
          `${this.completedTasks.has(task.id) ? '✅' : '⬜'} ${i + 1}. **${task.title}**\n   ${task.description}`
      ),
      '',
      `## 技能解锁`,
      '',
      ...plan.skills.map((skill) => `- 🔓 ${skill}`),
      '',
      `## 奖励`,
      '',
      `🎁 ${plan.reward}`,
      '',
      `---`,
      '',
      `进度: ${this.completedTasks.size}/${this.getTotalTasks()} 任务完成`,
      `等级: Level ${this.userLevel}`,
    ].join('\n');

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(doc, { preview: false });
  }

  /**
   * 获取每日计划
   */
  private getDayPlan(day: number): DayPlan | null {
    const plans: { [key: number]: DayPlan } = {
      1: {
        title: '基础操作',
        description: '学习 Miaoda 的基本功能，完成第一次 AI 对话',
        tasks: [
          {
            id: 'day1-task1',
            title: '完成第一次 AI 聊天',
            description: '使用 Cmd+K 打开 AI 聊天，输入问题并获得回答',
            command: 'miaoda.openChat',
          },
          {
            id: 'day1-task2',
            title: '生成代码',
            description: '使用 AI 生成一段代码',
            command: 'miaoda.generateCode',
          },
          {
            id: 'day1-task3',
            title: '审查 AI 建议',
            description: '查看 AI 生成的代码并进行审查',
            command: 'miaoda.codeReview',
          },
        ],
        skills: ['AI 聊天', '代码生成', '代码审查'],
        reward: '解锁 Code Review 功能',
      },
      2: {
        title: '快捷键大师',
        description: '掌握 Miaoda 的快捷键，提升效率',
        tasks: [
          {
            id: 'day2-task1',
            title: '使用快捷操作',
            description: '按 Cmd+Shift+Q 打开快捷操作面板',
            command: 'miaoda.showQuickActions',
          },
          {
            id: 'day2-task2',
            title: '尝试数字快捷键',
            description: '使用 1-8 数字快捷键执行常用操作',
            command: 'miaoda.quickAction1',
          },
          {
            id: 'day2-task3',
            title: '执行 Skill',
            description: '使用 Cmd+Shift+K 执行一个 Skill',
            command: 'miaoda.executeSkill',
          },
        ],
        skills: ['快捷键', 'Skills 系统'],
        reward: '解锁 Agent Team 功能',
      },
      3: {
        title: '智能上下文',
        description: '学习使用智能上下文引擎，自动发现相关代码',
        tasks: [
          {
            id: 'day3-task1',
            title: '智能搜索',
            description: '使用 Cmd+Shift+F 进行智能上下文搜索',
            command: 'miaoda.context.smartSearch',
          },
          {
            id: 'day3-task2',
            title: '语义搜索',
            description: '使用 Cmd+Alt+F 进行语义代码搜索',
            command: 'miaoda.context.semanticSearch',
          },
          {
            id: 'day3-task3',
            title: '依赖分析',
            description: '分析当前文件的依赖关系',
            command: 'miaoda.context.analyzeDependencies',
          },
        ],
        skills: ['智能上下文', '语义搜索', '依赖分析'],
        reward: '解锁成本优化功能',
      },
      4: {
        title: '成本优化',
        description: '学习如何优化 AI 使用成本，节省 40%',
        tasks: [
          {
            id: 'day4-task1',
            title: '查看成本仪表板',
            description: '使用 Cmd+Shift+$ 查看成本统计',
            command: 'miaoda.cost.dashboard',
          },
          {
            id: 'day4-task2',
            title: '成本预测',
            description: '在执行任务前预测成本',
            command: 'miaoda.cost.predict',
          },
          {
            id: 'day4-task3',
            title: '应用优化建议',
            description: '查看并应用成本优化建议',
            command: 'miaoda.cost.optimize',
          },
        ],
        skills: ['成本预测', '智能模型选择', '成本优化'],
        reward: '解锁代码质量守护',
      },
      5: {
        title: '质量保证',
        description: '使用多层质量检查，确保代码质量',
        tasks: [
          {
            id: 'day5-task1',
            title: '代码审查',
            description: '对当前代码进行 AI 审查',
            command: 'miaoda.codeReview',
          },
          {
            id: 'day5-task2',
            title: '代码验证',
            description: '运行多层质量检查',
            command: 'miaoda.verifyCode',
          },
          {
            id: 'day5-task3',
            title: '自动修复',
            description: '应用自动修复建议',
            command: 'miaoda.quality.autoFix',
          },
        ],
        skills: ['代码审查', '质量检查', '自动修复'],
        reward: '解锁 Agent 并行执行',
      },
      6: {
        title: 'Agent 团队',
        description: '使用多 Agent 并行执行，3-5x 加速',
        tasks: [
          {
            id: 'day6-task1',
            title: '启动 Agent Team',
            description: '使用 Cmd+Shift+A 启动 Agent 团队',
            command: 'miaoda.startAgentTeam',
          },
          {
            id: 'day6-task2',
            title: '并行执行',
            description: '提交多个并行任务',
            command: 'miaoda.parallelExecute',
          },
          {
            id: 'day6-task3',
            title: '查看 Agent 池',
            description: '查看 Agent 池统计信息',
            command: 'miaoda.showAgentPoolStats',
          },
        ],
        skills: ['Agent 团队', '并行执行', 'Agent 池'],
        reward: '解锁高级功能',
      },
      7: {
        title: '高级功能',
        description: '掌握所有高级功能，成为 Miaoda 专家',
        tasks: [
          {
            id: 'day7-task1',
            title: '智能提交',
            description: '使用 AI 生成提交信息',
            command: 'miaoda.smartCommit',
          },
          {
            id: 'day7-task2',
            title: '功能规划',
            description: '使用 AI 规划新功能',
            command: 'miaoda.planFeature',
          },
          {
            id: 'day7-task3',
            title: '生成文档',
            description: '自动生成代码文档',
            command: 'miaoda.generateDocs',
          },
        ],
        skills: ['智能提交', '功能规划', '文档生成'],
        reward: '🎉 Miaoda 专家徽章',
      },
    };

    return plans[day] || null;
  }

  /**
   * 完成任务
   */
  async completeTask(taskId: string): Promise<void> {
    if (this.completedTasks.has(taskId)) {
      return;
    }

    this.completedTasks.add(taskId);
    this.userLevel += 10;
    await this.saveProgress();

    // 检查是否完成当天所有任务
    const plan = this.getDayPlan(this.currentDay);
    if (plan) {
      const allCompleted = plan.tasks.every((task) => this.completedTasks.has(task.id));

      if (allCompleted) {
        await this.completeDay();
      }
    }

    // 检查成就
    await this.checkAchievements();

    vscode.window.showInformationMessage(
      `✅ 任务完成！+10 XP (Level ${this.userLevel})`
    );
  }

  /**
   * 完成一天
   */
  private async completeDay(): Promise<void> {
    const plan = this.getDayPlan(this.currentDay);
    if (!plan) return;

    this.currentDay++;
    await this.saveProgress();

    const message = `🎉 Day ${this.currentDay - 1} 完成！\n\n🎁 奖励: ${plan.reward}`;

    const action = await vscode.window.showInformationMessage(
      message,
      '继续下一天',
      '稍后'
    );

    if (action === '继续下一天') {
      await this.showDayPlan(this.currentDay);
    }
  }

  /**
   * 检查成就
   */
  private async checkAchievements(): Promise<void> {
    const newAchievements: Achievement[] = [];

    // 成就 1: 完成第一个任务
    if (this.completedTasks.size === 1 && !this.hasAchievement('first-task')) {
      newAchievements.push({
        id: 'first-task',
        title: '🌟 初次尝试',
        description: '完成第一个任务',
        timestamp: Date.now(),
      });
    }

    // 成就 2: 完成 Day 1
    if (this.currentDay >= 2 && !this.hasAchievement('day1-complete')) {
      newAchievements.push({
        id: 'day1-complete',
        title: '🎯 基础掌握',
        description: '完成 Day 1 所有任务',
        timestamp: Date.now(),
      });
    }

    // 成就 3: 达到 Level 50
    if (this.userLevel >= 50 && !this.hasAchievement('level-50')) {
      newAchievements.push({
        id: 'level-50',
        title: '⚡ 快速成长',
        description: '达到 Level 50',
        timestamp: Date.now(),
      });
    }

    // 成就 4: 完成所有 7 天
    if (this.currentDay > 7 && !this.hasAchievement('7-days-complete')) {
      newAchievements.push({
        id: '7-days-complete',
        title: '🏆 Miaoda 专家',
        description: '完成 7 天引导计划',
        timestamp: Date.now(),
      });
    }

    if (newAchievements.length > 0) {
      this.achievements.push(...newAchievements);
      await this.saveProgress();

      for (const achievement of newAchievements) {
        vscode.window.showInformationMessage(
          `${achievement.title}\n${achievement.description}`
        );
      }
    }
  }

  /**
   * 检查是否有成就
   */
  private hasAchievement(id: string): boolean {
    return this.achievements.some((a) => a.id === id);
  }

  /**
   * 获取总任务数
   */
  private getTotalTasks(): number {
    let total = 0;
    for (let day = 1; day <= 7; day++) {
      const plan = this.getDayPlan(day);
      if (plan) {
        total += plan.tasks.length;
      }
    }
    return total;
  }

  /**
   * 智能功能推荐
   */
  async recommendNextFeature(): Promise<FeatureRecommendation | null> {
    // 基于用户等级和完成的任务推荐功能
    const usage = await this.getUserUsage();

    if (usage.aiChatCount === 0) {
      return {
        feature: 'AI Chat',
        reason: '开始使用 AI 聊天功能',
        command: 'miaoda.openChat',
        priority: 'high',
      };
    }

    if (usage.codeGenCount > 5 && usage.codeReviewCount === 0) {
      return {
        feature: 'Code Review',
        reason: '生成了很多代码，建议进行代码审查',
        command: 'miaoda.codeReview',
        priority: 'high',
      };
    }

    if (usage.totalCost > 1 && !usage.viewedCostDashboard) {
      return {
        feature: 'Cost Dashboard',
        reason: '查看成本统计，优化使用',
        command: 'miaoda.cost.dashboard',
        priority: 'medium',
      };
    }

    if (usage.codeGenCount > 10 && !usage.usedAgentTeam) {
      return {
        feature: 'Agent Team',
        reason: '尝试多 Agent 并行执行，3-5x 加速',
        command: 'miaoda.startAgentTeam',
        priority: 'high',
      };
    }

    return null;
  }

  /**
   * 上下文帮助
   */
  async contextualHelp(action: string): Promise<string | null> {
    const tips: { [key: string]: string } = {
      'first-code-gen': '💡 提示: 使用 Cmd+K 进行内联代码生成',
      'slow-response': '💡 提示: 尝试 Haiku 模型以获得更快响应',
      'high-cost': '💡 提示: 启用缓存以降低成本',
      'many-files': '💡 提示: 使用智能上下文搜索自动发现相关文件',
      'complex-task': '💡 提示: 使用 Agent Team 并行处理复杂任务',
    };

    return tips[action] || null;
  }

  /**
   * 获取用户使用情况
   */
  private async getUserUsage(): Promise<UserUsage> {
    return {
      aiChatCount: this.context.globalState.get('aiChatCount', 0),
      codeGenCount: this.context.globalState.get('codeGenCount', 0),
      codeReviewCount: this.context.globalState.get('codeReviewCount', 0),
      totalCost: this.context.globalState.get('totalCost', 0),
      viewedCostDashboard: this.context.globalState.get('viewedCostDashboard', false),
      usedAgentTeam: this.context.globalState.get('usedAgentTeam', false),
    };
  }

  /**
   * 获取进度
   */
  getProgress(): OnboardingProgress {
    return {
      currentDay: this.currentDay,
      completedTasks: Array.from(this.completedTasks),
      userLevel: this.userLevel,
      achievements: this.achievements,
      totalTasks: this.getTotalTasks(),
      completionPercent: (this.completedTasks.size / this.getTotalTasks()) * 100,
    };
  }
}

// ==================== 类型定义 ====================

export interface DayPlan {
  title: string;
  description: string;
  tasks: Task[];
  skills: string[];
  reward: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  command: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  timestamp: number;
}

export interface FeatureRecommendation {
  feature: string;
  reason: string;
  command: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UserUsage {
  aiChatCount: number;
  codeGenCount: number;
  codeReviewCount: number;
  totalCost: number;
  viewedCostDashboard: boolean;
  usedAgentTeam: boolean;
}

export interface OnboardingProgress {
  currentDay: number;
  completedTasks: string[];
  userLevel: number;
  achievements: Achievement[];
  totalTasks: number;
  completionPercent: number;
}
