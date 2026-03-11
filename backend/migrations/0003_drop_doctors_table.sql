-- Drop doctors table as we now use users table with role='DOCTOR' instead
DROP TABLE IF EXISTS doctors;

-- Remove index that referenced doctors table
DROP INDEX IF EXISTS idx_bookings_doctor;

-- Recreate the index for bookings.doctor_id (now references users table)
CREATE INDEX IF NOT EXISTS idx_bookings_doctor ON bookings(doctor_id);
