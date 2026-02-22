import fs from 'fs';
import path from 'path';
import { initDatabase, getDatabase } from '../src/config/database';
import { logger } from '../src/middleware/logger';

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Initialize database
    initDatabase();
    const db = getDatabase();

    // Get migrations directory
    const migrationsDir = path.join(__dirname, '../migrations');

    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('No migrations directory found');
      return;
    }

    // Get all SQL files
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.warn('No migration files found');
      return;
    }

    // Run each migration
    for (const file of files) {
      logger.info(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute migration
      db.exec(sql);
      logger.info(`✅ Migration completed: ${file}`);
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error });
    process.exit(1);
  }
}

// Run migrations
runMigrations();
