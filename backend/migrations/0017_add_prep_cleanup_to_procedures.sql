-- Add prep and cleanup time to procedures table
-- This allows procedures to have preparation phase (e.g., applying anesthesia)
-- that uses different resources than the main treatment

ALTER TABLE procedures ADD COLUMN prep_time_minutes INTEGER DEFAULT 0;
ALTER TABLE procedures ADD COLUMN cleanup_time_minutes INTEGER DEFAULT 0;
ALTER TABLE procedures ADD COLUMN prep_room_type TEXT; -- 'PREP' for L1-L4 rooms
ALTER TABLE procedures ADD COLUMN requires_anesthesia INTEGER DEFAULT 0;

-- Update existing Ultherapy procedures to have prep time
UPDATE procedures 
SET prep_time_minutes = 60,
    prep_room_type = 'PREP',
    requires_anesthesia = 1
WHERE name LIKE '%Ultherapy%' OR name LIKE '%Ulthera%';

-- Add comments for clarity
-- prep_time_minutes: Time needed before treatment (e.g., applying anesthesia in prep room)
-- cleanup_time_minutes: Time needed after treatment (e.g., cleaning room)
-- prep_room_type: Type of room needed for prep ('PREP' for L1-L4, NULL for same room)
-- requires_anesthesia: 1 if procedure needs anesthesia application
