import * as vscode from 'vscode';

/**
 * Miaoda Code Lens Provider
 * 为代码提供快速操作入口
 */
export class MiaodaCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  constructor() {}

  /**
   * 刷新 Code Lens
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * 提供 Code Lens
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    // 只为 TypeScript/JavaScript 文件提供 Code Lens
    if (!this.isSupportedLanguage(document.languageId)) {
      return codeLenses;
    }

    // 在文件顶部添加 Code Lens
    const topOfDocument = new vscode.Range(0, 0, 0, 0);

    // 1. Generate Tests
    codeLenses.push(
      new vscode.CodeLens(topOfDocument, {
        title: '$(beaker) Generate Tests',
        tooltip: 'AI 生成单元测试',
        command: 'miaoda.writeTests',
        arguments: [],
      })
    );

    // 2. Review Code
    codeLenses.push(
      new vscode.CodeLens(topOfDocument, {
        title: '$(search) Review Code',
        tooltip: 'AI 代码审查',
        command: 'miaoda.codeReview',
        arguments: [],
      })
    );

    // 3. Generate Docs
    codeLenses.push(
      new vscode.CodeLens(topOfDocument, {
        title: '$(book) Generate Docs',
        tooltip: 'AI 生成文档',
        command: 'miaoda.generateDocs',
        arguments: [],
      })
    );

    // 4. Verify Code
    codeLenses.push(
      new vscode.CodeLens(topOfDocument, {
        title: '$(shield) Verify Code',
        tooltip: 'AI 代码验证',
        command: 'miaoda.verifyCode',
        arguments: [],
      })
    );

    // 为函数和类添加特定的 Code Lens
    const functionLenses = this.findFunctionsAndClasses(document);
    codeLenses.push(...functionLenses);

    return codeLenses;
  }

  /**
   * 检查是否为支持的语言
   */
  private isSupportedLanguage(languageId: string): boolean {
    return [
      'typescript',
      'javascript',
      'typescriptreact',
      'javascriptreact',
    ].includes(languageId);
  }

  /**
   * 查找函数和类定义
   */
  private findFunctionsAndClasses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // 简单的正则匹配（生产环境应使用 AST）
    const functionRegex = /^\s*(export\s+)?(async\s+)?function\s+(\w+)/;
    const classRegex = /^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/;
    const arrowFunctionRegex = /^\s*(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?\(/;

    lines.forEach((line, index) => {
      let match: RegExpMatchArray | null = null;
      let type: 'function' | 'class' | null = null;

      if ((match = line.match(functionRegex))) {
        type = 'function';
      } else if ((match = line.match(classRegex))) {
        type = 'class';
      } else if ((match = line.match(arrowFunctionRegex))) {
        type = 'function';
      }

      if (match && type) {
        const range = new vscode.Range(index, 0, index, line.length);

        if (type === 'function') {
          // 为函数添加 "Generate Tests" Code Lens
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: '$(beaker) Tests',
              tooltip: '为此函数生成测试',
              command: 'miaoda.writeTests',
              arguments: [],
            })
          );
        }

        if (type === 'class') {
          // 为类添加 "Generate Tests" 和 "Generate Docs" Code Lens
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: '$(beaker) Tests',
              tooltip: '为此类生成测试',
              command: 'miaoda.writeTests',
              arguments: [],
            })
          );

          codeLenses.push(
            new vscode.CodeLens(range, {
              title: '$(book) Docs',
              tooltip: '为此类生成文档',
              command: 'miaoda.generateDocs',
              arguments: [],
            })
          );
        }
      }
    });

    return codeLenses;
  }

  /**
   * 解析 Code Lens（可选）
   */
  public resolveCodeLens?(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.CodeLens | Thenable<vscode.CodeLens> {
    // 可以在这里添加异步数据加载
    return codeLens;
  }
}
