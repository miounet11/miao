import * as vscode from 'vscode';
import { AuthState } from './types/auth';

/**
 * Status bar item for authentication status
 */
export class AuthStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'miaoda.auth.showStatus';
    this.updateLoggedOut();
    this.statusBarItem.show();
  }

  updateAuthState(state: AuthState): void {
    if (state.isAuthenticated && state.user) {
      this.updateLoggedIn(state.user.email, state.user.plan);
    } else {
      this.updateLoggedOut();
    }
  }

  private updateLoggedIn(email: string, plan: string): void {
    this.statusBarItem.text = `$(account) ${email}`;
    this.statusBarItem.tooltip = `Logged in as ${email}\nPlan: ${plan}\nClick for options`;
    this.statusBarItem.backgroundColor = undefined;
  }

  private updateLoggedOut(): void {
    this.statusBarItem.text = '$(account) Not logged in';
    this.statusBarItem.tooltip = 'Click to login';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
