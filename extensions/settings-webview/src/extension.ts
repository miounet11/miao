import * as vscode from 'vscode';
import { SettingsViewProvider } from './SettingsViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new SettingsViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'miaoda.settingsPanel',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.settings.open', () => {
      vscode.commands.executeCommand('miaoda.settingsPanel.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.settings.quickSetup', () => {
      vscode.commands.executeCommand('miaoda.settingsPanel.focus');
      provider.showQuickSetup();
    })
  );
}

export function deactivate() {}
