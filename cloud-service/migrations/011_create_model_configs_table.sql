-- 模型配置表（系统级别）
CREATE TABLE model_configs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  api_url TEXT NOT NULL,
  membership_required VARCHAR(20) NOT NULL DEFAULT 'free',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, model)
);

CREATE INDEX idx_model_configs_membership ON model_configs(membership_required, enabled);
