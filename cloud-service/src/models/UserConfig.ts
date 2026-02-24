import { db } from '../config/database';

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
  static async upsert(userId: number, config: UserConfigData): Promise<UserConfig> {
    const configJson = JSON.stringify(config);
    const result = await db().query(
      `INSERT INTO user_configs (user_id, config_json)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET config_json = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, configJson]
    );
    return result.rows[0] as UserConfig;
  }

  /**
   * Find user config by ID
   */
  static async findById(id: number): Promise<UserConfig | null> {
    const result = await db().query('SELECT * FROM user_configs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user config by user ID
   */
  static async findByUserId(userId: number): Promise<UserConfig | null> {
    const result = await db().query('SELECT * FROM user_configs WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  /**
   * Delete user config
   */
  static async delete(userId: number): Promise<boolean> {
    const result = await db().query('DELETE FROM user_configs WHERE user_id = $1', [userId]);
    return result.rowCount > 0;
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
  static async getConfigData(userId: number): Promise<UserConfigData | null> {
    const userConfig = await this.findByUserId(userId);
    if (!userConfig) return null;
    return this.parseConfig(userConfig);
  }
}
