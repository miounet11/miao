import { TaskStatus, TaskState, TaskStep } from './IAgentOrchestrator';
import { getEventBus } from '../../shared-services/src/EventBus';

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
  progress: number; // 0-100
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
  speedup: string; // "5x faster" 等
}

/**
 * 实时进度追踪器
 */
export class LiveProgressTracker {
  private tasks: Map<string, TaskStatus> = new Map();
  private recentActions: RecentAction[] = [];
  private maxRecentActions = 10;
  private updateInterval: NodeJS.Timeout | null = null;
  private callbacks: Array<(progress: LiveProgress) => void> = [];

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 启动实时更新（500ms 刷新）
   */
  start(): void {
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
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 订阅进度更新
   */
  onProgress(callback: (progress: LiveProgress) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * 上报 Agent 进度
   */
  reportProgress(taskId: string, data: Partial<CurrentTaskProgress>): void {
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
  private setupEventListeners(): void {
    const eventBus = getEventBus();

    eventBus.on('agent.task.submitted', (status: TaskStatus) => {
      this.tasks.set(status.id, status);
      this.addAction({
        timestamp: Date.now(),
        action: 'Task Submitted',
        icon: '📝',
        details: status.task.description,
      });
    });

    eventBus.on('agent.task.updated', (status: TaskStatus) => {
      this.tasks.set(status.id, status);

      if (status.state === TaskState.RUNNING) {
        const currentStep = status.steps[status.steps.length - 1];
        if (currentStep) {
          this.addAction({
            timestamp: Date.now(),
            action: currentStep.name,
            icon: '🔄',
            details: `Progress: ${status.progress}%`,
          });
        }
      } else if (status.state === TaskState.COMPLETED) {
        this.addAction({
          timestamp: Date.now(),
          action: 'Task Completed',
          icon: '✅',
          details: `${status.task.description} (${this.formatDuration(status.endTime! - status.startTime)})`,
        });
      } else if (status.state === TaskState.FAILED) {
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
  private addAction(action: RecentAction): void {
    this.recentActions.unshift(action);
    if (this.recentActions.length > this.maxRecentActions) {
      this.recentActions.pop();
    }
  }

  /**
   * 广播进度更新
   */
  private broadcastProgress(): void {
    const progress = this.calculateProgress();
    for (const callback of this.callbacks) {
      callback(progress);
    }
  }

  /**
   * 计算当前进度
   */
  private calculateProgress(): LiveProgress {
    const tasks = Array.from(this.tasks.values());
    const runningTasks = tasks.filter((t) => t.state === TaskState.RUNNING);
    const completedTasks = tasks.filter((t) => t.state === TaskState.COMPLETED);

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
  private formatCurrentTask(status: TaskStatus): CurrentTaskProgress {
    const currentStep = status.steps[status.steps.length - 1];
    const elapsed = Date.now() - status.startTime;
    const estimatedTotal = status.progress > 0 ? (elapsed / status.progress) * 100 : 0;
    const estimatedLeft = Math.max(0, estimatedTotal - elapsed);

    return {
      id: status.id,
      name: status.task.description,
      progress: status.progress,
      filesProcessed: status.steps.filter((s) => s.state === TaskState.COMPLETED).length,
      totalFiles: status.steps.length,
      currentStep: currentStep?.name || 'Starting...',
      estimatedTimeLeft: this.formatDuration(estimatedLeft),
      agent: this.getAgentName(status.task.type),
    };
  }

  /**
   * 计算指标
   */
  private calculateMetrics(tasks: TaskStatus[]): ProgressMetrics {
    const completedTasks = tasks.filter((t) => t.state === TaskState.COMPLETED);
    const totalDuration = completedTasks.reduce(
      (sum, t) => sum + (t.endTime! - t.startTime),
      0
    );

    // 模拟指标（实际应从任务结果中获取）
    const filesProcessed = completedTasks.reduce(
      (sum, t) => sum + (t.result?.metrics?.filesModified || 0),
      0
    );
    const linesChanged = completedTasks.reduce(
      (sum, t) => sum + (t.result?.metrics?.linesChanged || 0),
      0
    );

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
  private getStepIcon(step: string): string {
    const iconMap: Record<string, string> = {
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
  private getAgentName(taskType: string): string {
    const agentMap: Record<string, string> = {
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
  private formatDuration(ms: number): string {
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

/**
 * 单例
 */
let trackerInstance: LiveProgressTracker | undefined;

export function getLiveProgressTracker(): LiveProgressTracker {
  if (!trackerInstance) {
    trackerInstance = new LiveProgressTracker();
  }
  return trackerInstance;
}
