-- Move prep_time_minutes and cleanup_time_minutes from rooms to machines table
-- Add columns to machines table
ALTER TABLE machines ADD COLUMN prep_time_minutes INTEGER DEFAULT 15;
ALTER TABLE machines ADD COLUMN cleanup_time_minutes INTEGER DEFAULT 15;

-- Remove columns from rooms table (optional - keeping for backward compatibility)
-- ALTER TABLE rooms DROP COLUMN prep_time_minutes;
-- ALTER TABLE rooms DROP COLUMN cleanup_time_minutes;
