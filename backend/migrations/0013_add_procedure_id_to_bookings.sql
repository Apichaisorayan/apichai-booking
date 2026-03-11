-- Add procedure_id column to bookings table
ALTER TABLE bookings ADD COLUMN procedure_id TEXT;

-- Add foreign key index
CREATE INDEX IF NOT EXISTS idx_bookings_procedure ON bookings(procedure_id);
