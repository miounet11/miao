-- Miaoda Cloud Service Database Schema

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  device_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 额度表
CREATE TABLE quota (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  free_quota_used INT DEFAULT 0,
  paid_quota_used INT DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- 使用记录表
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  model_id VARCHAR(100) NOT NULL,
  quota_used INT NOT NULL,
  tokens_used INT DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 模型配置表
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  api_url TEXT,
  api_key_encrypted TEXT,
  model VARCHAR(100) NOT NULL,
  cost_per_request INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_quota_user_date ON quota(user_id, date);
CREATE INDEX idx_usage_user_timestamp ON usage(user_id, timestamp);
CREATE INDEX idx_models_user ON models(user_id);
