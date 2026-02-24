-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_key VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL CHECK(plan IN ('free', 'pro', 'business')),
  max_devices INTEGER DEFAULT 1,
  features JSONB DEFAULT '[]',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
