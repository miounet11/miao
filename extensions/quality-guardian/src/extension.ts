import * as vscode from 'vscode';
import { CodeQualityGuardian } from './CodeQualityGuardian';

let guardian: CodeQualityGuardian | null = null;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Quality Guardian extension is now active');

  // 初始化质量守护
  guardian = new CodeQualityGuardian(context);

  // 注册命令：完整质量检查
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.quality.fullCheck', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '质量检查中...',
          cancellable: false,
        },
        async () => {
          const report = await guardian!.fullCheck(editor.document);

          // 显示报告
          const content = [
            '# 📊 代码质量报告',
            '',
            `## 总体评分: ${report.score.grade} (${report.score.overall.toFixed(0)}/100)`,
            '',
            '### 详细分数',
            '',
            `- **正确性**: ${report.score.breakdown.correctness.toFixed(0)}/100`,
            `- **可维护性**: ${report.score.breakdown.maintainability.toFixed(0)}/100`,
            `- **性能**: ${report.score.breakdown.performance.toFixed(0)}/100`,
            `- **安全性**: ${report.score.breakdown.security.toFixed(0)}/100`,
            `- **代码风格**: ${report.score.breakdown.style.toFixed(0)}/100`,
            '',
            `## 静态分析 (${report.staticIssues.length} 个问题)`,
            '',
            ...report.staticIssues.slice(0, 10).map(
              (issue) =>
                `- **[${issue.severity}]** ${issue.message} (${issue.source}) - Line ${issue.range.start.line + 1}`
            ),
            report.staticIssues.length > 10 ? `\n... 还有 ${report.staticIssues.length - 10} 个问题` : '',
            '',
            `## AI 审查`,
            '',
            `**评分**: ${report.aiReview.rating}/5 ⭐`,
            '',
            `**总结**: ${report.aiReview.summary}`,
            '',
            '### 发现的问题',
            '',
            ...report.aiReview.issues.map(
              (issue) =>
                `- **[${issue.category}]** ${issue.message}${issue.line ? ` (Line ${issue.line})` : ''}`
            ),
            '',
            '### 改进建议',
            '',
            ...report.aiReview.suggestions.map((s) => `- ${s}`),
            '',
            `## 自动修复 (${report.fixes.length} 个可修复)`,
            '',
            ...report.fixes.slice(0, 5).map((fix) => `- ${fix.description}`),
            report.fixes.length > 5 ? `\n... 还有 ${report.fixes.length - 5} 个修复` : '',
            '',
            `---`,
            '',
            `检查耗时: ${report.duration}ms`,
          ].join('\n');

          const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown',
          });

          await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

          // 询问是否应用修复
          if (report.fixes.length > 0) {
            const action = await vscode.window.showInformationMessage(
              `发现 ${report.fixes.length} 个可自动修复的问题`,
              '应用修复',
              '取消'
            );

            if (action === '应用修复') {
              const success = await guardian!.applyFixes(editor.document, report.fixes);
              if (success) {
                vscode.window.showInformationMessage(
                  `✅ 已应用 ${report.fixes.length} 个修复`
                );
              }
            }
          }
        }
      );
    })
  );

  // 注册命令：静态分析
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.quality.staticAnalysis', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const issues = await guardian!.staticAnalysis(editor.document);

      if (issues.length === 0) {
        vscode.window.showInformationMessage('✅ 未发现问题');
        return;
      }

      const items = issues.map((issue) => ({
        label: `${issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡'} ${issue.message}`,
        description: `Line ${issue.range.start.line + 1}`,
        detail: `${issue.source} - ${issue.fixable ? '可修复' : '不可修复'}`,
        issue,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `发现 ${issues.length} 个问题`,
      });

      if (selected) {
        const issue = (selected as any).issue;
        editor.selection = new vscode.Selection(issue.range.start, issue.range.end);
        editor.revealRange(issue.range, vscode.TextEditorRevealType.InCenter);
      }
    })
  );

  // 注册命令：AI 审查
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.quality.aiReview', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const review = await guardian!.aiReview(editor.document);

      const content = [
        '# 🤖 AI 代码审查',
        '',
        `## 评分: ${review.rating}/5 ⭐`,
        '',
        `**总结**: ${review.summary}`,
        '',
        '## 发现的问题',
        '',
        ...review.issues.map(
          (issue) =>
            `### [${issue.category}] ${issue.severity}\n\n${issue.message}${issue.line ? ` (Line ${issue.line})` : ''}${issue.suggestion ? `\n\n💡 建议: ${issue.suggestion}` : ''}`
        ),
        '',
        '## 改进建议',
        '',
        ...review.suggestions.map((s, i) => `${i + 1}. ${s}`),
      ].join('\n');

      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    })
  );

  // 注册命令：自动修复
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.quality.autoFix', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const issues = await guardian!.staticAnalysis(editor.document);
      const fixes = await guardian!.autoFix(editor.document, issues);

      if (fixes.length === 0) {
        vscode.window.showInformationMessage('没有可自动修复的问题');
        return;
      }

      const action = await vscode.window.showInformationMessage(
        `发现 ${fixes.length} 个可自动修复的问题`,
        '应用全部',
        '逐个查看'
      );

      if (action === '应用全部') {
        const success = await guardian!.applyFixes(editor.document, fixes);
        if (success) {
          vscode.window.showInformationMessage(`✅ 已应用 ${fixes.length} 个修复`);
        }
      } else if (action === '逐个查看') {
        const items = fixes.map((fix) => ({
          label: fix.description,
          description: `Line ${fix.range.start.line + 1}`,
          fix,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: '选择要应用的修复',
          canPickMany: true,
        });

        if (selected && selected.length > 0) {
          const selectedFixes = selected.map((s: any) => s.fix);
          const success = await guardian!.applyFixes(editor.document, selectedFixes);
          if (success) {
            vscode.window.showInformationMessage(
              `✅ 已应用 ${selectedFixes.length} 个修复`
            );
          }
        }
      }
    })
  );

  // 注册命令：质量评分
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.quality.score', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const score = await guardian!.qualityScore(editor.document);

      const gradeEmoji = {
        A: '🏆',
        B: '✅',
        C: '⚠️',
        D: '❌',
        F: '💀',
      }[score.grade];

      const message = [
        `${gradeEmoji} 质量评分: ${score.grade} (${score.overall.toFixed(0)}/100)`,
        '',
        '详细分数:',
        `• 正确性: ${score.breakdown.correctness.toFixed(0)}/100`,
        `• 可维护性: ${score.breakdown.maintainability.toFixed(0)}/100`,
        `• 性能: ${score.breakdown.performance.toFixed(0)}/100`,
        `• 安全性: ${score.breakdown.security.toFixed(0)}/100`,
        `• 代码风格: ${score.breakdown.style.toFixed(0)}/100`,
      ].join('\n');

      vscode.window.showInformationMessage(message);
    })
  );

  // 注册命令：质量趋势
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.quality.trend', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const trend = await guardian!.getQualityTrend(editor.document.uri.fsPath);

      if (trend.history.length === 0) {
        vscode.window.showInformationMessage('暂无历史数据');
        return;
      }

      const directionEmoji = {
        improving: '📈',
        declining: '📉',
        stable: '➡️',
      }[trend.direction];

      const content = [
        '# 📊 质量趋势',
        '',
        `## 趋势: ${directionEmoji} ${trend.direction === 'improving' ? '改善' : trend.direction === 'declining' ? '下降' : '稳定'}`,
        '',
        `变化: ${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)} 分`,
        '',
        '## 历史记录',
        '',
        ...trend.history.slice(-20).map(
          (h) =>
            `- ${new Date(h.timestamp).toLocaleString()}: ${h.score.toFixed(0)}/100`
        ),
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
    guardian,
  };

  console.log('✅ Quality Guardian API exposed');

  return api as any;
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Quality Guardian extension is now deactivated');
  guardian = null;
}
