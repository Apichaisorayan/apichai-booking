-- Remove procedure_id column from bookings table
-- Use booking_procedures junction table for many-to-many relationship only

-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- Step 1: Create new bookings table without procedure_id
CREATE TABLE bookings_new (
  id TEXT PRIMARY KEY,
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
  booking_type TEXT DEFAULT 'PROCEDURE' CHECK(booking_type IN ('PROCEDURE', 'MEETING')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Step 2: Copy data from old table to new table
INSERT INTO bookings_new (id, doctor_id, machine_id, room_id, user_id, patient_name, date, start_time, end_time, status, notes, booking_type, created_at, updated_at)
SELECT id, doctor_id, machine_id, room_id, user_id, patient_name, date, start_time, end_time, status, notes, booking_type, created_at, updated_at
FROM bookings;

-- Step 3: Migrate procedure_id to booking_procedures if not already there
INSERT INTO booking_procedures (id, booking_id, procedure_id)
SELECT 
  lower(hex(randomblob(16))),
  b.id,
  b.procedure_id
FROM bookings b
WHERE b.procedure_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM booking_procedures bp 
    WHERE bp.booking_id = b.id AND bp.procedure_id = b.procedure_id
  );

-- Step 4: Drop old table
DROP TABLE bookings;

-- Step 5: Rename new table
ALTER TABLE bookings_new RENAME TO bookings;

-- Step 6: Recreate indexes
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX idx_bookings_machine ON bookings(machine_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_booking_type ON bookings(booking_type);
