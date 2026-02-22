import * as vscode from 'vscode';
import { getChatController } from './ChatController';
import { getChatHistoryStorage } from '../../shared-services/src/ChatHistoryStorage';

/**
 * Register all chat-related commands
 */
export function registerChatCommands(context: vscode.ExtensionContext): void {
  // Command: New Chat
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.chat.new', async () => {
      const controller = getChatController(context);
      await controller.clearSession();
      vscode.window.showInformationMessage('Started new chat session');
    })
  );

  // Command: Load Chat History
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.chat.loadHistory', async () => {
      const storage = getChatHistoryStorage(context);
      const sessions = await storage.listSessions();

      if (sessions.length === 0) {
        vscode.window.showInformationMessage('No chat history found');
        return;
      }

      const items = sessions.map((session) => ({
        label: session.title,
        description: new Date(session.updatedAt).toLocaleString(),
        detail: `${session.messages.length} messages`,
        sessionId: session.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a chat session to load',
      });

      if (selected) {
        const controller = getChatController(context);
        const loaded = await controller.loadSession(selected.sessionId);
        if (loaded) {
          vscode.window.showInformationMessage(`Loaded: ${selected.label}`);
        } else {
          vscode.window.showErrorMessage('Failed to load session');
        }
      }
    })
  );

  // Command: Search Chat History
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.chat.searchHistory', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search chat history',
        placeHolder: 'Enter search keywords...',
      });

      if (!query) {
        return;
      }

      const storage = getChatHistoryStorage(context);
      const results = await storage.searchSessions(query);

      if (results.length === 0) {
        vscode.window.showInformationMessage('No results found');
        return;
      }

      const items = results.map((session) => ({
        label: session.title,
        description: new Date(session.updatedAt).toLocaleString(),
        detail: `${session.messages.length} messages`,
        sessionId: session.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Found ${results.length} result(s)`,
      });

      if (selected) {
        const controller = getChatController(context);
        await controller.loadSession(selected.sessionId);
        vscode.window.showInformationMessage(`Loaded: ${selected.label}`);
      }
    })
  );

  // Command: Delete Chat Session
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.chat.deleteSession', async () => {
      const storage = getChatHistoryStorage(context);
      const sessions = await storage.listSessions();

      if (sessions.length === 0) {
        vscode.window.showInformationMessage('No chat history found');
        return;
      }

      const items = sessions.map((session) => ({
        label: session.title,
        description: new Date(session.updatedAt).toLocaleString(),
        detail: `${session.messages.length} messages`,
        sessionId: session.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a chat session to delete',
      });

      if (selected) {
        const confirm = await vscode.window.showWarningMessage(
          `Delete "${selected.label}"?`,
          { modal: true },
          'Delete'
        );

        if (confirm === 'Delete') {
          await storage.deleteSession(selected.sessionId);
          vscode.window.showInformationMessage('Session deleted');
        }
      }
    })
  );

  // Command: Export Chat Session
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.chat.exportSession', async () => {
      const controller = getChatController(context);
      const sessionId = controller.getSessionId();
      const storage = getChatHistoryStorage(context);
      const session = await storage.loadSession(sessionId);

      if (!session) {
        vscode.window.showErrorMessage('No active session to export');
        return;
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${session.title}.json`),
        filters: {
          'JSON': ['json'],
          'Markdown': ['md'],
        },
      });

      if (uri) {
        const ext = uri.fsPath.endsWith('.md') ? 'md' : 'json';
        let content: string;

        if (ext === 'md') {
          content = exportToMarkdown(session);
        } else {
          content = JSON.stringify(session, null, 2);
        }

        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
      }
    })
  );
}

/**
 * Export session to Markdown format
 */
function exportToMarkdown(session: any): string {
  let md = `# ${session.title}\n\n`;
  md += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
  md += `**Updated:** ${new Date(session.updatedAt).toLocaleString()}\n\n`;
  md += `---\n\n`;

  for (const msg of session.messages) {
    const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    md += `## ${role} (${time})\n\n`;
    md += `${msg.content}\n\n`;
  }

  return md;
}
