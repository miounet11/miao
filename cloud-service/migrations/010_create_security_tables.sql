-- Create login attempts table (for rate limiting)
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);

-- Create security scans table (for skill marketplace)
CREATE TABLE IF NOT EXISTS security_scans (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL REFERENCES skill_packages(id) ON DELETE CASCADE,
  scan_result JSONB,
  issues_found INTEGER DEFAULT 0,
  severity VARCHAR(50) CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_scans_skill_id ON security_scans(skill_id);
CREATE INDEX idx_security_scans_severity ON security_scans(severity);
