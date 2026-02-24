-- Create skill reviews table
CREATE TABLE IF NOT EXISTS skill_reviews (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL REFERENCES skill_packages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(skill_id, user_id)
);

CREATE INDEX idx_skill_reviews_skill_id ON skill_reviews(skill_id);
CREATE INDEX idx_skill_reviews_user_id ON skill_reviews(user_id);
CREATE INDEX idx_skill_reviews_rating ON skill_reviews(rating);
