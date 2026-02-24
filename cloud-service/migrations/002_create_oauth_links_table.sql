-- Create OAuth links table
CREATE TABLE IF NOT EXISTS oauth_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK(provider IN ('github', 'google', 'microsoft')),
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_links_user_id ON oauth_links(user_id);
CREATE INDEX idx_oauth_links_provider ON oauth_links(provider);
