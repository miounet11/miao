/**
 * Public API for auth-service extension
 * Other extensions can import this to get type definitions
 */

import { AuthManager } from './auth-manager';
import { AuthState, UserInfo, TokenPair } from './types/auth';

export interface AuthServiceAPI {
  /**
   * Get the auth manager instance
   */
  getAuthManager(): AuthManager;

  /**
   * Get current access token (auto-refreshes if needed)
   */
  getAccessToken(): Promise<string | null>;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Get current auth state
   */
  getAuthState(): AuthState;
}

export { AuthState, UserInfo, TokenPair };
