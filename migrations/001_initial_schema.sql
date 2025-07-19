-- Jobs table for task queue management
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  data TEXT,
  result TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

-- Main competitive analyses table
CREATE TABLE IF NOT EXISTS competitive_analyses (
  id TEXT PRIMARY KEY,
  industry_id TEXT,
  solution_description TEXT NOT NULL,
  results TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analyses_industry ON competitive_analyses(industry_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created ON competitive_analyses(created_at);

-- Individual competitors tracking
CREATE TABLE IF NOT EXISTS competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT NOT NULL,
  name TEXT NOT NULL,
  relevancy INTEGER CHECK (relevancy >= 1 AND relevancy <= 10),
  details TEXT,
  strategic_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES competitive_analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_competitors_analysis ON competitors(analysis_id);
CREATE INDEX IF NOT EXISTS idx_competitors_relevancy ON competitors(relevancy DESC);
CREATE INDEX IF NOT EXISTS idx_competitors_name ON competitors(name);