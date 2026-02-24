import { db } from '../config/database';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  membership: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface UserCreateInput {
  email: string;
  password_hash: string;
  membership?: 'free' | 'pro' | 'enterprise';
}

export interface UserPublic {
  id: number;
  email: string;
  membership: string;
  created_at: string;
}

/**
 * User model for database operations
 */
export class UserModel {
  /**
   * Create a new user
   */
  static async create(input: UserCreateInput): Promise<User> {
    const result = await db().query(
      `INSERT INTO users (email, password_hash, membership)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.email, input.password_hash, input.membership || 'free']
    );
    return result.rows[0] as User;
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    const result = await db().query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result = await db().query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Update user membership
   */
  static async updateMembership(
    id: number,
    membership: 'free' | 'pro' | 'enterprise'
  ): Promise<boolean> {
    const result = await db().query(
      'UPDATE users SET membership = $1 WHERE id = $2',
      [membership, id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete user
   */
  static async delete(id: number): Promise<boolean> {
    const result = await db().query('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * Convert user to public format (without password)
   */
  static toPublic(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      membership: user.membership,
      created_at: user.created_at,
    };
  }

  /**
   * Check if email exists
   */
  static emailExists(email: string): boolean {
    return this.findByEmail(email) !== null;
  }
}
