import { getDatabase } from '../config/database';

export interface UserConfig {
  id: number;
  user_id: number;
  config_json: string;
  updated_at: string;
}

export interface UserConfigData {
  theme?: string;
  fontSize?: number;
  models?: string[];
  customSettings?: Record<string, any>;
  [key: string]: any;
}

/**
 * UserConfig model for database operations
 */
export class UserConfigModel {
  /**
   * Save or update user configuration
   */
  static upsert(userId: number, config: UserConfigData): UserConfig {
    const db = getDatabase();
    const configJson = JSON.stringify(config);

    // Check if config exists
    const existing = this.findByUserId(userId);

    if (existing) {
      // Update existing config
      const stmt = db.prepare(`
        UPDATE user_configs
        SET config_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);
      stmt.run(configJson, userId);
      return this.findByUserId(userId)!;
    } else {
      // Insert new config
      const stmt = db.prepare(`
        INSERT INTO user_configs (user_id, config_json)
        VALUES (?, ?)
      `);
      const result = stmt.run(userId, configJson);
      return this.findById(result.lastInsertRowid as number)!;
    }
  }

  /**
   * Find user config by ID
   */
  static findById(id: number): UserConfig | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM user_configs WHERE id = ?');
    return stmt.get(id) as UserConfig | null;
  }

  /**
   * Find user config by user ID
   */
  static findByUserId(userId: number): UserConfig | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM user_configs WHERE user_id = ?');
    return stmt.get(userId) as UserConfig | null;
  }

  /**
   * Delete user config
   */
  static delete(userId: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM user_configs WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes > 0;
  }

  /**
   * Parse config JSON to object
   */
  static parseConfig(userConfig: UserConfig): UserConfigData {
    try {
      return JSON.parse(userConfig.config_json);
    } catch {
      return {};
    }
  }

  /**
   * Get parsed config by user ID
   */
  static getConfigData(userId: number): UserConfigData | null {
    const userConfig = this.findByUserId(userId);
    if (!userConfig) return null;
    return this.parseConfig(userConfig);
  }
}
