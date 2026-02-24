"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveProgressTracker = void 0;
exports.getLiveProgressTracker = getLiveProgressTracker;
const IAgentOrchestrator_1 = require("./IAgentOrchestrator");
const EventBus_1 = require("../../shared-services/src/EventBus");
/**
 * 实时进度追踪器
 */
class LiveProgressTracker {
    tasks = new Map();
    recentActions = [];
    maxRecentActions = 10;
    updateInterval = null;
    callbacks = [];
    constructor() {
        this.setupEventListeners();
    }
    /**
     * 启动实时更新（500ms 刷新）
     */
    start() {
        if (this.updateInterval) {
            return;
        }
        this.updateInterval = setInterval(() => {
            this.broadcastProgress();
        }, 500);
    }
    /**
     * 停止实时更新
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    /**
     * 订阅进度更新
     */
    onProgress(callback) {
        this.callbacks.push(callback);
    }
    /**
     * 上报 Agent 进度
     */
    reportProgress(taskId, data) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }
        // 记录动作
        if (data.currentStep) {
            this.addAction({
                timestamp: Date.now(),
                action: data.currentStep,
                icon: this.getStepIcon(data.currentStep),
                details: `${data.filesProcessed || 0}/${data.totalFiles || 0} files`,
            });
        }
        this.broadcastProgress();
    }
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        const eventBus = (0, EventBus_1.getEventBus)();
        eventBus.on('agent.task.submitted', (status) => {
            this.tasks.set(status.id, status);
            this.addAction({
                timestamp: Date.now(),
                action: 'Task Submitted',
                icon: '📝',
                details: status.task.description,
            });
        });
        eventBus.on('agent.task.updated', (status) => {
            this.tasks.set(status.id, status);
            if (status.state === IAgentOrchestrator_1.TaskState.RUNNING) {
                const currentStep = status.steps[status.steps.length - 1];
                if (currentStep) {
                    this.addAction({
                        timestamp: Date.now(),
                        action: currentStep.name,
                        icon: '🔄',
                        details: `Progress: ${status.progress}%`,
                    });
                }
            }
            else if (status.state === IAgentOrchestrator_1.TaskState.COMPLETED) {
                this.addAction({
                    timestamp: Date.now(),
                    action: 'Task Completed',
                    icon: '✅',
                    details: `${status.task.description} (${this.formatDuration(status.endTime - status.startTime)})`,
                });
            }
            else if (status.state === IAgentOrchestrator_1.TaskState.FAILED) {
                this.addAction({
                    timestamp: Date.now(),
                    action: 'Task Failed',
                    icon: '❌',
                    details: status.error?.message || 'Unknown error',
                });
            }
        });
    }
    /**
     * 添加最近动作
     */
    addAction(action) {
        this.recentActions.unshift(action);
        if (this.recentActions.length > this.maxRecentActions) {
            this.recentActions.pop();
        }
    }
    /**
     * 广播进度更新
     */
    broadcastProgress() {
        const progress = this.calculateProgress();
        for (const callback of this.callbacks) {
            callback(progress);
        }
    }
    /**
     * 计算当前进度
     */
    calculateProgress() {
        const tasks = Array.from(this.tasks.values());
        const runningTasks = tasks.filter((t) => t.state === IAgentOrchestrator_1.TaskState.RUNNING);
        const completedTasks = tasks.filter((t) => t.state === IAgentOrchestrator_1.TaskState.COMPLETED);
        // 找到当前最活跃的任务
        const currentTask = runningTasks.length > 0 ? runningTasks[0] : undefined;
        // 计算指标
        const metrics = this.calculateMetrics(tasks);
        return {
            totalTasks: tasks.length,
            completedTasks: completedTasks.length,
            runningTasks: runningTasks.length,
            currentTask: currentTask ? this.formatCurrentTask(currentTask) : undefined,
            recentActions: this.recentActions.slice(0, 5),
            metrics,
        };
    }
    /**
     * 格式化当前任务
     */
    formatCurrentTask(status) {
        const currentStep = status.steps[status.steps.length - 1];
        const elapsed = Date.now() - status.startTime;
        const estimatedTotal = status.progress > 0 ? (elapsed / status.progress) * 100 : 0;
        const estimatedLeft = Math.max(0, estimatedTotal - elapsed);
        return {
            id: status.id,
            name: status.task.description,
            progress: status.progress,
            filesProcessed: status.steps.filter((s) => s.state === IAgentOrchestrator_1.TaskState.COMPLETED).length,
            totalFiles: status.steps.length,
            currentStep: currentStep?.name || 'Starting...',
            estimatedTimeLeft: this.formatDuration(estimatedLeft),
            agent: this.getAgentName(status.task.type),
        };
    }
    /**
     * 计算指标
     */
    calculateMetrics(tasks) {
        const completedTasks = tasks.filter((t) => t.state === IAgentOrchestrator_1.TaskState.COMPLETED);
        const totalDuration = completedTasks.reduce((sum, t) => sum + (t.endTime - t.startTime), 0);
        // 模拟指标（实际应从任务结果中获取）
        const filesProcessed = completedTasks.reduce((sum, t) => sum + (t.result?.metrics?.filesModified || 0), 0);
        const linesChanged = completedTasks.reduce((sum, t) => sum + (t.result?.metrics?.linesChanged || 0), 0);
        // 计算加速比（假设串行执行需要 3 倍时间）
        const parallelSpeedup = completedTasks.length > 1 ? '3x' : '1x';
        return {
            filesProcessed,
            linesChanged,
            testsWritten: 0, // TODO: 从任务结果中获取
            timeElapsed: this.formatDuration(totalDuration),
            speedup: parallelSpeedup,
        };
    }
    /**
     * 获取步骤图标
     */
    getStepIcon(step) {
        const iconMap = {
            'Analyze Context': '🔍',
            'Plan Execution': '📋',
            'Execute Task': '⚡',
            'Verify Results': '✓',
            'Generate Code': '💻',
            'Run Tests': '🧪',
            'Write Documentation': '📖',
        };
        return iconMap[step] || '🔄';
    }
    /**
     * 获取 Agent 名称
     */
    getAgentName(taskType) {
        const agentMap = {
            code_generation: 'Code Generator',
            code_refactoring: 'Refactoring Master',
            bug_fix: 'Bug Hunter',
            test_generation: 'Test Engineer',
            documentation: 'Doc Writer',
            code_review: 'Code Reviewer',
        };
        return agentMap[taskType] || 'Agent';
    }
    /**
     * 格式化时长
     */
    formatDuration(ms) {
        if (ms < 1000) {
            return '< 1s';
        }
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
}
exports.LiveProgressTracker = LiveProgressTracker;
/**
 * 单例
 */
let trackerInstance;
function getLiveProgressTracker() {
    if (!trackerInstance) {
        trackerInstance = new LiveProgressTracker();
    }
    return trackerInstance;
}
//# sourceMappingURL=LiveProgressPanel.js.map