-- Create device bindings table
CREATE TABLE IF NOT EXISTS device_bindings (
  id SERIAL PRIMARY KEY,
  license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(license_id, device_fingerprint)
);

CREATE INDEX idx_device_bindings_license_id ON device_bindings(license_id);
CREATE INDEX idx_device_bindings_device_fingerprint ON device_bindings(device_fingerprint);
