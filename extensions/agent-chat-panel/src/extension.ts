import * as vscode from 'vscode';
import { registerChatCommands } from './commands';
import { getChatController } from './ChatController';
import { ChatViewProvider } from './ChatViewProvider';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Agent Chat Panel extension is now active');

  // Initialize chat controller
  getChatController(context);

  // Register webview view provider
  const chatViewProvider = new ChatViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatViewProvider
    )
  );

  // Register all chat commands
  registerChatCommands(context);

  // Legacy commands for backward compatibility
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.chat.open', () => {
      vscode.commands.executeCommand('miaoda.chatPanel.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.chat.clear', async () => {
      const controller = getChatController(context);
      await controller.clearSession();
      vscode.window.showInformationMessage('Chat history cleared');
    })
  );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Agent Chat Panel extension is now deactivated');
}
