import { TaskStatus, TaskState } from './IAgentOrchestrator';
import { getEventBus } from '../../shared-services/src/EventBus';

/**
 * 成就类型
 */
export enum AchievementType {
  SPEED_KING = 'speed_king',
  TEST_MASTER = 'test_master',
  REFACTOR_EXPERT = 'refactor_expert',
  EFFICIENCY_MANIAC = 'efficiency_maniac',
  BUG_HUNTER = 'bug_hunter',
  DOCUMENTATION_HERO = 'documentation_hero',
  PARALLEL_MASTER = 'parallel_master',
  EARLY_BIRD = 'early_bird',
  NIGHT_OWL = 'night_owl',
  STREAK_WARRIOR = 'streak_warrior',
}

/**
 * 成就定义
 */
export interface Achievement {
  id: AchievementType;
  name: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
  reward?: string;
}

/**
 * 用户统计
 */
export interface UserStats {
  tasksCompleted: number;
  totalDuration: number;
  averageTaskTime: number;
  testsWritten: number;
  testCoverage: number;
  linesRefactored: number;
  bugsFixed: number;
  docsWritten: number;
  parallelTasksRun: number;
  skillsUsed: number;
  currentStreak: number;
  longestStreak: number;
  fastestTask: number;
  percentileFaster: number; // 比多少百分比的用户快
}

/**
 * 解锁的成就
 */
export interface UnlockedAchievement {
  achievement: Achievement;
  unlockedAt: number;
  stats: Partial<UserStats>;
}

/**
 * 成就系统
 */
export class AchievementSystem {
  private achievements: Map<AchievementType, Achievement> = new Map();
  private userStats: UserStats;
  private unlockedAchievements: Set<AchievementType> = new Set();
  private callbacks: Array<(achievement: UnlockedAchievement) => void> = [];

  constructor() {
    this.userStats = this.initializeStats();
    this.registerAchievements();
    this.setupEventListeners();
  }

  /**
   * 初始化统计数据
   */
  private initializeStats(): UserStats {
    return {
      tasksCompleted: 0,
      totalDuration: 0,
      averageTaskTime: 0,
      testsWritten: 0,
      testCoverage: 0,
      linesRefactored: 0,
      bugsFixed: 0,
      docsWritten: 0,
      parallelTasksRun: 0,
      skillsUsed: 0,
      currentStreak: 0,
      longestStreak: 0,
      fastestTask: Infinity,
      percentileFaster: 0,
    };
  }

  /**
   * 注册所有成就
   */
  private registerAchievements(): void {
    const achievements: Achievement[] = [
      {
        id: AchievementType.SPEED_KING,
        name: '速度之王',
        description: '5 分钟内完成功能开发',
        icon: '⚡',
        condition: (stats) => stats.fastestTask < 5 * 60 * 1000,
        reward: '解锁特殊主题',
      },
      {
        id: AchievementType.TEST_MASTER,
        name: '测试大师',
        description: '测试覆盖率达到 90%',
        icon: '🧪',
        condition: (stats) => stats.testCoverage >= 90,
        reward: '自动测试生成加速 20%',
      },
      {
        id: AchievementType.REFACTOR_EXPERT,
        name: '重构专家',
        description: '减少 1000 行重复代码',
        icon: '🔧',
        condition: (stats) => stats.linesRefactored >= 1000,
        reward: '重构建议优先级提升',
      },
      {
        id: AchievementType.EFFICIENCY_MANIAC,
        name: '效率狂人',
        description: '一天使用 20 次 skills',
        icon: '🚀',
        condition: (stats) => stats.skillsUsed >= 20,
        reward: 'Skill 执行速度提升 10%',
      },
      {
        id: AchievementType.BUG_HUNTER,
        name: 'Bug 猎人',
        description: '修复 50 个 bug',
        icon: '🐛',
        condition: (stats) => stats.bugsFixed >= 50,
        reward: 'Bug 检测灵敏度提升',
      },
      {
        id: AchievementType.DOCUMENTATION_HERO,
        name: '文档英雄',
        description: '编写 10000 字文档',
        icon: '📖',
        condition: (stats) => stats.docsWritten >= 10000,
        reward: '文档生成质量提升',
      },
      {
        id: AchievementType.PARALLEL_MASTER,
        name: '并行大师',
        description: '同时运行 5 个并行任务',
        icon: '⚙️',
        condition: (stats) => stats.parallelTasksRun >= 5,
        reward: '并发任务数上限 +2',
      },
      {
        id: AchievementType.EARLY_BIRD,
        name: '早起的鸟儿',
        description: '早上 6-8 点完成 10 个任务',
        icon: '🌅',
        condition: (stats) => stats.tasksCompleted >= 10, // 简化条件
      },
      {
        id: AchievementType.NIGHT_OWL,
        name: '夜猫子',
        description: '晚上 10-12 点完成 10 个任务',
        icon: '🦉',
        condition: (stats) => stats.tasksCompleted >= 10, // 简化条件
      },
      {
        id: AchievementType.STREAK_WARRIOR,
        name: '连击战士',
        description: '连续 7 天使用 IDE',
        icon: '🔥',
        condition: (stats) => stats.currentStreak >= 7,
        reward: '每日任务奖励翻倍',
      },
    ];

    for (const achievement of achievements) {
      this.achievements.set(achievement.id, achievement);
    }
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    const eventBus = getEventBus();

    eventBus.on('agent.task.updated', (status: TaskStatus) => {
      if (status.state === TaskState.COMPLETED) {
        this.updateStats(status);
        this.checkAchievements();
      }
    });
  }

