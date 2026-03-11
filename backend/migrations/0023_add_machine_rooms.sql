-- Create machine_rooms junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS machine_rooms (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  machine_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  UNIQUE(machine_id, room_id)
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_machine_rooms_machine_id ON machine_rooms(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_rooms_room_id ON machine_rooms(room_id);

-- Migrate existing room_id from machines table to machine_rooms
INSERT INTO machine_rooms (machine_id, room_id)
SELECT id, room_id FROM machines WHERE room_id IS NOT NULL;
