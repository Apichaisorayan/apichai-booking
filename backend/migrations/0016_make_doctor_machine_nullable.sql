-- Make doctor_id and machine_id nullable for MEETING bookings
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new bookings table with nullable doctor_id and machine_id
CREATE TABLE bookings_temp (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,  -- Now nullable
  machine_id TEXT, -- Now nullable
  room_id TEXT NOT NULL,
  user_id TEXT,
  patient_name TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
  notes TEXT,
  booking_type TEXT DEFAULT 'PROCEDURE' CHECK(booking_type IN ('PROCEDURE', 'MEETING')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Step 2: Copy data from old table
INSERT INTO bookings_temp 
SELECT id, doctor_id, machine_id, room_id, user_id, patient_name, date, start_time, end_time, status, notes, booking_type, created_at, updated_at
FROM bookings;

-- Step 3: Drop old table
DROP TABLE bookings;

-- Step 4: Rename temp table
ALTER TABLE bookings_temp RENAME TO bookings;

-- Step 5: Recreate indexes
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX idx_bookings_machine ON bookings(machine_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_booking_type ON bookings(booking_type);
