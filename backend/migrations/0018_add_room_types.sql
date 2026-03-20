-- Modify room_type constraint to support PREP type
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new table with updated constraint
CREATE TABLE rooms_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_available INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  room_type TEXT DEFAULT 'TREATMENT' CHECK(room_type IN ('PREP', 'CONSULTATION', 'TREATMENT', 'PROCEDURE', 'MEETING', 'BOTH')),
  prep_time_minutes INTEGER DEFAULT 15,
  cleanup_time_minutes INTEGER DEFAULT 15
);

-- Step 2: Copy data from old table (only existing columns)
INSERT INTO rooms_new (id, name, is_available, created_at, updated_at, room_type) 
SELECT id, name, is_available, created_at, updated_at, room_type FROM rooms;

-- Step 3: Drop old table
DROP TABLE rooms;

-- Step 4: Rename new table
ALTER TABLE rooms_new RENAME TO rooms;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);

-- Step 6: Update L rooms to be PREP type (ห้องฉีดยาชา)
UPDATE rooms SET room_type = 'PREP' WHERE name LIKE 'L%';

-- Step 7: Update CS rooms to be CONSULTATION type (ห้องปรึกษา)
UPDATE rooms SET room_type = 'CONSULTATION' WHERE name LIKE 'CS%';

-- Step 8: Update TR rooms to be TREATMENT type (ห้องทำหัตถการ)
UPDATE rooms SET room_type = 'TREATMENT' WHERE name LIKE 'TR%';
