import * as vscode from 'vscode';
import { TokenStorage } from './token-storage';
import {
  TokenPair,
  UserInfo,
  LoginRequest,
  RegisterRequest,
  AuthState,
  AuthError
} from './types/auth';

/**
 * Core authentication manager
 */
export class AuthManager {
  private tokenStorage: TokenStorage;
  private refreshTimer: NodeJS.Timeout | null = null;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    tokens: null,
    lastRefresh: 0
  };

  private readonly onDidChangeAuthStateEmitter = new vscode.EventEmitter<AuthState>();
  public readonly onDidChangeAuthState = this.onDidChangeAuthStateEmitter.event;

  constructor(
    context: vscode.ExtensionContext,
    private readonly apiBaseUrl: string
  ) {
    this.tokenStorage = new TokenStorage(context.secrets);
  }

  async initialize(): Promise<void> {
    // Try to restore session from stored tokens
    const tokens = await this.tokenStorage.getTokens();
    if (tokens) {
      const isExpired = await this.tokenStorage.isTokenExpired();
      if (isExpired) {
        // Try to refresh
        try {
          await this.refreshAccessToken();
        } catch (error) {
          // Refresh failed, clear tokens
          await this.logout();
        }
      } else {
        // Tokens valid, fetch user info
        try {
          const user = await this.fetchUserInfo(tokens.accessToken);
          this.updateAuthState(true, user, tokens);
          this.startAutoRefresh();
        } catch (error) {
          await this.logout();
        }
      }
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password } as LoginRequest)
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.createAuthError(error);
      }

      const data = await response.json() as any;
      const tokens: TokenPair = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        tokenType: 'Bearer'
      };

      await this.tokenStorage.saveTokens(tokens);

      const user = await this.fetchUserInfo(tokens.accessToken);
      this.updateAuthState(true, user, tokens);
      this.startAutoRefresh();

      vscode.window.showInformationMessage(`Welcome back, ${user.email}!`);
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string, name?: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name } as RegisterRequest)
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.createAuthError(error);
      }

      const data = await response.json() as any;
      const tokens: TokenPair = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        tokenType: 'Bearer'
      };

      await this.tokenStorage.saveTokens(tokens);

      const user = await this.fetchUserInfo(tokens.accessToken);
      this.updateAuthState(true, user, tokens);
      this.startAutoRefresh();

      vscode.window.showInformationMessage(`Account created successfully! Welcome, ${user.email}!`);
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.stopAutoRefresh();
    await this.tokenStorage.clearTokens();
    this.updateAuthState(false, null, null);
    vscode.window.showInformationMessage('Logged out successfully');
  }

  async refreshAccessToken(): Promise<void> {
    const refreshToken = await this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json() as any;
      const tokens: TokenPair = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        tokenType: 'Bearer'
      };

      await this.tokenStorage.saveTokens(tokens);

      const user = await this.fetchUserInfo(tokens.accessToken);
      this.updateAuthState(true, user, tokens);
    } catch (error) {
      // Refresh failed, logout
      await this.logout();
      throw error;
    }
  }

  async getAccessToken(): Promise<string | null> {
    const isExpired = await this.tokenStorage.isTokenExpired();
    if (isExpired) {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        return null;
      }
    }
    return await this.tokenStorage.getAccessToken();
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  private async fetchUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return await response.json() as UserInfo;
  }

  private updateAuthState(isAuthenticated: boolean, user: UserInfo | null, tokens: TokenPair | null): void {
    this.authState = {
      isAuthenticated,
      user,
      tokens,
      lastRefresh: Date.now()
    };
    this.onDidChangeAuthStateEmitter.fire(this.authState);
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    const config = vscode.workspace.getConfiguration('miaoda.auth');
    const autoRefresh = config.get<boolean>('autoRefresh', true);

    if (!autoRefresh) {
      return;
    }

    // Refresh 2 minutes before expiry
    const refreshInterval = (15 * 60 - 2 * 60) * 1000; // 13 minutes

    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('Auto refresh failed:', error);
      }
    }, refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private createAuthError(error: any): AuthError {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message || 'Authentication failed'
    };
  }

  dispose(): void {
    this.stopAutoRefresh();
    this.onDidChangeAuthStateEmitter.dispose();
  }
}
