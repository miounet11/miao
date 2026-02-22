import * as vscode from 'vscode';
import { ProgressiveOnboarding } from './ProgressiveOnboarding';

let onboarding: ProgressiveOnboarding | null = null;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Onboarding Guide extension is now active');

  // 初始化引导系统
  onboarding = new ProgressiveOnboarding(context);

  // 检查是否是首次使用
  const isFirstTime = context.globalState.get('isFirstTime', true);
  if (isFirstTime) {
    await context.globalState.update('isFirstTime', false);
    const action = await vscode.window.showInformationMessage(
      '👋 欢迎使用 Miaoda IDE！\n\n开始 7 天引导计划，从新手到专家？',
      '开始引导',
      '稍后'
    );

    if (action === '开始引导') {
      await onboarding.startOnboarding();
    }
  }

  // 注册命令：开始引导
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.onboarding.start', async () => {
      await onboarding!.startOnboarding();
    })
  );

  // 注册命令：显示今日计划
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.onboarding.showToday', async () => {
      const progress = onboarding!.getProgress();
      await onboarding!.showDayPlan(progress.currentDay);
    })
  );

  // 注册命令：完成任务
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.onboarding.completeTask', async (taskId: string) => {
      await onboarding!.completeTask(taskId);
    })
  );

  // 注册命令：查看进度
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.onboarding.progress', async () => {
      const progress = onboarding!.getProgress();

      const content = [
        '# 📊 学习进度',
        '',
        `## 总体进度`,
        '',
        `- **当前天数**: Day ${progress.currentDay}/7`,
        `- **完成任务**: ${progress.completedTasks.length}/${progress.totalTasks}`,
        `- **完成度**: ${progress.completionPercent.toFixed(0)}%`,
        `- **等级**: Level ${progress.userLevel}`,
        '',
        `## 成就 (${progress.achievements.length})`,
        '',
        ...progress.achievements.map(
          (a) => `- ${a.title}\n  ${a.description}\n  ${new Date(a.timestamp).toLocaleString()}`
        ),
        '',
        `## 下一步`,
        '',
        progress.currentDay <= 7
          ? `继续 Day ${progress.currentDay} 的学习计划`
          : '🎉 已完成所有引导！',
      ].join('\n');

      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, { preview: true });
    })
  );

  // 注册命令：功能推荐
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.onboarding.recommend', async () => {
      const recommendation = await onboarding!.recommendNextFeature();

      if (!recommendation) {
        vscode.window.showInformationMessage('✅ 你已经掌握了所有核心功能！');
        return;
      }

      const priority =
        recommendation.priority === 'high'
          ? '🔥'
          : recommendation.priority === 'medium'
          ? '💡'
          : 'ℹ️';

      const action = await vscode.window.showInformationMessage(
        `${priority} 推荐功能: ${recommendation.feature}\n\n${recommendation.reason}`,
        '立即尝试',
        '稍后'
      );

      if (action === '立即尝试') {
        await vscode.commands.executeCommand(recommendation.command);
      }
    })
  );

  // 注册命令：上下文帮助
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.onboarding.help', async (action: string) => {
      const tip = await onboarding!.contextualHelp(action);
      if (tip) {
        vscode.window.showInformationMessage(tip);
      }
    })
  );

  // 注册命令：查看成就
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.onboarding.achievements', async () => {
      const progress = onboarding!.getProgress();

      if (progress.achievements.length === 0) {
        vscode.window.showInformationMessage('还没有获得成就，继续努力！');
        return;
      }

      const items = progress.achievements.map((a) => ({
        label: a.title,
        description: new Date(a.timestamp).toLocaleDateString(),
        detail: a.description,
      }));

      await vscode.window.showQuickPick(items, {
        placeHolder: `已获得 ${progress.achievements.length} 个成就`,
      });
    })
  );

  // 自动推荐功能（每小时检查一次）
  const recommendInterval = setInterval(async () => {
    const recommendation = await onboarding!.recommendNextFeature();
    if (recommendation && recommendation.priority === 'high') {
      const action = await vscode.window.showInformationMessage(
        `💡 推荐: ${recommendation.feature}\n${recommendation.reason}`,
        '立即尝试',
        '不再提示'
      );

      if (action === '立即尝试') {
        await vscode.commands.executeCommand(recommendation.command);
      } else if (action === '不再提示') {
        clearInterval(recommendInterval);
      }
    }
  }, 60 * 60 * 1000); // 每小时

  context.subscriptions.push({
    dispose: () => clearInterval(recommendInterval),
  });

  // 暴露 API
  const api = {
    onboarding,
  };

  console.log('✅ Onboarding Guide API exposed');

  return api as any;
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Onboarding Guide extension is now deactivated');
  onboarding = null;
}
