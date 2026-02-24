import * as vscode from 'vscode';
import { TokenPair } from './types/auth';

/**
 * OAuth authentication handler
 */
export class OAuthHandler {
  private pendingAuth: Map<string, (tokens: TokenPair) => void> = new Map();

  constructor(private readonly apiBaseUrl: string) {}

  async startOAuthFlow(provider: 'github' | 'google' | 'microsoft'): Promise<TokenPair> {
    // Generate state for CSRF protection
    const state = this.generateState();

    // Get OAuth URL from backend
    const authUrl = await this.getOAuthUrl(provider, state);

    // Open browser
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    // Wait for callback
    return new Promise((resolve, reject) => {
      this.pendingAuth.set(state, resolve);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingAuth.has(state)) {
          this.pendingAuth.delete(state);
          reject(new Error('OAuth flow timed out'));
        }
      }, 5 * 60 * 1000);
    });
  }

  async handleOAuthCallback(state: string, code: string): Promise<void> {
    const resolver = this.pendingAuth.get(state);
    if (!resolver) {
      throw new Error('Invalid OAuth state');
    }

    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code);
      resolver(tokens);
      this.pendingAuth.delete(state);
    } catch (error) {
      this.pendingAuth.delete(state);
      throw error;
    }
  }

  private async getOAuthUrl(provider: string, state: string): Promise<string> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/v1/auth/oauth/${provider}?state=${state}`
    );

    if (!response.ok) {
      throw new Error('Failed to get OAuth URL');
    }

    const data = await response.json() as any;
    return data.authUrl;
  }

  private async exchangeCodeForTokens(code: string): Promise<TokenPair> {
    const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/oauth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json() as any;
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      tokenType: 'Bearer'
    };
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}