  /**
   * 更新统计数据
   */
  private updateStats(status: TaskStatus): void {
    const duration = status.endTime! - status.startTime;

    this.userStats.tasksCompleted++;
    this.userStats.totalDuration += duration;
    this.userStats.averageTaskTime = this.userStats.totalDuration / this.userStats.tasksCompleted;

    if (duration < this.userStats.fastestTask) {
      this.userStats.fastestTask = duration;
      // 模拟百分比计算（实际应从服务器获取）
      this.userStats.percentileFaster = Math.min(95, this.userStats.tasksCompleted * 2);
    }

    // 根据任务类型更新特定统计
    const metrics = status.result?.metrics;
    if (metrics) {
      this.userStats.linesRefactored += metrics.linesChanged || 0;
    }

    // 模拟其他统计
    if (status.task.type === 'test_generation') {
      this.userStats.testsWritten += 5;
      this.userStats.testCoverage = Math.min(100, this.userStats.testCoverage + 2);
    }
    if (status.task.type === 'bug_fix') {
      this.userStats.bugsFixed++;
    }
    if (status.task.type === 'documentation') {
      this.userStats.docsWritten += 500;
    }
  }

  /**
   * 检查成就解锁
   */
  private checkAchievements(): void {
    for (const [id, achievement] of this.achievements.entries()) {
      if (this.unlockedAchievements.has(id)) {
        continue;
      }

      if (achievement.condition(this.userStats)) {
        this.unlockAchievement(achievement);
      }
    }
  }

  /**
   * 解锁成就
   */
  private unlockAchievement(achievement: Achievement): void {
    this.unlockedAchievements.add(achievement.id);

    const unlocked: UnlockedAchievement = {
      achievement,
      unlockedAt: Date.now(),
      stats: { ...this.userStats },
    };

    // 通知所有监听器
    for (const callback of this.callbacks) {
      callback(unlocked);
    }

    // 发送事件
    const eventBus = getEventBus();
    eventBus.emit('achievement.unlocked', unlocked);
  }

  /**
   * 订阅成就解锁事件
   */
  onAchievementUnlocked(callback: (achievement: UnlockedAchievement) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * 获取用户统计
   */
  getStats(): UserStats {
    return { ...this.userStats };
  }

  /**
   * 获取所有成就
   */
  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * 获取已解锁成就
   */
  getUnlockedAchievements(): Achievement[] {
    return Array.from(this.unlockedAchievements)
      .map((id) => this.achievements.get(id))
      .filter((a) => a !== undefined) as Achievement[];
  }

  /**
   * 获取进度
   */
  getProgress(achievementId: AchievementType): number {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      return 0;
    }

    // 简化的进度计算
    switch (achievementId) {
      case AchievementType.SPEED_KING:
        return Math.min(100, (5 * 60 * 1000 - this.userStats.fastestTask) / (5 * 60 * 1000) * 100);
      case AchievementType.TEST_MASTER:
        return (this.userStats.testCoverage / 90) * 100;
      case AchievementType.REFACTOR_EXPERT:
        return (this.userStats.linesRefactored / 1000) * 100;
      case AchievementType.EFFICIENCY_MANIAC:
        return (this.userStats.skillsUsed / 20) * 100;
      case AchievementType.BUG_HUNTER:
        return (this.userStats.bugsFixed / 50) * 100;
      case AchievementType.DOCUMENTATION_HERO:
        return (this.userStats.docsWritten / 10000) * 100;
      default:
        return 0;
    }
  }

  /**
   * 格式化成就通知
   */
  formatAchievementNotification(unlocked: UnlockedAchievement): string {
    const { achievement, stats } = unlocked;
    const lines: string[] = [];

    lines.push(`🎉 成就解锁：${achievement.name}`);
    lines.push(`${achievement.icon} ${achievement.description}`);
    lines.push('');

    // 显示相关统计
    if (achievement.id === AchievementType.SPEED_KING) {
      lines.push(`⚡ 你比 ${stats.percentileFaster}% 的开发者更快！`);
    }

    if (achievement.reward) {
      lines.push(`🎁 奖励：${achievement.reward}`);
    }

    return lines.join('\n');
  }
}

/**
 * 单例
 */
let achievementSystemInstance: AchievementSystem | undefined;

export function getAchievementSystem(): AchievementSystem {
  if (!achievementSystemInstance) {
    achievementSystemInstance = new AchievementSystem();
  }
  return achievementSystemInstance;
}
