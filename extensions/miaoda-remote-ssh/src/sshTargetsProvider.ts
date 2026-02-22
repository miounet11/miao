import * as vscode from 'vscode';
import { SSHConfigManager, SSHHost } from './sshConfig';

export class SSHHostItem extends vscode.TreeItem {
  constructor(
    public readonly host: SSHHost,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(host.name, collapsibleState);

    this.tooltip = `${host.user}@${host.host}:${host.port}`;
    this.description = `${host.user}@${host.host}`;
    this.contextValue = 'sshHost';
    this.iconPath = new vscode.ThemeIcon('vm');

    // Add command to connect on click
    this.command = {
      command: 'miaoda.remote.connectToHost',
      title: 'Connect to Host',
      arguments: [this],
    };
  }
}

export class SSHTargetsProvider implements vscode.TreeDataProvider<SSHHostItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SSHHostItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private configManager: SSHConfigManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SSHHostItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SSHHostItem): Promise<SSHHostItem[]> {
    if (element) {
      return [];
    }

    try {
      const hosts = await this.configManager.getHosts();
      return hosts.map(
        (host) => new SSHHostItem(host, vscode.TreeItemCollapsibleState.None)
      );
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to load SSH hosts: ${err}`);
      return [];
    }
  }
}
