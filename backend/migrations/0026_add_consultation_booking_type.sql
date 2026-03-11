-- Add CONSULTATION to booking_type constraint
-- SQLite does not support ALTER COLUMN, so we recreate the table

-- Step 1: Create new bookings table with updated constraint
CREATE TABLE bookings_new (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  machine_id TEXT,
  room_id TEXT NOT NULL,
  prep_room_id TEXT,
  user_id TEXT,
  patient_name TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  prep_start_time TEXT,
  prep_end_time TEXT,
  consult_room_id TEXT,
  consult_start_time TEXT,
  consult_end_time TEXT,
  status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
  notes TEXT,
  booking_type TEXT DEFAULT 'PROCEDURE' CHECK(booking_type IN ('PROCEDURE', 'MEETING', 'CONSULTATION')),
  is_consult_only INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Step 2: Copy all existing data
INSERT INTO bookings_new SELECT
  id, doctor_id, machine_id, room_id, prep_room_id,
  user_id, patient_name, date, start_time, end_time,
  prep_start_time, prep_end_time,
  consult_room_id, consult_start_time, consult_end_time,
  status, notes, booking_type,
  is_consult_only,
  created_at, updated_at
FROM bookings;

-- Step 3: Drop old table
DROP TABLE bookings;

-- Step 4: Rename new table
ALTER TABLE bookings_new RENAME TO bookings;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_machine ON bookings(machine_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_consult_only ON bookings(is_consult_only);
CREATE INDEX IF NOT EXISTS idx_bookings_prep_room ON bookings(prep_room_id);
