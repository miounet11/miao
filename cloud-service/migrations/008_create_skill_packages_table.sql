-- Create skill packages table
CREATE TABLE IF NOT EXISTS skill_packages (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL,
  package_url TEXT NOT NULL,
  package_hash VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'blocked')),
  download_count INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, version)
);

CREATE INDEX idx_skill_packages_author_id ON skill_packages(author_id);
CREATE INDEX idx_skill_packages_status ON skill_packages(status);
CREATE INDEX idx_skill_packages_name ON skill_packages(name);
CREATE INDEX idx_skill_packages_rating ON skill_packages(rating DESC);
