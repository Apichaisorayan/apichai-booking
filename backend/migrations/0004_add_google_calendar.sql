-- Add Google Calendar integration fields
ALTER TABLE bookings ADD COLUMN google_event_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_bookings_google_event_id ON bookings(google_event_id);

-- Add table for storing user's Google tokens (optional, for future use)
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_google_tokens_user_id ON user_google_tokens(user_id);
