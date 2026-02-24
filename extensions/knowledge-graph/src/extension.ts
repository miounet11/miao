import * as vscode from 'vscode';
import { CodeKnowledgeGraph } from './CodeKnowledgeGraph';

let kg: CodeKnowledgeGraph | null = null;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Knowledge Graph extension is now active');

  // 初始化知识图谱
  kg = new CodeKnowledgeGraph(context);
  await kg.loadGraph();

  // 注册命令：构建图谱
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.kg.buildGraph', async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Building Knowledge Graph...',
          cancellable: false,
        },
        async () => {
          const result = await kg!.buildGraph();

          vscode.window.showInformationMessage(
            `✅ Knowledge Graph built: ${result.totalNodes} nodes, ${result.totalEdges} edges (${result.duration}ms)`
          );
        }
      );
    })
  );

  // 注册命令：可视化
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.kg.visualize', async () => {
      const mermaid = await kg!.visualize();

      const content = [
        '# 📊 Knowledge Graph Visualization',
        '',
        '```mermaid',
        mermaid,
        '```',
        '',
        '> Note: Install Mermaid extension to view the graph',
      ].join('\n');

      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    })
  );

  // 注册命令：查询
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.kg.query', async () => {
      const query = await vscode.window.showInputBox({
        placeHolder: 'Enter entity name (class, function, interface)',
        prompt: 'Search knowledge graph',
      });

      if (!query) return;

      const results = await kg!.query(query);

      if (results.length === 0) {
        vscode.window.showInformationMessage('No results found');
        return;
      }

      const items = results.map((result) => ({
        label: `${result.node.name} (${result.node.type})`,
        description: result.node.filePath,
        detail: `Relevance: ${(result.relevance * 100).toFixed(0)}% | ${result.neighbors.length} neighbors`,
        result,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Found ${results.length} results`,
      });

      if (selected) {
        const node = (selected as any).result.node;
        const uri = vscode.Uri.file(node.filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const position = new vscode.Position(node.location.line, 0);

        await vscode.window.showTextDocument(document, {
          selection: new vscode.Range(position, position),
        });
      }
    })
  );

  // 注册命令：推荐
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.kg.recommend', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      const recommendations = await kg!.getRecommendations(editor.document.uri.fsPath);

      if (recommendations.length === 0) {
        vscode.window.showInformationMessage('No recommendations available');
        return;
      }

      const items = recommendations.map((rec) => ({
        label: `📄 ${rec.filePath.split('/').pop()}`,
        description: rec.reason,
        detail: `Confidence: ${(rec.confidence * 100).toFixed(0)}%`,
        rec,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `${recommendations.length} related files`,
      });

      if (selected) {
        const rec = (selected as any).rec;
        const uri = vscode.Uri.file(rec.filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
      }
    })
  );

  // 注册命令：导出
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.kg.export', async () => {
      const data = await kg!.export();

      const content = [
        '# 📊 Knowledge Graph Export',
        '',
        `## Metadata`,
        '',
        `- **Version**: ${data.metadata.version}`,
        `- **Timestamp**: ${new Date(data.metadata.timestamp).toLocaleString()}`,
        `- **Nodes**: ${data.metadata.nodeCount}`,
        `- **Edges**: ${data.metadata.edgeCount}`,
        '',
        `## Nodes (Top 20)`,
        '',
        ...data.nodes.slice(0, 20).map(
          (node) =>
            `- **${node.name}** (${node.type}) - ${node.filePath}:${node.location.line}`
        ),
        '',
        `## Edges (Top 20)`,
        '',
        ...data.edges.slice(0, 20).map(
          (edge) => `- ${edge.from} --[${edge.type}]--> ${edge.to} (weight: ${edge.weight})`
        ),
        '',
        '---',
        '',
        '```json',
        JSON.stringify(data, null, 2),
        '```',
      ].join('\n');

      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    })
  );

  // 暴露 API
  const api = {
    kg,
  };

  console.log('✅ Knowledge Graph API exposed');

  return api as any;
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Knowledge Graph extension is now deactivated');
  kg = null;
}
