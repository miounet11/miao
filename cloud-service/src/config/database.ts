import Database from 'better-sqlite3';
import { config } from './env';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

/**
 * Initialize database connection
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  const dbPath = path.resolve(config.database.url);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create database connection
  db = new Database(dbPath, {
    verbose: config.isDevelopment ? console.log : undefined,
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Set journal mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Initialize schema if needed
  initSchema(db);

  console.log(`✅ Database connected: ${dbPath}`);

  return db;
}

/**
 * Initialize database schema
 */
function initSchema(database: Database.Database): void {
  // Check if tables exist
  const tables = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'model_configs', 'user_configs')"
    )
    .all();

  if (tables.length === 3) {
    return; // Schema already exists
  }

  console.log('📦 Initializing database schema...');

  // Create users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      membership TEXT DEFAULT 'free' CHECK(membership IN ('free', 'pro', 'enterprise')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create model_configs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS model_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      api_url TEXT NOT NULL,
      membership_required TEXT DEFAULT 'free' CHECK(membership_required IN ('free', 'pro', 'enterprise')),
      enabled BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, model)
    );
  `);

  // Create user_configs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      config_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    );
  `);

  // Create indexes for better performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_model_configs_membership ON model_configs(membership_required);
    CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
  `);

  console.log('✅ Database schema initialized');
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
}

/**
 * Execute a transaction
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDatabase();
  const txn = database.transaction(fn);
  return txn(database);
}
