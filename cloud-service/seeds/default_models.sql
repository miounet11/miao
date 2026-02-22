-- Seed data for default model configurations

-- Free tier models (Ollama, DeepSeek)
INSERT OR IGNORE INTO model_configs (provider, model, api_url, membership_required, enabled) VALUES
  ('ollama', 'llama2', 'http://localhost:11434', 'free', 1),
  ('ollama', 'codellama', 'http://localhost:11434', 'free', 1),
  ('ollama', 'mistral', 'http://localhost:11434', 'free', 1),
  ('deepseek', 'deepseek-coder', 'https://api.deepseek.com', 'free', 1),
  ('deepseek', 'deepseek-chat', 'https://api.deepseek.com', 'free', 1);

-- Pro tier models (OpenAI, Anthropic)
INSERT OR IGNORE INTO model_configs (provider, model, api_url, membership_required, enabled) VALUES
  ('openai', 'gpt-4', 'https://api.openai.com/v1', 'pro', 1),
  ('openai', 'gpt-4-turbo', 'https://api.openai.com/v1', 'pro', 1),
  ('openai', 'gpt-3.5-turbo', 'https://api.openai.com/v1', 'pro', 1),
  ('anthropic', 'claude-opus-4', 'https://api.anthropic.com/v1', 'pro', 1),
  ('anthropic', 'claude-sonnet-4', 'https://api.anthropic.com/v1', 'pro', 1),
  ('anthropic', 'claude-haiku-4', 'https://api.anthropic.com/v1', 'pro', 1);

-- Enterprise tier models (Custom deployments)
INSERT OR IGNORE INTO model_configs (provider, model, api_url, membership_required, enabled) VALUES
  ('azure-openai', 'gpt-4-32k', 'https://your-resource.openai.azure.com', 'enterprise', 1),
  ('aws-bedrock', 'claude-v2', 'https://bedrock.us-east-1.amazonaws.com', 'enterprise', 1),
  ('google', 'gemini-pro', 'https://generativelanguage.googleapis.com', 'enterprise', 1);

-- Create a demo user (password: demo123456)
-- Password hash for 'demo123456' using bcrypt
INSERT OR IGNORE INTO users (email, password_hash, membership) VALUES
  ('demo@miaoda.com', '$2b$10$rKZLvXz5JQZ5X5X5X5X5XeN5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'free');
