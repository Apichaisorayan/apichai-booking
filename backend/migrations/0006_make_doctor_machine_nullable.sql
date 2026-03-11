-- Make doctor_id and machine_id nullable for meeting bookings
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create new bookings table with nullable doctor_id and machine_id
CREATE TABLE IF NOT EXISTS bookings_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  doctor_id TEXT,
  machine_id TEXT,
  room_id TEXT NOT NULL,
  user_id TEXT,
  patient_name TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
  notes TEXT,
  google_event_id TEXT,
  booking_type TEXT DEFAULT 'PROCEDURE' CHECK(booking_type IN ('PROCEDURE', 'MEETING')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Copy data from old table to new table
INSERT INTO bookings_new 
SELECT 
  id, doctor_id, machine_id, room_id, user_id, patient_name, 
  date, start_time, end_time, status, notes, google_event_id,
  COALESCE(booking_type, 'PROCEDURE') as booking_type,
  created_at, updated_at
FROM bookings;

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
CREATE INDEX idx_bookings_google_event_id ON bookings(google_event_id);
CREATE INDEX idx_bookings_booking_type ON bookings(booking_type);
