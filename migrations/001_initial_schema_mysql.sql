-- Jobs table for task queue management
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  data JSON,
  result JSON,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_type (type),
  INDEX idx_jobs_created (created_at)
);

-- Main competitive analyses table
CREATE TABLE IF NOT EXISTS competitive_analyses (
  id VARCHAR(255) PRIMARY KEY,
  industry_id VARCHAR(255),
  solution_description TEXT NOT NULL,
  results JSON NOT NULL COMMENT 'JSON containing full analysis results',
  metadata JSON COMMENT 'Additional metadata for the analysis',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_analyses_industry (industry_id),
  INDEX idx_analyses_created (created_at DESC)
);

-- Individual competitors tracking
CREATE TABLE IF NOT EXISTS competitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  relevancy INT CHECK (relevancy >= 1 AND relevancy <= 10),
  details JSON COMMENT 'JSON with competitor details',
  strategic_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_competitors_analysis (analysis_id),
  INDEX idx_competitors_relevancy (relevancy DESC),
  INDEX idx_competitors_name (name),
  FOREIGN KEY (analysis_id) REFERENCES competitive_analyses(id) ON DELETE CASCADE
);