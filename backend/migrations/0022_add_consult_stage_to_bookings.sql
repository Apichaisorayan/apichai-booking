-- Add consultation stage support to bookings
ALTER TABLE bookings ADD COLUMN consult_room_id TEXT;
ALTER TABLE bookings ADD COLUMN consult_start_time TEXT;
ALTER TABLE bookings ADD COLUMN consult_end_time TEXT;

-- Add index for consult_room_id
CREATE INDEX IF NOT EXISTS idx_bookings_consult_room ON bookings(consult_room_id);
