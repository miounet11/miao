import * as vscode from 'vscode';
import { AuthManager } from './auth-manager';
import { OAuthHandler } from './oauth-handler';
import { AuthStatusBar } from './status-bar';
import { LoginPanel } from './webview/login-panel';

let authManager: AuthManager;
let oauthHandler: OAuthHandler;
let statusBar: AuthStatusBar;
let loginPanel: LoginPanel;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Auth Service extension activated');

  // Get API base URL from config
  const config = vscode.workspace.getConfiguration('miaoda.auth');
  const apiBaseUrl = config.get<string>('apiBaseUrl', 'https://api.miaoda.com');

  // Initialize services
  authManager = new AuthManager(context, apiBaseUrl);
  oauthHandler = new OAuthHandler(apiBaseUrl);
  statusBar = new AuthStatusBar();
  loginPanel = new LoginPanel(context, authManager, oauthHandler);

  // Initialize auth state
  await authManager.initialize();

  // Update status bar on auth state change
  authManager.onDidChangeAuthState((state) => {
    statusBar.updateAuthState(state);
  });

  // Update status bar with current state
  statusBar.updateAuthState(authManager.getAuthState());

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.auth.login', () => {
      loginPanel.show();
    }),

    vscode.commands.registerCommand('miaoda.auth.logout', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to logout?',
        'Yes',
        'No'
      );
      if (confirm === 'Yes') {
        await authManager.logout();
      }
    }),

    vscode.commands.registerCommand('miaoda.auth.showStatus', async () => {
      const state = authManager.getAuthState();
      if (state.isAuthenticated && state.user) {
        const action = await vscode.window.showQuickPick(
          ['View Profile', 'Logout'],
          { placeHolder: `Logged in as ${state.user.email}` }
        );

        if (action === 'Logout') {
          await vscode.commands.executeCommand('miaoda.auth.logout');
        } else if (action === 'View Profile') {
          vscode.window.showInformationMessage(
            `Email: ${state.user.email}\nPlan: ${state.user.plan}`
          );
        }
      } else {
        const action = await vscode.window.showQuickPick(
          ['Login', 'Register'],
          { placeHolder: 'Not logged in' }
        );

        if (action === 'Login' || action === 'Register') {
          loginPanel.show();
        }
      }
    })
  );

  // Export auth manager for other extensions
  return {
    getAuthManager: () => authManager,
    getAccessToken: () => authManager.getAccessToken(),
    isAuthenticated: () => authManager.isAuthenticated(),
    getAuthState: () => authManager.getAuthState()
  };
}

export function deactivate() {
  authManager?.dispose();
  statusBar?.dispose();
}
