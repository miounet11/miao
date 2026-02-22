import * as vscode from 'vscode';
import { LanguageSelector } from './languageSelector';

export function activate(context: vscode.ExtensionContext) {
    const languageSelector = new LanguageSelector(context);

    // Show language selector on first startup
    const config = vscode.workspace.getConfiguration('miaoda.welcome');
    const hasSelectedLanguage = config.get<boolean>('languageSelected', false);

    if (!hasSelectedLanguage) {
        // Delay to ensure the workbench is fully loaded
        setTimeout(() => {
            languageSelector.showLanguageSelection();
        }, 1000);
    }

    // Register command to manually show language selector
    const disposable = vscode.commands.registerCommand(
        'miaoda.welcome.showLanguageSelector',
        () => {
            languageSelector.showLanguageSelection();
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}
