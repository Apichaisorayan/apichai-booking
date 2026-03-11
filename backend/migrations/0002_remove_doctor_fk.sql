-- Remove foreign key constraint from bookings table
-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table

-- Create new bookings table without doctor foreign key
CREATE TABLE IF NOT EXISTS bookings_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  doctor_id TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  user_id TEXT,
  patient_name TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Copy data from old table to new table
INSERT INTO bookings_new 
SELECT * FROM bookings;

-- Drop old table
DROP TABLE bookings;

-- Rename new table to bookings
ALTER TABLE bookings_new RENAME TO bookings;

-- Recreate indexes
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX idx_bookings_machine ON bookings(machine_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
