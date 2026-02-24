-- Seed data for default model configurations

-- Free tier models (Ollama, DeepSeek)
INSERT INTO model_configs (provider, model, api_url, membership_required, enabled) VALUES
  ('ollama', 'llama2', 'http://localhost:11434', 'free', true),
  ('ollama', 'codellama', 'http://localhost:11434', 'free', true),
  ('ollama', 'mistral', 'http://localhost:11434', 'free', true),
  ('deepseek', 'deepseek-coder', 'https://api.deepseek.com', 'free', true),
  ('deepseek', 'deepseek-chat', 'https://api.deepseek.com', 'free', true)
ON CONFLICT (provider, model) DO NOTHING;

-- Pro tier models (OpenAI, Anthropic)
INSERT INTO model_configs (provider, model, api_url, membership_required, enabled) VALUES
  ('openai', 'gpt-4', 'https://api.openai.com/v1', 'pro', true),
  ('openai', 'gpt-4-turbo', 'https://api.openai.com/v1', 'pro', true),
  ('openai', 'gpt-3.5-turbo', 'https://api.openai.com/v1', 'pro', true),
  ('anthropic', 'claude-opus-4', 'https://api.anthropic.com/v1', 'pro', true),
  ('anthropic', 'claude-sonnet-4', 'https://api.anthropic.com/v1', 'pro', true),
  ('anthropic', 'claude-haiku-4', 'https://api.anthropic.com/v1', 'pro', true)
ON CONFLICT (provider, model) DO NOTHING;

-- Enterprise tier models (Custom deployments)
INSERT INTO model_configs (provider, model, api_url, membership_required, enabled) VALUES
  ('azure-openai', 'gpt-4-32k', 'https://your-resource.openai.azure.com', 'enterprise', true),
  ('aws-bedrock', 'claude-v2', 'https://bedrock.us-east-1.amazonaws.com', 'enterprise', true),
  ('google', 'gemini-pro', 'https://generativelanguage.googleapis.com', 'enterprise', true)
ON CONFLICT (provider, model) DO NOTHING;
