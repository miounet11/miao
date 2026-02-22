import { getDatabase } from '../config/database';

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
  static create(input: UserCreateInput): User {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, membership)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      input.email,
      input.password_hash,
      input.membership || 'free'
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * Find user by ID
   */
  static findById(id: number): User | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
  }

  /**
   * Find user by email
   */
  static findByEmail(email: string): User | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | null;
  }

  /**
   * Update user membership
   */
  static updateMembership(
    id: number,
    membership: 'free' | 'pro' | 'enterprise'
  ): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE users SET membership = ? WHERE id = ?');
    const result = stmt.run(membership, id);
    return result.changes > 0;
  }

  /**
   * Delete user
   */
  static delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
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
