import * as vscode from 'vscode';
import { ProjectManager } from './managers/ProjectManager';
import { DashboardWebviewProvider } from './webview/DashboardWebviewProvider';
import { HistoryWebviewProvider } from './webview/HistoryWebviewProvider';
import { MiaodaHistoryTreeProvider } from './MiaodaHistoryTreeProvider';

let projectManager: ProjectManager | null = null;
let dashboardProvider: DashboardWebviewProvider | null = null;
let historyProvider: HistoryWebviewProvider | null = null;
let historyTreeProvider: MiaodaHistoryTreeProvider | null = null;

/**
 * Extension activation entry point
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Miaoda Project Manager extension is now active');

  try {
    // Get workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      console.log('No workspace folder found');
      return;
    }

    const projectRoot = workspaceFolders[0].uri.fsPath;

    // Initialize project manager
    projectManager = new ProjectManager(projectRoot);
    await projectManager.initialize();

    // Initialize webview providers
    dashboardProvider = new DashboardWebviewProvider(context.extensionUri, projectManager);
    historyProvider = new HistoryWebviewProvider(context.extensionUri, projectManager);

    // Initialize history tree provider
    historyTreeProvider = new MiaodaHistoryTreeProvider(
      projectManager.logManager,
      projectManager.changeTracker
    );

    // Register webview view provider
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        DashboardWebviewProvider.viewType,
        dashboardProvider
      )
    );

    // Register history tree view
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider(
        'miaodaHistory',
        historyTreeProvider
      )
    );

    // Register commands
    registerCommands(context, projectManager, dashboardProvider, historyProvider, historyTreeProvider);

    console.log('Miaoda Project Manager initialized successfully');
  } catch (error) {
    console.error('Failed to activate Miaoda Project Manager:', error);
    vscode.window.showErrorMessage(`Failed to initialize Miaoda Project Manager: ${error}`);
  }
}

/**
 * Extension deactivation
 */
export async function deactivate(): Promise<void> {
  console.log('Miaoda Project Manager extension is now deactivated');
  if (projectManager) {
    await projectManager.dispose();
    projectManager = null;
  }
}

/**
 * Register commands
 */
function registerCommands(
  context: vscode.ExtensionContext,
  manager: ProjectManager,
  dashboard: DashboardWebviewProvider,
  history: HistoryWebviewProvider,
  historyTree: MiaodaHistoryTreeProvider | null
): void {
  // Dashboard command - now shows webview
  const dashboardCmd = vscode.commands.registerCommand('miaoda.project.dashboard', async () => {
    dashboard.refresh();
  });

  // History command - now shows webview panel
  const historyCmd = vscode.commands.registerCommand('miaoda.project.history', async () => {
    await history.show();
  });

  // Optimize command
  const optimizeCmd = vscode.commands.registerCommand('miaoda.project.optimize', async () => {
    await handleOptimize(manager);
    dashboard.refresh();
  });

  // Settings command
  const settingsCmd = vscode.commands.registerCommand('miaoda.project.settings', async () => {
    await handleSettings(manager);
  });

  // History tree commands
  const viewAIOperationCmd = vscode.commands.registerCommand(
    'miaoda.history.viewAIOperation',
    async (log: any) => {
      const content = `# AI Operation\n\n**Time**: ${new Date(log.timestamp).toLocaleString()}\n\n**Level**: ${log.level}\n\n**Category**: ${log.category}\n\n**Message**: ${log.message}\n\n**Metadata**:\n\`\`\`json\n${JSON.stringify(log.metadata, null, 2)}\n\`\`\``;
      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }
  );

  const refreshHistoryCmd = vscode.commands.registerCommand(
    'miaoda.history.refresh',
    () => {
      historyTree?.refresh();
      vscode.window.showInformationMessage('History refreshed');
    }
  );

  context.subscriptions.push(
    dashboardCmd,
    historyCmd,
    optimizeCmd,
    settingsCmd,
    viewAIOperationCmd,
    refreshHistoryCmd
  );
}

/**
 * Handle dashboard command
 */
async function handleDashboard(manager: ProjectManager): Promise<void> {
  try {
    const stats = await manager.getProjectStats();
    const storageStats = await manager.getStorageStats();

    const content = `# 📊 Miaoda Project Dashboard\n\n## Project Statistics\n\n- **Total Files Modified**: ${stats.totalFiles}\n- **Total Changes**: ${stats.totalChanges}\n- **Active Time**: ${formatDuration(stats.activeTime)}\n- **Last Modified**: ${new Date(stats.lastModified).toLocaleString()}\n\n## Storage Usage\n\n- **Total Size**: ${formatBytes(storageStats.totalSize)}\n- **History**: ${formatBytes(storageStats.historySize)}\n- **Context**: ${formatBytes(storageStats.contextSize)}\n- **Logs**: ${formatBytes(storageStats.logsSize)}\n- **Cache**: ${formatBytes(storageStats.cacheSize)}\n\n## Recent Changes\n\n`;

    const recentChanges = await manager.getRecentChanges(10);
    let changesList = '';
    for (const change of recentChanges) {
      const time = new Date(change.timestamp).toLocaleTimeString();
      changesList += `- ${time} | ${change.file} | +${change.diff.added} -${change.diff.removed}\n`;
    }

    const doc = await vscode.workspace.openTextDocument({
      content: content + changesList,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(doc, { preview: true });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show dashboard: ${error}`);
  }
}

/**
 * Handle history command
 */
async function handleHistory(manager: ProjectManager): Promise<void> {
  try {
    const today = new Date();
    const changes = await manager.getChangesForDate(today);

    let content = `# 📜 Project History - ${today.toDateString()}\n\n`;

    if (changes.length === 0) {
      content += 'No changes recorded for today.\n';
    } else {
      for (const change of changes) {
        const time = new Date(change.timestamp).toLocaleTimeString();
        content += `## ${time} - ${change.file}\n`;
        content += `- Type: ${change.type}\n`;
        content += `- Added: ${change.diff.added} lines\n`;
        content += `- Removed: ${change.diff.removed} lines\n\n`;
      }
    }

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(doc, { preview: true });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show history: ${error}`);
  }
}

/**
 * Handle optimize command
 */
async function handleOptimize(manager: ProjectManager): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Optimizing project storage...',
        cancellable: false,
      },
      async () => {
        await manager.optimizeStorage();
      }
    );

    vscode.window.showInformationMessage('Project storage optimized successfully!');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to optimize storage: ${error}`);
  }
}

/**
 * Handle settings command
 */
async function handleSettings(manager: ProjectManager): Promise<void> {
  try {
    const options = [
      { label: 'Compression Settings', value: 'compression' },
      { label: 'Cleanup Rules', value: 'cleanup' },
      { label: 'Tracking Settings', value: 'tracking' },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select settings to configure',
    });

    if (!selected) {
      return;
    }

    vscode.window.showInformationMessage(`Advanced settings for ${selected.label} coming soon!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open settings: ${error}`);
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration to human readable
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
