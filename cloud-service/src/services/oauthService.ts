import { getPostgresPool } from '../config/database';
import { generateTokenPair, AuthTokenPair } from '../utils/jwt-rs256';
import { UserPublic } from './authService';

/**
 * OAuth provider type
 */
export type OAuthProvider = 'github' | 'google' | 'microsoft';

/**
 * OAuth configuration
 */
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

/**
 * OAuth user info
 */
interface OAuthUserInfo {
  providerId: string;
  email: string;
  name?: string;
}

/**
 * OAuth service
 */
export class OAuthService {
  /**
   * Get OAuth authorization URL
   */
  static getOAuthUrl(provider: OAuthProvider, state: string): string {
    const config = this.getProviderConfig(provider);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state,
      scope: this.getScopes(provider),
      response_type: 'code',
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  static async handleOAuthCallback(
    provider: OAuthProvider,
    code: string
  ): Promise<{ tokens: AuthTokenPair; user: UserPublic }> {
    // Exchange code for access token
    const accessToken = await this.exchangeCodeForToken(provider, code);

    // Get user info from provider
    const userInfo = await this.getUserInfo(provider, accessToken);

    // Find or create user
    const user = await this.findOrCreateUser(provider, userInfo, accessToken);

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      roles: ['user'],
    });

    // Store refresh token
    const pool = getPostgresPool();
    const tokenHash = require('../utils/jwt-rs256').hashRefreshToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    return { tokens, user };
  }

  /**
   * Exchange authorization code for access token
   */
  private static async exchangeCodeForToken(
    provider: OAuthProvider,
    code: string
  ): Promise<string> {
    const config = this.getProviderConfig(provider);

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Get user info from OAuth provider
   */
  private static async getUserInfo(
    provider: OAuthProvider,
    accessToken: string
  ): Promise<OAuthUserInfo> {
    const config = this.getProviderConfig(provider);

    const response = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseUserInfo(provider, data);
  }

  /**
   * Parse user info based on provider
   */
  private static parseUserInfo(provider: OAuthProvider, data: any): OAuthUserInfo {
    switch (provider) {
      case 'github':
        return {
          providerId: data.id.toString(),
          email: data.email,
          name: data.name,
        };
      case 'google':
        return {
          providerId: data.sub,
          email: data.email,
          name: data.name,
        };
      case 'microsoft':
        return {
          providerId: data.id,
          email: data.userPrincipalName || data.mail,
          name: data.displayName,
        };
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Find or create user from OAuth info
   */
  private static async findOrCreateUser(
    provider: OAuthProvider,
    userInfo: OAuthUserInfo,
    accessToken: string
  ): Promise<UserPublic> {
    const pool = getPostgresPool();

    // Check if OAuth link exists
    const linkResult = await pool.query(
      `SELECT u.id, u.email, u.plan, u.email_verified, u.created_at
       FROM oauth_links ol
       JOIN users u ON ol.user_id = u.id
       WHERE ol.provider = $1 AND ol.provider_user_id = $2`,
      [provider, userInfo.providerId]
    );

    if (linkResult.rows.length > 0) {
      // Update access token
      await pool.query(
        'UPDATE oauth_links SET access_token = $1, updated_at = NOW() WHERE provider = $2 AND provider_user_id = $3',
        [accessToken, provider, userInfo.providerId]
      );

      return this.toPublic(linkResult.rows[0]);
    }

    // Check if user exists by email
    const userResult = await pool.query(
      'SELECT id, email, plan, email_verified, created_at FROM users WHERE email = $1',
      [userInfo.email]
    );

    let userId: number;

    if (userResult.rows.length > 0) {
      // Link existing user
      userId = userResult.rows[0].id;
    } else {
      // Create new user
      const newUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, plan, email_verified)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userInfo.email, '', 'free', true] // OAuth users are auto-verified
      );
      userId = newUserResult.rows[0].id;

      // Generate license key
      const licenseKey = this.generateLicenseKey();
      await pool.query(
        'INSERT INTO licenses (user_id, license_key, plan, max_devices) VALUES ($1, $2, $3, $4)',
        [userId, licenseKey, 'free', 1]
      );
    }

    // Create OAuth link
    await pool.query(
      `INSERT INTO oauth_links (user_id, provider, provider_user_id, access_token)
       VALUES ($1, $2, $3, $4)`,
      [userId, provider, userInfo.providerId, accessToken]
    );

    // Fetch and return user
    const finalUserResult = await pool.query(
      'SELECT id, email, plan, email_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    return this.toPublic(finalUserResult.rows[0]);
  }

  /**
   * Get provider configuration
   */
  private static getProviderConfig(provider: OAuthProvider): OAuthConfig {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    switch (provider) {
      case 'github':
        return {
          clientId: process.env.GITHUB_CLIENT_ID || '',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
          redirectUri: `${baseUrl}/api/auth/oauth/github/callback`,
          authUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          userInfoUrl: 'https://api.github.com/user',
        };
      case 'google':
        return {
          clientId: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirectUri: `${baseUrl}/api/auth/oauth/google/callback`,
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        };
      case 'microsoft':
        return {
          clientId: process.env.MICROSOFT_CLIENT_ID || '',
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
          redirectUri: `${baseUrl}/api/auth/oauth/microsoft/callback`,
          authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        };
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Get OAuth scopes for provider
   */
  private static getScopes(provider: OAuthProvider): string {
    switch (provider) {
      case 'github':
        return 'user:email';
      case 'google':
        return 'openid email profile';
      case 'microsoft':
        return 'openid email profile';
      default:
        return '';
    }
  }

  /**
   * Generate license key
   */
  private static generateLicenseKey(): string {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      const segment = Math.random().toString(36).substring(2, 6).toUpperCase();
      segments.push(segment);
    }
    return segments.join('-');
  }

  /**
   * Convert to public user format
   */
  private static toPublic(user: any): UserPublic {
    return {
      id: user.id,
      email: user.email,
      plan: user.plan,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
    };
  }
}
