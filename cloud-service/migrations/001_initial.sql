-- Initial database schema for Miaoda Cloud Service

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  membership TEXT DEFAULT 'free' CHECK(membership IN ('free', 'pro', 'enterprise')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Model configurations table
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

-- User configurations table
CREATE TABLE IF NOT EXISTS user_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_model_configs_membership ON model_configs(membership_required);
CREATE INDEX IF NOT EXISTS idx_model_configs_enabled ON model_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
