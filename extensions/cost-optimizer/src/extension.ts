import * as vscode from 'vscode';
import { TransparentCostSystem } from './TransparentCostSystem';

let costSystem: TransparentCostSystem | null = null;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Cost Optimizer extension is now active');

  // 初始化成本系统
  costSystem = new TransparentCostSystem(context);

  // 注册命令：成本预测
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.cost.predict', async () => {
      const task = await vscode.window.showInputBox({
        prompt: '输入任务描述',
        placeHolder: '例如: 重构用户认证模块',
      });

      if (!task) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '预测成本中...',
          cancellable: false,
        },
        async () => {
          const estimate = await costSystem!.predictCost(task);

          const message = [
            `💰 成本预测`,
            ``,
            `模型: ${estimate.model}`,
            `预估成本: $${estimate.estimated.toFixed(4)}`,
            ``,
            `详细分解:`,
            `• Prompt: $${estimate.breakdown.prompt.toFixed(4)} (${estimate.breakdown.tokens.prompt} tokens)`,
            `• Completion: $${estimate.breakdown.completion.toFixed(4)} (${estimate.breakdown.tokens.completion} tokens)`,
            ``,
            `置信度: ${(estimate.confidence * 100).toFixed(0)}%`,
          ].join('\n');

          // 显示替代方案
          if (estimate.alternatives.length > 0) {
            const alt = estimate.alternatives[0];
            const useAlt = await vscode.window.showInformationMessage(
              message +
                `\n\n💡 使用 ${alt.model} 可节省 $${alt.savings.toFixed(4)} (${alt.savingsPercent.toFixed(0)}%)`,
              '使用推荐模型',
              '继续当前模型'
            );

            if (useAlt === '使用推荐模型') {
              vscode.window.showInformationMessage(`已切换到 ${alt.model}`);
            }
          } else {
            vscode.window.showInformationMessage(message);
          }
        }
      );
    })
  );

  // 注册命令：智能模型选择
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.cost.smartSelect', async () => {
      const task = await vscode.window.showInputBox({
        prompt: '输入任务描述',
        placeHolder: '例如: 添加登录功能',
      });

      if (!task) return;

      const recommendation = await costSystem!.smartModelSelection(task);

      const message = [
        `🤖 智能模型推荐`,
        ``,
        `推荐模型: ${recommendation.model}`,
        `原因: ${recommendation.reason}`,
        ``,
        `任务复杂度: ${(recommendation.complexity * 100).toFixed(0)}%`,
        `预估成本: $${recommendation.estimatedCost.toFixed(4)}`,
        `预估时间: ${recommendation.estimatedTime.toFixed(1)}s`,
      ].join('\n');

      const action = await vscode.window.showInformationMessage(
        message,
        '使用推荐模型',
        '取消'
      );

      if (action === '使用推荐模型') {
        vscode.window.showInformationMessage(`已切换到 ${recommendation.model}`);
      }
    })
  );

  // 注册命令：优化建议
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.cost.optimize', async () => {
      const optimizations = await costSystem!.optimizeCost();

      if (optimizations.length === 0) {
        vscode.window.showInformationMessage('✅ 当前使用已优化，无需改进');
        return;
      }

      const items = optimizations.map((opt) => ({
        label: `${opt.priority === 'high' ? '🔥' : '💡'} ${opt.title}`,
        description: `节省 $${opt.savings.toFixed(4)} (${opt.savingsPercent.toFixed(0)}%)`,
        detail: opt.description,
        optimization: opt,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `找到 ${optimizations.length} 个优化建议`,
      });

      if (selected) {
        const opt = (selected as any).optimization;
        await vscode.commands.executeCommand(opt.action);
      }
    })
  );

  // 注册命令：成本仪表板
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.cost.dashboard', async () => {
      const dashboard = await costSystem!.getCostDashboard();

      const trendIcon =
        dashboard.trend.direction === 'up'
          ? '📈'
          : dashboard.trend.direction === 'down'
          ? '📉'
          : '➡️';

      const content = [
        '# 💰 成本仪表板',
        '',
        '## 总览',
        '',
        `- **今日**: $${dashboard.today.toFixed(4)}`,
        `- **本周**: $${dashboard.week.toFixed(4)}`,
        `- **本月**: $${dashboard.month.toFixed(4)}`,
        '',
        `## 趋势 ${trendIcon}`,
        '',
        `${dashboard.trend.direction === 'up' ? '上升' : dashboard.trend.direction === 'down' ? '下降' : '稳定'}: ${Math.abs(dashboard.trend.change).toFixed(1)}%`,
        '',
        '## 最昂贵的任务',
        '',
        ...dashboard.topExpensive.map(
          (task, i) =>
            `${i + 1}. **$${task.cost.toFixed(4)}** - ${task.task} (${task.model})`
        ),
        '',
        '## 潜在节省',
        '',
        `💡 通过优化可节省: **$${dashboard.savings.toFixed(4)}**`,
        '',
        '## 成本分解（按模型）',
        '',
        ...Object.entries(dashboard.breakdown.byModel).map(
          ([model, cost]) => `- **${model}**: $${cost.toFixed(4)}`
        ),
      ].join('\n');

      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, { preview: true });
    })
  );

  // 注册命令：启用缓存
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.cost.enableCache', async () => {
      await context.globalState.update('cacheEnabled', true);
      vscode.window.showInformationMessage('✅ 查询缓存已启用');
    })
  );

  // 注册命令：自动选择模型
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.cost.autoSelectModel', async () => {
      await context.globalState.update('autoSelectModel', true);
      vscode.window.showInformationMessage('✅ 自动模型选择已启用');
    })
  );

  // 注册命令：启用批处理
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.cost.enableBatch', async () => {
      await context.globalState.update('batchEnabled', true);
      vscode.window.showInformationMessage('✅ 批处理已启用');
    })
  );

  // 注册命令：优化提示词
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.cost.optimizePrompts', async () => {
      await context.globalState.update('promptOptimization', true);
      vscode.window.showInformationMessage('✅ 提示词优化已启用');
    })
  );

  // 暴露 API
  const api = {
    costSystem,
  };

  console.log('✅ Cost Optimizer API exposed');

  return api as any;
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Cost Optimizer extension is now deactivated');
  costSystem = null;
}
