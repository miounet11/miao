/**
 * 实时进度面板 - TikTok 风格的沉浸式体验
 */
export interface LiveProgress {
    totalTasks: number;
    completedTasks: number;
    runningTasks: number;
    currentTask?: CurrentTaskProgress;
    recentActions: RecentAction[];
    metrics: ProgressMetrics;
}
export interface CurrentTaskProgress {
    id: string;
    name: string;
    progress: number;
    filesProcessed: number;
    totalFiles: number;
    currentStep: string;
    estimatedTimeLeft: string;
    agent: string;
}
export interface RecentAction {
    timestamp: number;
    action: string;
    icon: string;
    details: string;
}
export interface ProgressMetrics {
    filesProcessed: number;
    linesChanged: number;
    testsWritten: number;
    timeElapsed: string;
    speedup: string;
}
/**
 * 实时进度追踪器
 */
export declare class LiveProgressTracker {
    private tasks;
    private recentActions;
    private maxRecentActions;
    private updateInterval;
    private callbacks;
    constructor();
    /**
     * 启动实时更新（500ms 刷新）
     */
    start(): void;
    /**
     * 停止实时更新
     */
    stop(): void;
    /**
     * 订阅进度更新
     */
    onProgress(callback: (progress: LiveProgress) => void): void;
    /**
     * 上报 Agent 进度
     */
    reportProgress(taskId: string, data: Partial<CurrentTaskProgress>): void;
    /**
     * 设置事件监听
     */
    private setupEventListeners;
    /**
     * 添加最近动作
     */
    private addAction;
    /**
     * 广播进度更新
     */
    private broadcastProgress;
    /**
     * 计算当前进度
     */
    private calculateProgress;
    /**
     * 格式化当前任务
     */
    private formatCurrentTask;
    /**
     * 计算指标
     */
    private calculateMetrics;
    /**
     * 获取步骤图标
     */
    private getStepIcon;
    /**
     * 获取 Agent 名称
     */
    private getAgentName;
    /**
     * 格式化时长
     */
    private formatDuration;
}
export declare function getLiveProgressTracker(): LiveProgressTracker;
//# sourceMappingURL=LiveProgressPanel.d.ts.map