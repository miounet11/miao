import * as vscode from 'vscode';
import { TimelineEvent, FileChange } from './types';
import { LogManager } from './managers/LogManager';
import { ChangeTracker } from './trackers/ChangeTracker';

/**
 * Miaoda History Tree Provider
 * 在侧边栏显示文件历史和 AI 操作
 */
export class MiaodaHistoryTreeProvider implements vscode.TreeDataProvider<HistoryItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<HistoryItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private logManager: LogManager,
    private changeTracker: ChangeTracker
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: HistoryItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: HistoryItem): Promise<HistoryItem[]> {
    if (!element) {
      // Root level: show categories
      return [
        new HistoryItem(
          'AI Operations',
          'ai-operations',
          vscode.TreeItemCollapsibleState.Collapsed,
          new vscode.ThemeIcon('sparkle')
        ),
        new HistoryItem(
          'File Changes',
          'file-changes',
          vscode.TreeItemCollapsibleState.Collapsed,
          new vscode.ThemeIcon('file')
        ),
        new HistoryItem(
          'Recent Activity',
          'recent',
          vscode.TreeItemCollapsibleState.Collapsed,
          new vscode.ThemeIcon('history')
        ),
      ];
    }

    // Second level: show items
    if (element.contextValue === 'ai-operations') {
      return this.getAIOperations();
    } else if (element.contextValue === 'file-changes') {
      return this.getFileChanges();
    } else if (element.contextValue === 'recent') {
      return this.getRecentActivity();
    }

    return [];
  }

  private async getAIOperations(): Promise<HistoryItem[]> {
    const logs = await this.logManager.getLogs({
      category: 'ai-operation',
      limit: 20,
    });

    return logs.map((log) => {
      const time = new Date(log.timestamp).toLocaleString();
      const item = new HistoryItem(
        log.message,
        'ai-operation-item',
        vscode.TreeItemCollapsibleState.None,
        new vscode.ThemeIcon('sparkle', new vscode.ThemeColor('charts.purple'))
      );
      item.description = time;
      item.tooltip = `${log.message}\n${time}`;
      item.command = {
        title: 'View Details',
        command: 'miaoda.history.viewAIOperation',
        arguments: [log],
      };
      return item;
    });
  }

  private async getFileChanges(): Promise<HistoryItem[]> {
    const changes = await this.changeTracker.getRecentChanges(20);

    return changes.map((change) => {
      const time = new Date(change.timestamp).toLocaleString();
      const item = new HistoryItem(
        change.file,
        'file-change-item',
        vscode.TreeItemCollapsibleState.None,
        new vscode.ThemeIcon('file', new vscode.ThemeColor('charts.blue'))
      );
      item.description = `+${change.diff.added} -${change.diff.removed}`;
      item.tooltip = `${change.file}\n${change.type}\n${time}`;
      return item;
    });
  }

  private async getRecentActivity(): Promise<HistoryItem[]> {
    const items: HistoryItem[] = [];

    // Get recent AI operations
    const aiLogs = await this.logManager.getLogs({
      category: 'ai-operation',
      limit: 5,
    });

    // Get recent file changes
    const changes = await this.changeTracker.getRecentChanges(5);

    // Combine and sort by timestamp
    const combined: Array<{ timestamp: number; type: string; data: any }> = [
      ...aiLogs.map((log) => ({ timestamp: log.timestamp, type: 'ai', data: log })),
      ...changes.map((change) => ({ timestamp: change.timestamp, type: 'change', data: change })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    for (const entry of combined.slice(0, 10)) {
      const time = new Date(entry.timestamp).toLocaleString();

      if (entry.type === 'ai') {
        const log = entry.data;
        const item = new HistoryItem(
          log.message,
          'recent-ai',
          vscode.TreeItemCollapsibleState.None,
          new vscode.ThemeIcon('sparkle', new vscode.ThemeColor('charts.purple'))
        );
        item.description = time;
        item.tooltip = `AI: ${log.message}\n${time}`;
        items.push(item);
      } else {
        const change = entry.data;
        const item = new HistoryItem(
          change.file,
          'recent-change',
          vscode.TreeItemCollapsibleState.None,
          new vscode.ThemeIcon('file', new vscode.ThemeColor('charts.blue'))
        );
        item.description = `${change.type} • ${time}`;
        item.tooltip = `File: ${change.file}\n${change.type}\n${time}`;
        items.push(item);
      }
    }

    return items;
  }
}

class HistoryItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly contextValue: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly iconPath?: vscode.ThemeIcon
  ) {
    super(label, collapsibleState);
  }
}
