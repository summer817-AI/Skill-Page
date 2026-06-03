CREATE TABLE IF NOT EXISTS source_click_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  referer TEXT,
  country TEXT
);

CREATE TABLE IF NOT EXISTS author_source_clicks (
  author TEXT PRIMARY KEY,
  source_clicks INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_click_events_author_created
ON source_click_events(author, created_at);
