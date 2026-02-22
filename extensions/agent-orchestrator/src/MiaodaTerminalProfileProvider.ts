import * as vscode from 'vscode';

/**
 * Miaoda Terminal Profile Provider
 * 提供预配置的 Miaoda 终端环境
 */
export class MiaodaTerminalProfileProvider implements vscode.TerminalProfileProvider {
  async provideTerminalProfile(
    token: vscode.CancellationToken
  ): Promise<vscode.TerminalProfile> {
    const options: vscode.TerminalOptions = {
      name: 'Miaoda Terminal',
      iconPath: new vscode.ThemeIcon('sparkle'),
      env: this.getMiaodaEnvironment(),
      message: this.getWelcomeMessage(),
    };

    return new vscode.TerminalProfile(options);
  }

  /**
   * 获取 Miaoda 环境变量
   */
  private getMiaodaEnvironment(): { [key: string]: string | null } {
    const env: { [key: string]: string | null } = {};

    // 添加 Miaoda 标识
    env.MIAODA_TERMINAL = '1';
    env.MIAODA_VERSION = '0.1.0';

    // 设置提示符
    env.PS1 = '\\[\\033[35m\\]⚡ Miaoda\\[\\033[0m\\] \\w $ ';

    // 添加常用别名（通过 BASH_ENV）
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      env.MIAODA_PROJECT_ROOT = workspaceFolder.uri.fsPath;
    }

    return env;
  }

  /**
   * 获取欢迎消息
   */
  private getWelcomeMessage(): string {
    return [
      '\x1b[35m⚡ Miaoda Terminal\x1b[0m',
      '',
      'Quick Commands:',
      '  miaoda help     - Show all Miaoda commands',
      '  miaoda skill    - Execute a skill',
      '  miaoda review   - Review current file',
      '  miaoda test     - Generate tests',
      '',
    ].join('\r\n');
  }
}

/**
 * Custom Terminal Link with file path data
 */
class MiaodaTerminalLink extends vscode.TerminalLink {
  constructor(
    startIndex: number,
    length: number,
    tooltip: string,
    public readonly filePath: string,
    public readonly line: number,
    public readonly column: number
  ) {
    super(startIndex, length, tooltip);
  }
}

/**
 * Miaoda Terminal Link Provider
 * 为终端输出中的文件路径添加可点击链接
 */
export class MiaodaTerminalLinkProvider implements vscode.TerminalLinkProvider {
  provideTerminalLinks(
    context: vscode.TerminalLinkContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<MiaodaTerminalLink[]> {
    const links: MiaodaTerminalLink[] = [];

    // 匹配文件路径模式 (例如: src/file.ts:10:5)
    const filePathRegex = /([\w\/\.-]+\.(ts|js|tsx|jsx|py|go|rs|java|cpp|c|h))(?::(\d+))?(?::(\d+))?/g;
    let match: RegExpExecArray | null;

    while ((match = filePathRegex.exec(context.line)) !== null) {
      const filePath = match[1];
      const line = match[3] ? parseInt(match[3], 10) - 1 : 0;
      const column = match[4] ? parseInt(match[4], 10) - 1 : 0;

      links.push(
        new MiaodaTerminalLink(
          match.index,
          match[0].length,
          `Open ${filePath}`,
          filePath,
          line,
          column
        )
      );
    }

    return links;
  }

  handleTerminalLink(link: MiaodaTerminalLink): vscode.ProviderResult<void> {
    const { filePath, line, column } = link;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
    const position = new vscode.Position(line, column);
    const range = new vscode.Range(position, position);

    vscode.window.showTextDocument(fullPath, {
      selection: range,
      preview: false,
    });
  }
}
