import * as vscode from 'vscode';
import { AgentTask, TaskStatus, TaskState, TaskStep } from './IAgentOrchestrator';
import { Agent, AgentPool, getAgentPool } from './AgentPool';

/**
 * 执行结果
 */
export interface ExecutionResult {
  taskId: string;
  agentId: string;
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
}

/**
 * 并行执行器
 * 负责任务的并行调度和执行
 */
export class ParallelExecutor {
  private agentPool = getAgentPool();
  private runningTasks: Map<string, TaskStatus> = new Map();
  private taskQueue: TaskStatus[] = [];

  /**
   * 提交任务批次
   */
  async submitBatch(tasks: AgentTask[]): Promise<string[]> {
    const taskIds: string[] = [];

    for (const task of tasks) {
      const taskId = this.generateTaskId();
      const status: TaskStatus = {
        id: taskId,
        task,
        state: TaskState.PENDING,
        progress: 0,
        startTime: Date.now(),
        steps: [],
      };

      this.taskQueue.push(status);
      taskIds.push(taskId);
    }

    // 开始处理队列
    this.processQueue();

    return taskIds;
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) continue;

      // 获取空闲 Agent
      const agent = this.agentPool.getIdleAgent();
      if (!agent) {
        // 没有空闲 Agent，放回队列
        this.taskQueue.unshift(task);
        await this.wait(100);
        continue;
      }

      // 分配任务
      this.agentPool.assignTask(agent.id, task.id);
      this.runningTasks.set(task.id, task);

      // 异步执行任务
      this.executeTask(task, agent).then((result) => {
        this.handleTaskComplete(result);
      });
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(
    taskStatus: TaskStatus,
    agent: Agent
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // 更新状态
      taskStatus.state = TaskState.RUNNING;

      // 分解任务为步骤
      const steps = this.decomposeTask(taskStatus.task);
      taskStatus.steps = steps;

      // 执行每个步骤
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        step.state = TaskState.RUNNING;
        step.startTime = Date.now();

        // 模拟执行（实际应该调用 AI）
        await this.executeStep(step, agent);

        step.state = TaskState.COMPLETED;
        step.endTime = Date.now();
        step.output = `Step ${i + 1} completed by ${agent.name}`;

        // 更新进度
        taskStatus.progress = Math.round(((i + 1) / steps.length) * 100);
      }

      // 任务完成
      taskStatus.state = TaskState.COMPLETED;
      taskStatus.endTime = Date.now();

      return {
        taskId: taskStatus.id,
        agentId: agent.id,
        success: true,
        output: taskStatus.steps.map((s) => s.output).join('\n'),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // 任务失败
      taskStatus.state = TaskState.FAILED;
      taskStatus.endTime = Date.now();
      taskStatus.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        recoverable: false,
      };

      this.agentPool.markAgentError(agent.id);

      return {
        taskId: taskStatus.id,
        agentId: agent.id,
        success: false,
        error: taskStatus.error?.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 分解任务为步骤
   */
  private decomposeTask(task: AgentTask): TaskStep[] {
    const steps: TaskStep[] = [];

    // 根据任务类型生成步骤
    switch (task.type) {
      case 'code_generation':
        steps.push(
          { id: '1', name: 'Analyze requirements', state: TaskState.PENDING, startTime: 0 },
          { id: '2', name: 'Design structure', state: TaskState.PENDING, startTime: 0 },
          { id: '3', name: 'Generate code', state: TaskState.PENDING, startTime: 0 },
          { id: '4', name: 'Add comments', state: TaskState.PENDING, startTime: 0 }
        );
        break;

      case 'bug_fix':
        steps.push(
          { id: '1', name: 'Reproduce bug', state: TaskState.PENDING, startTime: 0 },
          { id: '2', name: 'Identify root cause', state: TaskState.PENDING, startTime: 0 },
          { id: '3', name: 'Fix bug', state: TaskState.PENDING, startTime: 0 },
          { id: '4', name: 'Verify fix', state: TaskState.PENDING, startTime: 0 }
        );
        break;

      case 'test_generation':
        steps.push(
          { id: '1', name: 'Analyze code', state: TaskState.PENDING, startTime: 0 },
          { id: '2', name: 'Identify test cases', state: TaskState.PENDING, startTime: 0 },
          { id: '3', name: 'Generate tests', state: TaskState.PENDING, startTime: 0 }
        );
        break;

      case 'code_refactoring':
        steps.push(
          { id: '1', name: 'Analyze code quality', state: TaskState.PENDING, startTime: 0 },
          { id: '2', name: 'Identify improvements', state: TaskState.PENDING, startTime: 0 },
          { id: '3', name: 'Refactor code', state: TaskState.PENDING, startTime: 0 },
          { id: '4', name: 'Verify behavior', state: TaskState.PENDING, startTime: 0 }
        );
        break;

      default:
        steps.push(
          { id: '1', name: 'Analyze task', state: TaskState.PENDING, startTime: 0 },
          { id: '2', name: 'Execute task', state: TaskState.PENDING, startTime: 0 },
          { id: '3', name: 'Verify result', state: TaskState.PENDING, startTime: 0 }
        );
    }

    return steps;
  }

  /**
   * 执行步骤
   */
  private async executeStep(step: TaskStep, agent: Agent): Promise<void> {
    // 模拟执行时间（实际应该调用 AI API）
    const duration = Math.random() * 2000 + 1000; // 1-3 秒
    await this.wait(duration);

    // TODO: 实际调用 AI API
    // const result = await this.callAI(step, agent);
  }

  /**
   * 处理任务完成
   */
  private handleTaskComplete(result: ExecutionResult): void {
    // 释放 Agent
    this.agentPool.releaseAgent(result.agentId);

    // 移除运行中的任务
    this.runningTasks.delete(result.taskId);

    // 继续处理队列
    if (this.taskQueue.length > 0) {
      this.processQueue();
    }

    // 发送完成通知
    if (result.success) {
      vscode.window.showInformationMessage(
        `✅ Task ${result.taskId} completed in ${(result.duration / 1000).toFixed(1)}s`
      );
    } else {
      vscode.window.showErrorMessage(
        `❌ Task ${result.taskId} failed: ${result.error}`
      );
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.runningTasks.get(taskId);
  }

  /**
   * 获取所有运行中的任务
   */
  getRunningTasks(): TaskStatus[] {
    return Array.from(this.runningTasks.values());
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.runningTasks.get(taskId);
    if (!task) {
      return false;
    }

    task.state = TaskState.CANCELLED;
    task.endTime = Date.now();

    // 释放 Agent
    const agent = this.agentPool
      .getAllAgents()
      .find((a) => a.currentTask === taskId);
    if (agent) {
      this.agentPool.releaseAgent(agent.id);
    }

    this.runningTasks.delete(taskId);
    return true;
  }

  /**
   * 获取执行统计
   */
  getStats(): {
    queuedTasks: number;
    runningTasks: number;
    agentStats: ReturnType<AgentPool['getStats']>;
  } {
    return {
      queuedTasks: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      agentStats: this.agentPool.getStats(),
    };
  }

  /**
   * 等待
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 单例
 */
let parallelExecutorInstance: ParallelExecutor | undefined;

export function getParallelExecutor(): ParallelExecutor {
  if (!parallelExecutorInstance) {
    parallelExecutorInstance = new ParallelExecutor();
  }
  return parallelExecutorInstance;
}
