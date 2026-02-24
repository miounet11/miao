import * as vscode from 'vscode';
import { HybridModelRouter } from './HybridModelRouter';

let router: HybridModelRouter | null = null;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Hybrid Model extension is now active');

  // 初始化路由器
  router = new HybridModelRouter(context);

  // 注册命令：选择模型
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.hybrid.selectModel', async () => {
      const models = router!.getAvailableModels();

      const items = models.map((model) => ({
        label: `${model.available ? '✅' : '⬇️'} ${model.name}`,
        description: `${model.type} | ${model.speed} | ${model.quality}`,
        detail: `Size: ${model.size} | Cost: $${model.cost.toFixed(4)}/1k tokens`,
        model,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a model',
      });

      if (selected) {
        const model = (selected as any).model;
        if (model.type === 'local' && !model.available) {
          const action = await vscode.window.showInformationMessage(
            `${model.name} is not downloaded. Download now?`,
            'Download',
            'Cancel'
          );

          if (action === 'Download') {
            await router!.downloadModel(model.id);
          }
        } else {
          vscode.window.showInformationMessage(`Selected: ${model.name}`);
        }
      }
    })
  );

  // 注册命令：下载模型
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.hybrid.downloadModel', async () => {
      const models = router!.getAvailableModels().filter(
        (m) => m.type === 'local' && !m.available
      );

      if (models.length === 0) {
        vscode.window.showInformationMessage('All local models are already downloaded');
        return;
      }

      const items = models.map((model) => ({
        label: model.name,
        description: `${model.size} | ${model.speed} | ${model.quality}`,
        detail: 'Click to download',
        model,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a model to download',
      });

      if (selected) {
        await router!.downloadModel((selected as any).model.id);
      }
    })
  );

  // 注册命令：模型统计
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.hybrid.modelStats', async () => {
      const stats = await router!.getStats();

      const content = [
        '# 📊 Model Statistics',
        '',
        `## Total Requests: ${stats.totalRequests}`,
        '',
        `- **Local**: ${stats.localRequests} (${stats.localPercentage.toFixed(1)}%)`,
        `- **Cloud**: ${stats.cloudRequests} (${(100 - stats.localPercentage).toFixed(1)}%)`,
        '',
        '## Performance',
        '',
        `- **Avg Local Latency**: ${stats.avgLocalLatency.toFixed(0)}ms`,
        `- **Avg Cloud Latency**: ${stats.avgCloudLatency.toFixed(0)}ms`,
        `- **Speed Improvement**: ${(stats.avgCloudLatency / stats.avgLocalLatency).toFixed(1)}x`,
        '',
        '## Cost',
        '',
        `- **Total Cost**: $${stats.totalCost.toFixed(4)}`,
        `- **Cost Savings**: $${stats.costSavings.toFixed(4)}`,
        `- **Savings Rate**: ${stats.totalRequests > 0 ? ((stats.costSavings / (stats.totalCost + stats.costSavings)) * 100).toFixed(1) : 0}%`,
        '',
        '## Recommendations',
        '',
      ];

      if (stats.localPercentage < 50) {
        content.push('- 💡 Consider downloading more local models to save cost');
      }

      if (stats.avgLocalLatency > 500) {
        content.push('- ⚠️ Local model latency is high, consider using faster models');
      }

      if (stats.totalCost > 10) {
        content.push('- 💰 High cloud usage detected, increase local model usage');
      }

      const doc = await vscode.workspace.openTextDocument({
        content: content.join('\n'),
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    })
  );

  // 注册命令：智能路由配置
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.hybrid.smartRoute', async () => {
      const config = vscode.workspace.getConfiguration('miaoda.hybrid');

      const options = [
        {
          label: '🏠 Prefer Local',
          description: 'Use local models when possible',
          picked: config.get<boolean>('preferLocal', true),
          key: 'preferLocal',
        },
        {
          label: '✈️ Offline Mode',
          description: 'Force local-only mode',
          picked: config.get<boolean>('offlineMode', false),
          key: 'offlineMode',
        },
        {
          label: '⬇️ Auto Download',
          description: 'Automatically download recommended models',
          picked: config.get<boolean>('autoDownload', false),
          key: 'autoDownload',
        },
      ];

      const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Toggle routing options',
        canPickMany: true,
      });

      if (selected) {
        for (const option of options) {
          const enabled = selected.some((s) => s.key === option.key);
          await config.update(option.key, enabled, vscode.ConfigurationTarget.Global);
        }

        vscode.window.showInformationMessage('✅ Routing configuration updated');
      }
    })
  );

  // 暴露 API
  const api = {
    router,
  };

  console.log('✅ Hybrid Model API exposed');

  return api as any;
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Hybrid Model extension is now deactivated');
  router = null;
}
