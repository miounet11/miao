import { getDatabase } from '../config/database';

export interface ModelConfig {
  id: number;
  provider: string;
  model: string;
  api_url: string;
  membership_required: 'free' | 'pro' | 'enterprise';
  enabled: boolean;
  created_at: string;
}

export interface ModelConfigCreateInput {
  provider: string;
  model: string;
  api_url: string;
  membership_required?: 'free' | 'pro' | 'enterprise';
  enabled?: boolean;
}

/**
 * ModelConfig model for database operations
 */
export class ModelConfigModel {
  /**
   * Create a new model configuration
   */
  static create(input: ModelConfigCreateInput): ModelConfig {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO model_configs (provider, model, api_url, membership_required, enabled)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.provider,
      input.model,
      input.api_url,
      input.membership_required || 'free',
      input.enabled !== undefined ? (input.enabled ? 1 : 0) : 1
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * Find model config by ID
   */
  static findById(id: number): ModelConfig | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM model_configs WHERE id = ?');
    const result = stmt.get(id) as any;
    return result ? this.mapRow(result) : null;
  }

  /**
   * Get all model configs
   */
  static findAll(): ModelConfig[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM model_configs WHERE enabled = 1');
    const results = stmt.all() as any[];
    return results.map(this.mapRow);
  }

  /**
   * Get model configs by membership tier
   */
  static findByMembership(
    membership: 'free' | 'pro' | 'enterprise'
  ): ModelConfig[] {
    const db = getDatabase();

    // Define membership hierarchy
    const membershipHierarchy: Record<string, string[]> = {
      free: ['free'],
      pro: ['free', 'pro'],
      enterprise: ['free', 'pro', 'enterprise'],
    };

    const allowedTiers = membershipHierarchy[membership];
    const placeholders = allowedTiers.map(() => '?').join(',');

    const stmt = db.prepare(`
      SELECT * FROM model_configs
      WHERE enabled = 1
      AND membership_required IN (${placeholders})
      ORDER BY membership_required, provider, model
    `);

    const results = stmt.all(...allowedTiers) as any[];
    return results.map(this.mapRow);
  }

  /**
   * Update model config
   */
  static update(
    id: number,
    updates: Partial<ModelConfigCreateInput>
  ): boolean {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.provider !== undefined) {
      fields.push('provider = ?');
      values.push(updates.provider);
    }
    if (updates.model !== undefined) {
      fields.push('model = ?');
      values.push(updates.model);
    }
    if (updates.api_url !== undefined) {
      fields.push('api_url = ?');
      values.push(updates.api_url);
    }
    if (updates.membership_required !== undefined) {
      fields.push('membership_required = ?');
      values.push(updates.membership_required);
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const stmt = db.prepare(
      `UPDATE model_configs SET ${fields.join(', ')} WHERE id = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Delete model config
   */
  static delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM model_configs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Map database row to ModelConfig (convert boolean)
   */
  private static mapRow(row: any): ModelConfig {
    return {
      ...row,
      enabled: Boolean(row.enabled),
    };
  }
}
