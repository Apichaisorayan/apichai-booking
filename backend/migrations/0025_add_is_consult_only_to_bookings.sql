-- Add is_consult_only column to bookings table
ALTER TABLE bookings ADD COLUMN is_consult_only INTEGER DEFAULT 0;

-- Add index for is_consult_only
CREATE INDEX IF NOT EXISTS idx_bookings_consult_only ON bookings(is_consult_only);
