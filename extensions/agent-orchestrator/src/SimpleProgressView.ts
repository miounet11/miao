import * as vscode from 'vscode';
import { TaskStatus, TaskState } from './IAgentOrchestrator';
import { getEventBus } from '../../shared-services/src/EventBus';

/**
 * 简化的进度显示
 *
 * 设计理念（学习 EvoMap）：
 * - 极简：只显示关键信息
 * - 清晰：一眼看懂当前状态
 * - 专业：避免花里胡哨
 */
export class SimpleProgressView {
  private statusBarItem: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;
  private activeTasks: Map<string, TaskStatus> = new Map();

  constructor() {
    // 状态栏显示
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.show();

    // 输出面板
    this.outputChannel = vscode.window.createOutputChannel('Miaoda Tasks');

    this.setupEventListeners();
    this.updateStatusBar();
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    const eventBus = getEventBus();

    eventBus.on('agent.task.submitted', (status: TaskStatus) => {
      this.activeTasks.set(status.id, status);
      this.log(`📝 提交: ${status.task.description}`);
      this.updateStatusBar();
    });

    eventBus.on('agent.task.updated', (status: TaskStatus) => {
      this.activeTasks.set(status.id, status);

      if (status.state === TaskState.RUNNING) {
        const step = status.steps[status.steps.length - 1];
        if (step) {
          this.log(`🔄 ${status.task.description}: ${step.name} (${status.progress}%)`);
        }
      } else if (status.state === TaskState.COMPLETED) {
        this.activeTasks.delete(status.id);
        const duration = this.formatDuration(status.endTime! - status.startTime);
        this.log(`✅ 完成: ${status.task.description} (${duration})`);
        this.showCompletionNotification(status);
      } else if (status.state === TaskState.FAILED) {
        this.activeTasks.delete(status.id);
        this.log(`❌ 失败: ${status.task.description} - ${status.error?.message}`);
      }

      this.updateStatusBar();
    });
  }

  /**
   * 更新状态栏
   */
  private updateStatusBar(): void {
    const runningTasks = Array.from(this.activeTasks.values()).filter(
      (t) => t.state === TaskState.RUNNING
    );

    if (runningTasks.length === 0) {
      this.statusBarItem.text = '$(check) Miaoda: Ready';
      this.statusBarItem.tooltip = '点击查看任务历史';
      this.statusBarItem.backgroundColor = undefined;
    } else if (runningTasks.length === 1) {
      const task = runningTasks[0];
      this.statusBarItem.text = `$(sync~spin) ${task.progress}% ${task.task.description}`;
      this.statusBarItem.tooltip = this.getTaskTooltip(task);
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    } else {
      this.statusBarItem.text = `$(sync~spin) ${runningTasks.length} 个任务运行中`;
      this.statusBarItem.tooltip = runningTasks
        .map((t) => `• ${t.task.description} (${t.progress}%)`)
        .join('\n');
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    }

    this.statusBarItem.command = 'miaoda.showTaskOutput';
  }

  /**
   * 获取任务提示
   */
  private getTaskTooltip(task: TaskStatus): string {
    const lines: string[] = [];
    lines.push(`任务: ${task.task.description}`);
    lines.push(`进度: ${task.progress}%`);

    const currentStep = task.steps[task.steps.length - 1];
    if (currentStep) {
      lines.push(`当前: ${currentStep.name}`);
    }

    const elapsed = Date.now() - task.startTime;
    lines.push(`耗时: ${this.formatDuration(elapsed)}`);

    return lines.join('\n');
  }

  /**
   * 显示完成通知
   */
  private showCompletionNotification(status: TaskStatus): void {
    const duration = this.formatDuration(status.endTime! - status.startTime);
    const message = `✅ ${status.task.description} (${duration})`;

    vscode.window.showInformationMessage(message, '查看详情').then((action) => {
      if (action === '查看详情') {
        this.outputChannel.show();
      }
    });
  }

  /**
   * 记录日志
   */
  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * 格式化时长
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return '< 1s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * 显示任务输出
   */
  showOutput(): void {
    this.outputChannel.show();
  }

  /**
   * 清理
   */
  dispose(): void {
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
  }
}

/**
 * 单例
 */
let progressViewInstance: SimpleProgressView | undefined;

export function getSimpleProgressView(): SimpleProgressView {
  if (!progressViewInstance) {
    progressViewInstance = new SimpleProgressView();
  }
  return progressViewInstance;
}
