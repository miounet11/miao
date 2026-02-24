import { getPostgresPool, getRedisClient } from '../config/database';
import bcrypt from 'bcrypt';
import {
  generateTokenPair,
  verifyToken,
  hashRefreshToken,
  TokenPayload,
  AuthTokenPair,
} from '../utils/jwt-rs256';

export interface LoginResult {
  tokens: AuthTokenPair;
  user: UserPublic;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface UserPublic {
  id: number;
  email: string;
  plan: string;
  emailVerified: boolean;
  createdAt: Date;
}

/**
 * Authentication service with RS256 JWT
 */
export class AuthService {
  private static readonly BCRYPT_ROUNDS = 12;
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds

  /**
   * Register a new user
   */
  static async register(input: RegisterInput): Promise<LoginResult> {
    const pool = getPostgresPool();

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [input.email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password with bcrypt (cost=12)
    const passwordHash = await bcrypt.hash(input.password, this.BCRYPT_ROUNDS);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, plan)
       VALUES ($1, $2, $3)
       RETURNING id, email, plan, email_verified, created_at`,
      [input.email, passwordHash, 'free']
    );

    const user = result.rows[0];

    // Generate license key
    const licenseKey = this.generateLicenseKey();
    await pool.query(
      `INSERT INTO licenses (user_id, license_key, plan, max_devices)
       VALUES ($1, $2, $3, $4)`,
      [user.id, licenseKey, 'free', 1]
    );

    // Generate token pair
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      roles: ['user'],
    });

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // TODO: Send verification email asynchronously

    return {
      tokens,
      user: this.toPublic(user),
    };
  }

  /**
   * Login user
   */
  static async login(email: string, password: string, ipAddress?: string): Promise<LoginResult> {
    const pool = getPostgresPool();
    const redis = getRedisClient();

    // Check account lockout
    const lockoutKey = `lockout:${email}`;
    const isLocked = await redis.get(lockoutKey);
    if (isLocked) {
      throw new Error('Account locked due to too many failed attempts. Try again in 15 minutes.');
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, plan, email_verified, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      await this.recordLoginAttempt(email, false, ipAddress);
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await this.recordLoginAttempt(email, false, ipAddress);
      await this.checkAndLockAccount(email);
      throw new Error('Invalid email or password');
    }

    // Record successful login
    await this.recordLoginAttempt(email, true, ipAddress);

    // Generate token pair
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      roles: ['user'],
    });

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      tokens,
      user: this.toPublic(user),
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokenPair> {
    const pool = getPostgresPool();

    // Verify refresh token
    let payload: TokenPayload;
    try {
      payload = verifyToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }

    // Check if refresh token exists and not revoked
    const tokenHash = hashRefreshToken(refreshToken);
    const result = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()',
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new Error('Refresh token revoked or expired');
    }

    // Generate new token pair
    const tokens = generateTokenPair(payload);

    // Store new refresh token
    await this.storeRefreshToken(payload.userId, tokens.refreshToken);

    return tokens;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllTokens(userId: number): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
      [userId]
    );
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const pool = getPostgresPool();
    const redis = getRedisClient();

    // Check if user exists
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return;
    }

    const userId = result.rows[0].id;

    // Generate reset token
    const resetToken = this.generateResetToken();
    const resetTokenHash = hashRefreshToken(resetToken);

    // Store reset token in Redis (expires in 1 hour)
    await redis.setex(`reset:${resetTokenHash}`, 3600, userId.toString());

    // TODO: Send reset email with token
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Reset password
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const pool = getPostgresPool();
    const redis = getRedisClient();

    // Verify reset token
    const resetTokenHash = hashRefreshToken(resetToken);
    const userId = await redis.get(`reset:${resetTokenHash}`);

    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, parseInt(userId, 10)]
    );

    // Revoke all refresh tokens
    await this.revokeAllTokens(parseInt(userId, 10));

    // Delete reset token
    await redis.del(`reset:${resetTokenHash}`);
  }

  /**
   * Store refresh token
   */
  private static async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const pool = getPostgresPool();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
  }

  /**
   * Record login attempt
   */
  private static async recordLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
      [email, ipAddress, success]
    );
  }

  /**
   * Check failed login attempts and lock account if needed
   */
  private static async checkAndLockAccount(email: string): Promise<void> {
    const pool = getPostgresPool();
    const redis = getRedisClient();

    // Count failed attempts in last 15 minutes
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE email = $1 AND success = FALSE AND created_at > NOW() - INTERVAL '15 minutes'`,
      [email]
    );

    const failedAttempts = parseInt(result.rows[0].count, 10);

    if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      // Lock account for 15 minutes
      await redis.setex(`lockout:${email}`, this.LOCKOUT_DURATION, '1');
    }
  }

  /**
   * Generate license key (XXXX-XXXX-XXXX-XXXX)
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
   * Generate password reset token
   */
  private static generateResetToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Convert user to public format
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
