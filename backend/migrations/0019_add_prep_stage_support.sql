-- Add prep stage support for procedures and bookings

-- Add columns to procedures table
ALTER TABLE procedures ADD COLUMN requires_prep_room INTEGER DEFAULT 0;
ALTER TABLE procedures ADD COLUMN prep_duration_minutes INTEGER DEFAULT 0;

-- Add columns to bookings table for prep stage
ALTER TABLE bookings ADD COLUMN prep_room_id TEXT;
ALTER TABLE bookings ADD COLUMN prep_start_time TEXT;
ALTER TABLE bookings ADD COLUMN prep_end_time TEXT;

-- Note: room_type already exists from migration 0018, skipping

-- Add foreign key index for prep_room_id
CREATE INDEX IF NOT EXISTS idx_bookings_prep_room ON bookings(prep_room_id);

-- Update room_type values to match new schema
-- 'PREP' for prep rooms (L1-L4)
-- 'TREATMENT' for treatment rooms (TR)
UPDATE rooms SET room_type = 'PREP' WHERE name LIKE 'L%';
UPDATE rooms SET room_type = 'TREATMENT' WHERE name LIKE 'TR%' OR name LIKE '%Treatment%';
