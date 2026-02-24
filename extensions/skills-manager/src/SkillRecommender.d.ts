/**
 * 用户上下文
 */
export interface UserContext {
    recentFiles: string[];
    recentCommands: string[];
    currentFile?: string;
    selectedText?: string;
    timeOfDay: string;
    projectType?: string;
    gitStatus?: {
        hasUncommittedChanges: boolean;
        hasUntestedCode: boolean;
        branch: string;
    };
    codeMetrics?: {
        complexity: number;
        duplicateLines: number;
        testCoverage: number;
    };
}
/**
 * Skill 推荐
 */
export interface SkillRecommendation {
    skillName: string;
    reason: string;
    confidence: number;
    priority: number;
    icon: string;
    quickAction?: string;
}
/**
 * 推荐场景
 */
export declare enum RecommendationScenario {
    AUTHENTICATION = "authentication",
    API_DEVELOPMENT = "api_development",
    TESTING = "testing",
    REFACTORING = "refactoring",
    DEBUGGING = "debugging",
    DOCUMENTATION = "documentation",
    COMMIT = "commit",
    DEPLOYMENT = "deployment"
}
/**
 * Skill 推荐引擎
 */
export declare class SkillRecommender {
    private contextHistory;
    private maxHistorySize;
    private skillUsageStats;
    constructor();
    /**
     * 分析当前上下文
     */
    analyzeContext(): Promise<UserContext>;
    /**
     * 推荐 Skills
     */
    recommendSkills(context?: UserContext): Promise<SkillRecommendation[]>;
    /**
     * 检测场景
     */
    private detectScenarios;
    /**
     * 获取场景推荐
     */
    private getScenarioRecommendations;
    /**
     * 基于历史的推荐
     */
    private getHistoryBasedRecommendations;
    /**
     * 去重推荐
     */
    private deduplicateRecommendations;
    /**
     * 记录 Skill 使用
     */
    recordSkillUsage(skillName: string): void;
    /**
     * 辅助方法
     */
    private getRecentFiles;
    private getRecentCommands;
    private getTimeOfDay;
    private detectProjectType;
    private getGitStatus;
    private analyzeCodeMetrics;
    private calculateComplexity;
    private hasAuthFiles;
    private hasApiFiles;
    private hasErrorLogs;
    private needsDocumentation;
    private setupEventListeners;
}
export declare function getSkillRecommender(): SkillRecommender;
//# sourceMappingURL=SkillRecommender.d.ts.map