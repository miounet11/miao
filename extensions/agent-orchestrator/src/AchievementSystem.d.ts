/**
 * 成就类型
 */
export declare enum AchievementType {
    SPEED_KING = "speed_king",
    TEST_MASTER = "test_master",
    REFACTOR_EXPERT = "refactor_expert",
    EFFICIENCY_MANIAC = "efficiency_maniac",
    BUG_HUNTER = "bug_hunter",
    DOCUMENTATION_HERO = "documentation_hero",
    PARALLEL_MASTER = "parallel_master",
    EARLY_BIRD = "early_bird",
    NIGHT_OWL = "night_owl",
    STREAK_WARRIOR = "streak_warrior"
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
    percentileFaster: number;
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
export declare class AchievementSystem {
    private achievements;
    private userStats;
    private unlockedAchievements;
    private callbacks;
    constructor();
    /**
     * 初始化统计数据
     */
    private initializeStats;
    /**
     * 注册所有成就
     */
    private registerAchievements;
    /**
     * 设置事件监听
     */
    private setupEventListeners;
    /**
     * 更新统计数据
     */
    private updateStats;
    /**
     * 检查成就解锁
     */
    private checkAchievements;
    /**
     * 解锁成就
     */
    private unlockAchievement;
    /**
     * 订阅成就解锁事件
     */
    onAchievementUnlocked(callback: (achievement: UnlockedAchievement) => void): void;
    /**
     * 获取用户统计
     */
    getStats(): UserStats;
    /**
     * 获取所有成就
     */
    getAllAchievements(): Achievement[];
    /**
     * 获取已解锁成就
     */
    getUnlockedAchievements(): Achievement[];
    /**
     * 获取进度
     */
    getProgress(achievementId: AchievementType): number;
    /**
     * 格式化成就通知
     */
    formatAchievementNotification(unlocked: UnlockedAchievement): string;
}
export declare function getAchievementSystem(): AchievementSystem;
//# sourceMappingURL=AchievementSystem.d.ts.map