import {
  IAgentOrchestrator,
  AgentTask,
  TaskStatus,
  TaskState,
  TaskFilter,
  TaskStep,
  TaskPriority,
} from './IAgentOrchestrator';
import { getEventBus } from '../../shared-services/src/EventBus';
import { v4 as uuidv4 } from 'uuid';
import { getTaskScheduler } from './TaskScheduler';
import { getLiveProgressTracker } from './LiveProgressPanel';

/**
 * Agent Orchestrator implementation
 */
export class AgentOrchestrator implements IAgentOrchestrator {
  private tasks: Map<string, TaskStatus> = new Map();
  private taskQueue: string[] = [];
  private runningTasks: Set<string> = new Set();
  private maxConcurrentTasks: number = 3;
  private updateCallbacks: Array<(status: TaskStatus) => void> = [];

  constructor(maxConcurrentTasks: number = 3) {
    this.maxConcurrentTasks = maxConcurrentTasks;
    this.initializeTracking();
  }

  /**
   * 初始化追踪系统
   */
  private initializeTracking(): void {
    const tracker = getLiveProgressTracker();
    tracker.start();
  }

  async submitTask(task: AgentTask): Promise<string> {
    const taskId = task.id || uuidv4();
    const now = Date.now();

    const status: TaskStatus = {
      id: taskId,
      task: { ...task, id: taskId },
      state: TaskState.PENDING,
      progress: 0,
      startTime: now,
      steps: [],
    };

    this.tasks.set(taskId, status);
    this.taskQueue.push(taskId);

    // Sort queue by priority
    this.sortQueue();

    // Emit task submitted event
    const eventBus = getEventBus();
    eventBus.emit('agent.task.submitted', status);

    // Try to start task execution
    this.processQueue();

    return taskId;
  }

  /**
   * 批量提交任务（智能并行调度）
   */
  async submitBatchTasks(tasks: AgentTask[]): Promise<string[]> {
    const scheduler = getTaskScheduler();

    // 分析依赖关系
    const graph = scheduler.analyzeDependencies(tasks);
    const plan = scheduler.generateExecutionPlan(graph);

    // 显示执行计划
    console.log(scheduler.visualizePlan(graph, plan));

    // 提交所有任务
    const taskIds: string[] = [];
    for (const task of tasks) {
      const id = await this.submitTask(task);
      taskIds.push(id);
    }

    return taskIds;
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus | undefined> {
    return this.tasks.get(taskId);
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const status = this.tasks.get(taskId);

    if (!status) {
      return false;
    }

    if (status.state === TaskState.COMPLETED || status.state === TaskState.FAILED) {
      return false;
    }

    status.state = TaskState.CANCELLED;
    status.endTime = Date.now();
    this.runningTasks.delete(taskId);

    // Remove from queue if pending
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.notifyUpdate(status);
    this.processQueue();

    return true;
  }

  async listTasks(filter?: TaskFilter): Promise<TaskStatus[]> {
    let tasks = Array.from(this.tasks.values());

    if (filter) {
      if (filter.state) {
        tasks = tasks.filter((t) => t.state === filter.state);
      }
      if (filter.type) {
        tasks = tasks.filter((t) => t.task.type === filter.type);
      }
      if (filter.priority !== undefined) {
        tasks = tasks.filter((t) => (t.task.priority || TaskPriority.NORMAL) === filter.priority);
      }
      if (filter.since) {
        tasks = tasks.filter((t) => t.startTime >= filter.since!);
      }
    }

    return tasks.sort((a, b) => b.startTime - a.startTime);
  }

  onTaskUpdate(callback: (status: TaskStatus) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    while (this.runningTasks.size < this.maxConcurrentTasks && this.taskQueue.length > 0) {
      const taskId = this.taskQueue.shift();
      if (taskId) {
        this.executeTask(taskId);
      }
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(taskId: string): Promise<void> {
    const status = this.tasks.get(taskId);
    if (!status) {
      return;
    }

    this.runningTasks.add(taskId);
    status.state = TaskState.RUNNING;
    status.startTime = Date.now();
    this.notifyUpdate(status);

    try {
      // Simulate task execution with steps
      await this.runTaskSteps(status);

      status.state = TaskState.COMPLETED;
      status.progress = 100;
      status.endTime = Date.now();
      status.result = {
        success: true,
        output: 'Task completed successfully',
        metrics: {
          duration: status.endTime - status.startTime,
        },
      };
    } catch (error) {
      status.state = TaskState.FAILED;
      status.endTime = Date.now();
      status.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        recoverable: false,
      };
    } finally {
      this.runningTasks.delete(taskId);
      this.notifyUpdate(status);
      this.processQueue();
    }
  }

  /**
   * Run task steps
   */
  private async runTaskSteps(status: TaskStatus): Promise<void> {
    const steps = this.generateSteps(status.task);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      step.state = TaskState.RUNNING;
      step.startTime = Date.now();
      status.steps.push(step);
      status.progress = Math.floor(((i + 1) / steps.length) * 100);
      this.notifyUpdate(status);

      // Simulate step execution
      await this.delay(500);

      step.state = TaskState.COMPLETED;
      step.endTime = Date.now();
      step.output = `Step ${step.name} completed`;
      this.notifyUpdate(status);
    }
  }

  /**
   * Generate steps based on task type
   */
  private generateSteps(task: AgentTask): TaskStep[] {
    const baseSteps: TaskStep[] = [
      {
        id: uuidv4(),
        name: 'Analyze Context',
        state: TaskState.PENDING,
        startTime: Date.now(),
      },
      {
        id: uuidv4(),
        name: 'Plan Execution',
        state: TaskState.PENDING,
        startTime: Date.now(),
      },
      {
        id: uuidv4(),
        name: 'Execute Task',
        state: TaskState.PENDING,
        startTime: Date.now(),
      },
      {
        id: uuidv4(),
        name: 'Verify Results',
        state: TaskState.PENDING,
        startTime: Date.now(),
      },
    ];

    return baseSteps;
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    this.taskQueue.sort((a, b) => {
      const taskA = this.tasks.get(a);
      const taskB = this.tasks.get(b);

      if (!taskA || !taskB) {
        return 0;
      }

      const priorityA = taskA.task.priority || TaskPriority.NORMAL;
      const priorityB = taskB.task.priority || TaskPriority.NORMAL;

      return priorityB - priorityA;
    });
  }

  /**
   * Notify all callbacks of task update
   */
  private notifyUpdate(status: TaskStatus): void {
    const eventBus = getEventBus();
    eventBus.emit('agent.task.updated', status);

    for (const callback of this.updateCallbacks) {
      callback(status);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let orchestratorInstance: AgentOrchestrator | undefined;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
}

export function resetAgentOrchestrator(): void {
  orchestratorInstance = undefined;
}
