-- Create booking_procedures table for multiple procedures support
CREATE TABLE IF NOT EXISTS booking_procedures (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  procedure_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_procedures_booking ON booking_procedures(booking_id);
