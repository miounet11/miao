/**
 * Authentication types for Miaoda IDE
 */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  tokens: TokenPair | null;
  lastRefresh: number; // timestamp
}

export interface OAuthProvider {
  name: 'github' | 'google' | 'microsoft';
  authUrl: string;
}

export interface AuthError {
  code: 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
}
