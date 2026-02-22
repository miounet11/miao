import fs from 'fs';
import path from 'path';
import { initDatabase, getDatabase } from '../src/config/database';
import { logger } from '../src/middleware/logger';

/**
 * Seed database with default data
 */
async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Initialize database
    initDatabase();
    const db = getDatabase();

    // Get seeds directory
    const seedsDir = path.join(__dirname, '../seeds');

    // Check if seeds directory exists
    if (!fs.existsSync(seedsDir)) {
      logger.warn('No seeds directory found');
      return;
    }

    // Get all SQL files
    const files = fs
      .readdirSync(seedsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.warn('No seed files found');
      return;
    }

    // Run each seed file
    for (const file of files) {
      logger.info(`Running seed: ${file}`);
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute seed
      db.exec(sql);
      logger.info(`✅ Seed completed: ${file}`);
    }

    // Display summary
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const modelCount = db.prepare('SELECT COUNT(*) as count FROM model_configs').get() as { count: number };

    logger.info('Database seeding completed successfully');
    logger.info(`📊 Summary:`);
    logger.info(`  - Users: ${userCount.count}`);
    logger.info(`  - Model Configs: ${modelCount.count}`);
  } catch (error) {
    logger.error('Seeding failed', { error });
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
