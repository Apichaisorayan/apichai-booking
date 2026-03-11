-- Add CONSULTATION room type support

-- Step 1: Create new table with CONSULTATION support
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

-- Step 2: Copy existing data
INSERT INTO rooms_new SELECT * FROM rooms;

-- Step 3: Drop old table
DROP TABLE rooms;

-- Step 4: Rename new table
ALTER TABLE rooms_new RENAME TO rooms;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);

-- Step 6: Insert CS rooms if they don't exist
INSERT OR IGNORE INTO rooms (id, name, is_available, room_type) 
VALUES 
  (lower(hex(randomblob(16))), 'CS1', 1, 'CONSULTATION'),
  (lower(hex(randomblob(16))), 'CS2', 1, 'CONSULTATION');
