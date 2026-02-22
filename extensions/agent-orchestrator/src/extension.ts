import * as vscode from 'vscode';
import { getAgentOrchestrator } from './AgentOrchestrator';
import { AgentTask, AgentTaskType, TaskState } from './IAgentOrchestrator';
import { getSimpleProgressView } from './SimpleProgressView';
import { getAgentVisualizationPanel } from './AgentVisualizationPanel';
import { getSpeedComparisonView } from './SpeedComparisonView';
import { getQuickActionPanel } from './QuickActionPanel';
import { getParallelExecutor } from './ParallelExecutor';
import { getAgentPool } from './AgentPool';
import { activateIntegratedSystems } from './IntegratedExtension';
import { MiaodaCodeLensProvider } from './MiaodaCodeLensProvider';
import {
  MiaodaTerminalProfileProvider,
  MiaodaTerminalLinkProvider,
} from './MiaodaTerminalProfileProvider';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Agent Orchestrator extension is now active');

  // 激活集成系统
  activateIntegratedSystems(context);

  const orchestrator = getAgentOrchestrator();
  const progressView = getSimpleProgressView();
  const visualizationPanel = getAgentVisualizationPanel(context);
  const speedComparisonView = getSpeedComparisonView(context);
  const quickActionPanel = getQuickActionPanel(context);
  const parallelExecutor = getParallelExecutor();
  const agentPool = getAgentPool();

  // 注册 Code Lens Provider
  const codeLensProvider = new MiaodaCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascriptreact' },
      ],
      codeLensProvider
    )
  );

  // 注册 Terminal Profile Provider
  const terminalProfileProvider = new MiaodaTerminalProfileProvider();
  context.subscriptions.push(
    vscode.window.registerTerminalProfileProvider(
      'miaoda.terminal',
      terminalProfileProvider
    )
  );

  // 注册 Terminal Link Provider
  const terminalLinkProvider = new MiaodaTerminalLinkProvider();
  context.subscriptions.push(
    vscode.window.registerTerminalLinkProvider(terminalLinkProvider)
  );

  // 注册清理
  context.subscriptions.push(progressView);
  context.subscriptions.push({
    dispose: () => {
      visualizationPanel.dispose();
      speedComparisonView.dispose();
    },
  });

  // Command: Submit Agent Task
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.agent.submitTask', async () => {
      const description = await vscode.window.showInputBox({
        prompt: 'Describe the task for the agent',
        placeHolder: 'e.g., Generate a React component for user profile',
      });

      if (!description) {
        return;
      }

      const typeItems = [
        { label: 'Code Generation', value: AgentTaskType.CODE_GENERATION },
        { label: 'Bug Fix', value: AgentTaskType.BUG_FIX },
        { label: 'Refactoring', value: AgentTaskType.CODE_REFACTORING },
        { label: 'Test Generation', value: AgentTaskType.TEST_GENERATION },
        { label: 'Documentation', value: AgentTaskType.DOCUMENTATION },
        { label: 'Code Review', value: AgentTaskType.CODE_REVIEW },
      ];

      const selectedType = await vscode.window.showQuickPick(typeItems, {
        placeHolder: 'Select task type',
      });

      if (!selectedType) {
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;

      const task: AgentTask = {
        type: selectedType.value,
        description,
        context: {
          workspaceRoot,
          activeFile,
        },
      };

      const taskId = await orchestrator.submitTask(task);
      vscode.window.showInformationMessage(`Task submitted: ${taskId}`);
    })
  );

  // Command: List Agent Tasks
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.agent.listTasks', async () => {
      const tasks = await orchestrator.listTasks();

      if (tasks.length === 0) {
        vscode.window.showInformationMessage('No tasks found');
        return;
      }

      const items = tasks.map((task) => ({
        label: task.task.description,
        description: `${task.state} - ${task.progress}%`,
        detail: `Started: ${new Date(task.startTime).toLocaleString()}`,
        taskId: task.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a task to view details',
      });

      if (selected) {
        const status = await orchestrator.getTaskStatus(selected.taskId);
        if (status) {
          const info = [
            `Task: ${status.task.description}`,
            `State: ${status.state}`,
            `Progress: ${status.progress}%`,
            `Steps: ${status.steps.length}`,
          ].join('\n');

          vscode.window.showInformationMessage(info);
        }
      }
    })
  );

  // Command: Cancel Agent Task
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.agent.cancelTask', async () => {
      const tasks = await orchestrator.listTasks({
        state: TaskState.RUNNING,
      });

      if (tasks.length === 0) {
        vscode.window.showInformationMessage('No running tasks');
        return;
      }

      const items = tasks.map((task) => ({
        label: task.task.description,
        description: `${task.progress}%`,
        taskId: task.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a task to cancel',
      });

      if (selected) {
        const cancelled = await orchestrator.cancelTask(selected.taskId);
        if (cancelled) {
          vscode.window.showInformationMessage('Task cancelled');
        } else {
          vscode.window.showErrorMessage('Failed to cancel task');
        }
      }
    })
  );

  // Command: 快速生成 Skill (核心功能)
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.skill.generate', async () => {
      vscode.window.showInformationMessage('Skill 生成功能开发中...');
      // TODO: 集成 SkillGenerator
    })
  );

  // Command: 从代码学习生成 Skill
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.skill.learnFromCode', async () => {
      vscode.window.showInformationMessage('从代码学习功能开发中...');
      // TODO: 集成 SkillGenerator
    })
  );

  // Command: 显示任务输出
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showTaskOutput', () => {
      progressView.showOutput();
    })
  );

  // Command: 批量提交任务（并行执行）
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.submitBatchTasks', async () => {
      // TODO: 从用户输入获取任务列表
      vscode.window.showInformationMessage('批量任务功能开发中...');
    })
  );

  // Command: 显示 Agent 可视化面板
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showAgentVisualization', async () => {
      const tasks = await orchestrator.listTasks({ state: TaskState.RUNNING });
      if (tasks.length === 0) {
        vscode.window.showInformationMessage('当前没有运行中的任务');
        return;
      }
      await visualizationPanel.show(tasks[0]);
    })
  );

  // Command: 显示速度对比
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showSpeedComparison', async () => {
      await speedComparisonView.show();
    })
  );

  // Command: 启动 Agent Team
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.startAgentTeam', async () => {
      // 显示速度对比
      await speedComparisonView.show();

      // 提示用户
      vscode.window.showInformationMessage(
        '🚀 Agent Team 已启动！查看并行执行的速度优势'
      );
    })
  );

  // Command: 显示快捷操作面板
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showQuickActions', async () => {
      await quickActionPanel.show();
    })
  );

  // Command: 通过数字执行快捷操作
  for (let i = 1; i <= 8; i++) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`miaoda.quickAction${i}`, async () => {
        await quickActionPanel.executeByNumber(i);
      })
    );
  }

  // Command: 并行执行任务
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.parallelExecute', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const tasks: AgentTask[] = [
        {
          type: AgentTaskType.CODE_GENERATION,
          description: '生成示例代码',
          context: {
            workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            activeFile: editor.document.uri.fsPath,
          },
        },
        {
          type: AgentTaskType.TEST_GENERATION,
          description: '生成测试',
          context: {
            workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            activeFile: editor.document.uri.fsPath,
          },
        },
        {
          type: AgentTaskType.DOCUMENTATION,
          description: '生成文档',
          context: {
            workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            activeFile: editor.document.uri.fsPath,
          },
        },
      ];

      const taskIds = await parallelExecutor.submitBatch(tasks);
      vscode.window.showInformationMessage(
        `✅ 已提交 ${taskIds.length} 个并行任务`
      );

      // 显示 Agent 可视化
      const runningTasks = parallelExecutor.getRunningTasks();
      if (runningTasks.length > 0) {
        await visualizationPanel.show(runningTasks[0]);
      }
    })
  );

  // Command: 查看 Agent 池状态
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showAgentPoolStats', async () => {
      const stats = agentPool.getStats();
      const executorStats = parallelExecutor.getStats();

      const message = [
        `Agent 池状态:`,
        `• 总数: ${stats.total}`,
        `• 空闲: ${stats.idle}`,
        `• 忙碌: ${stats.busy}`,
        `• 错误: ${stats.error}`,
        `• 已完成任务: ${stats.totalTasksCompleted}`,
        ``,
        `执行器状态:`,
        `• 队列中: ${executorStats.queuedTasks}`,
        `• 运行中: ${executorStats.runningTasks}`,
      ].join('\n');

      vscode.window.showInformationMessage(message);
    })
  );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Agent Orchestrator extension is now deactivated');
}
