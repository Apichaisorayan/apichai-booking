-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN (
    'BOOKING_CREATED',
    'BOOKING_CANCELLED', 
    'BOOKING_UPDATED',
    'BOOKING_REMINDER',
    'USER_CREATED',
    'RESOURCE_UNAVAILABLE',
    'SYSTEM'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id TEXT,
  related_type TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);
