import * as vscode from 'vscode';
import { TokenPair } from './types/auth';

/**
 * Secure token storage using VS Code SecretStorage API
 */
export class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'miaoda.auth.accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'miaoda.auth.refreshToken';
  private static readonly EXPIRES_IN_KEY = 'miaoda.auth.expiresIn';
  private static readonly LAST_REFRESH_KEY = 'miaoda.auth.lastRefresh';

  constructor(private readonly secrets: vscode.SecretStorage) {}

  async saveTokens(tokens: TokenPair): Promise<void> {
    await Promise.all([
      this.secrets.store(TokenStorage.ACCESS_TOKEN_KEY, tokens.accessToken),
      this.secrets.store(TokenStorage.REFRESH_TOKEN_KEY, tokens.refreshToken),
      this.secrets.store(TokenStorage.EXPIRES_IN_KEY, tokens.expiresIn.toString()),
      this.secrets.store(TokenStorage.LAST_REFRESH_KEY, Date.now().toString())
    ]);
  }

  async getTokens(): Promise<TokenPair | null> {
    const [accessToken, refreshToken, expiresIn] = await Promise.all([
      this.secrets.get(TokenStorage.ACCESS_TOKEN_KEY),
      this.secrets.get(TokenStorage.REFRESH_TOKEN_KEY),
      this.secrets.get(TokenStorage.EXPIRES_IN_KEY)
    ]);

    if (!accessToken || !refreshToken || !expiresIn) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(expiresIn, 10),
      tokenType: 'Bearer'
    };
  }

  async getAccessToken(): Promise<string | null> {
    return await this.secrets.get(TokenStorage.ACCESS_TOKEN_KEY) || null;
  }

  async getRefreshToken(): Promise<string | null> {
    return await this.secrets.get(TokenStorage.REFRESH_TOKEN_KEY) || null;
  }

  async getLastRefreshTime(): Promise<number | null> {
    const lastRefresh = await this.secrets.get(TokenStorage.LAST_REFRESH_KEY);
    return lastRefresh ? parseInt(lastRefresh, 10) : null;
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      this.secrets.delete(TokenStorage.ACCESS_TOKEN_KEY),
      this.secrets.delete(TokenStorage.REFRESH_TOKEN_KEY),
      this.secrets.delete(TokenStorage.EXPIRES_IN_KEY),
      this.secrets.delete(TokenStorage.LAST_REFRESH_KEY)
    ]);
  }

  /**
   * Check if access token is expired or will expire soon (within 2 minutes)
   */
  async isTokenExpired(): Promise<boolean> {
    const [lastRefresh, expiresIn] = await Promise.all([
      this.getLastRefreshTime(),
      this.secrets.get(TokenStorage.EXPIRES_IN_KEY)
    ]);

    if (!lastRefresh || !expiresIn) {
      return true;
    }

    const expiresInMs = parseInt(expiresIn, 10) * 1000;
    const expiryTime = lastRefresh + expiresInMs;
    const now = Date.now();
    const bufferTime = 2 * 60 * 1000; // 2 minutes

    return now >= (expiryTime - bufferTime);
  }
}
