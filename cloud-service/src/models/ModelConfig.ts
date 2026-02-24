import { db } from '../config/database';

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
  static async create(input: ModelConfigCreateInput): Promise<ModelConfig> {
    const { rows } = await db().query(
      `INSERT INTO model_configs (provider, model, api_url, membership_required, enabled)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.provider,
        input.model,
        input.api_url,
        input.membership_required || 'free',
        input.enabled !== undefined ? input.enabled : true
      ]
    );
    return this.mapRow(rows[0]);
  }

  /**
   * Find model config by ID
   */
  static async findById(id: number): Promise<ModelConfig | null> {
    const { rows } = await db().query('SELECT * FROM model_configs WHERE id = $1', [id]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Get all model configs
   */
  static async findAll(): Promise<ModelConfig[]> {
    const { rows } = await db().query('SELECT * FROM model_configs WHERE enabled = true');
    return rows.map(this.mapRow);
  }

  /**
   * Get model configs by membership tier
   */
  static async findByMembership(
    membership: 'free' | 'pro' | 'enterprise'
  ): Promise<ModelConfig[]> {
    const membershipHierarchy: Record<string, string[]> = {
      free: ['free'],
      pro: ['free', 'pro'],
      enterprise: ['free', 'pro', 'enterprise'],
    };

    const allowedTiers = membershipHierarchy[membership];
    const { rows } = await db().query(
      `SELECT * FROM model_configs
       WHERE enabled = true
       AND membership_required = ANY($1)
       ORDER BY membership_required, provider, model`,
      [allowedTiers]
    );
    return rows.map(this.mapRow);
  }

  /**
   * Update model config
   */
  static async update(
    id: number,
    updates: Partial<ModelConfigCreateInput>
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.provider !== undefined) {
      fields.push(`provider = $${paramIndex++}`);
      values.push(updates.provider);
    }
    if (updates.model !== undefined) {
      fields.push(`model = $${paramIndex++}`);
      values.push(updates.model);
    }
    if (updates.api_url !== undefined) {
      fields.push(`api_url = $${paramIndex++}`);
      values.push(updates.api_url);
    }
    if (updates.membership_required !== undefined) {
      fields.push(`membership_required = $${paramIndex++}`);
      values.push(updates.membership_required);
    }
    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const { rowCount } = await db().query(
      `UPDATE model_configs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    return rowCount! > 0;
  }

  /**
   * Delete model config
   */
  static async delete(id: number): Promise<boolean> {
    const { rowCount } = await db().query('DELETE FROM model_configs WHERE id = $1', [id]);
    return rowCount! > 0;
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
