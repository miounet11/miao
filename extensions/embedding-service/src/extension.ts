import * as vscode from 'vscode';
import { EmbeddingService } from './EmbeddingService';

let service: EmbeddingService | null = null;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Embedding Service extension is now active');

  // 初始化服务
  service = new EmbeddingService(context);

  // 注册命令：选择模型
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.embedding.selectModel', async () => {
      const models = service!.getAvailableModels();

      const items = models.map((model) => ({
        label: `${model.downloaded ? '✅' : '⬇️'} ${model.displayName}`,
        description: `${model.dimensions}D | ${model.accuracy} | ${model.speed}`,
        detail: `Size: ${model.size}`,
        model,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an embedding model',
      });

      if (selected) {
        const model = (selected as any).model;

        if (!model.downloaded) {
          const action = await vscode.window.showInformationMessage(
            `${model.displayName} is not downloaded. Download now?`,
            'Download',
            'Cancel'
          );

          if (action === 'Download') {
            await service!.downloadModel(model.name);
            await service!.switchModel(model.name);
          }
        } else {
          await service!.switchModel(model.name);
        }
      }
    })
  );

  // 注册命令：下载模型
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.embedding.downloadModel', async () => {
      const models = service!.getAvailableModels().filter((m) => !m.downloaded);

      if (models.length === 0) {
        vscode.window.showInformationMessage('All models are already downloaded');
        return;
      }

      const items = models.map((model) => ({
        label: model.displayName,
        description: `${model.dimensions}D | ${model.accuracy} | ${model.speed}`,
        detail: `Size: ${model.size}`,
        model,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a model to download',
      });

      if (selected) {
        await service!.downloadModel((selected as any).model.name);
      }
    })
  );

  // 注册命令：基准测试
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.embedding.benchmark', async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Running benchmark...',
          cancellable: false,
        },
        async () => {
          const results = await service!.benchmark();

          const content = [
            '# 📊 Embedding Model Benchmark',
            '',
            '## Results',
            '',
            '| Model | Latency | Dimensions | Accuracy |',
            '|-------|---------|------------|----------|',
            ...results.map(
              (r) =>
                `| ${r.displayName} | ${r.avgLatency.toFixed(0)}ms | ${r.dimensions} | ${r.accuracy.toFixed(1)}% |`
            ),
            '',
            '## Recommendations',
            '',
          ];

          // 找到最佳模型
          const best = results.reduce((a, b) => (a.accuracy > b.accuracy ? a : b));
          content.push(`- **Best Accuracy**: ${best.displayName} (${best.accuracy.toFixed(1)}%)`);

          const fastest = results.reduce((a, b) => (a.avgLatency < b.avgLatency ? a : b));
          content.push(`- **Fastest**: ${fastest.displayName} (${fastest.avgLatency.toFixed(0)}ms)`);

          const doc = await vscode.workspace.openTextDocument({
            content: content.join('\n'),
            language: 'markdown',
          });

          await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        }
      );
    })
  );

  // 注册命令：重新索引
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.embedding.reindex', async () => {
      const action = await vscode.window.showWarningMessage(
        'Reindex all files with the current embedding model? This may take a while.',
        'Reindex',
        'Cancel'
      );

      if (action === 'Reindex') {
        vscode.window.showInformationMessage(
          `🔄 Reindexing with ${service!.getCurrentModel()}...`
        );

        // TODO: 触发 context-engine 重新索引
        vscode.commands.executeCommand('miaoda.context.smartSearch', '');
      }
    })
  );

  // 暴露 API
  const api = {
    service,
  };

  console.log('✅ Embedding Service API exposed');

  return api as any;
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Embedding Service extension is now deactivated');
  service = null;
}
