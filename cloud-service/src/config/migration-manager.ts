import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { getPostgresPool } from './database';

/**
 * Migration status
 */
export interface MigrationStatus {
  id: number;
  name: string;
  executed_at: Date;
}

/**
 * Migration manager interface
 */
export interface IMigrationManager {
  runPending(): Promise<void>;
  rollback(steps?: number): Promise<void>;
  getStatus(): Promise<MigrationStatus[]>;
}

/**
 * Migration manager implementation
 */
export class MigrationManager implements IMigrationManager {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool, migrationsDir: string) {
    this.pool = pool;
    this.migrationsDir = migrationsDir;
  }

  /**
   * Initialize migrations table
   */
  private async initMigrationsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get list of migration files
   */
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
  }

  /**
   * Get executed migrations
   */
  private async getExecutedMigrations(): Promise<string[]> {
    const result = await this.pool.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY id'
    );
    return result.rows.map((row) => row.name);
  }

  /**
   * Run pending migrations
   */
  async runPending(): Promise<void> {
    await this.initMigrationsTable();

    const allMigrations = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = allMigrations.filter(
      (m) => !executedMigrations.includes(m)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📦 Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log('✅ All migrations completed');
  }

  /**
   * Run a single migration
   */
  private async runMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Execute migration SQL
      await client.query(sql);

      // Record migration
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [filename]
      );

      await client.query('COMMIT');
      console.log(`  ✓ ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${filename} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(steps: number = 1): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const toRollback = executedMigrations.slice(-steps);
    console.log(`Rolling back ${toRollback.length} migrations...`);

    for (const migration of toRollback.reverse()) {
      await this.pool.query(
        'DELETE FROM migrations WHERE name = $1',
        [migration]
      );
      console.log(`  ✓ Rolled back ${migration}`);
    }

    console.log('⚠️  Note: SQL rollback must be done manually');
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationStatus[]> {
    await this.initMigrationsTable();

    const result = await this.pool.query<MigrationStatus>(
      'SELECT id, name, executed_at FROM migrations ORDER BY id'
    );

    return result.rows;
  }
}

/**
 * Create migration manager instance
 */
export function createMigrationManager(): MigrationManager {
  const pool = getPostgresPool();
  const migrationsDir = path.join(__dirname, '../../migrations');
  return new MigrationManager(pool, migrationsDir);
}

/**
 * SQLite to PostgreSQL data migration utility
 */
export async function migrateSQLiteToPostgres(
  sqlitePath: string
): Promise<void> {
  console.log('📦 Starting SQLite → PostgreSQL migration...');
  console.log('⚠️  This is a placeholder. Implement actual data migration logic.');
  console.log(`   SQLite DB: ${sqlitePath}`);

  // TODO: Implement actual data migration
  // 1. Connect to SQLite database
  // 2. Read data from SQLite tables
  // 3. Transform data format (INTEGER → SERIAL, etc.)
  // 4. Insert into PostgreSQL tables
  // 5. Verify data integrity

  console.log('✅ Migration completed (placeholder)');
}
