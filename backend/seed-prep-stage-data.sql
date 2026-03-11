-- Update existing rooms with room_type
-- L1-L4 are PREP rooms (ห้องฉีดยาชา)
UPDATE rooms SET room_type = 'PREP' WHERE name LIKE 'L%';

-- CS rooms are CONSULTATION rooms (ห้องปรึกษา)
UPDATE rooms SET room_type = 'CONSULTATION' WHERE name LIKE 'CS%';

-- TR rooms are TREATMENT rooms (ห้องทำหัตถการ)
UPDATE rooms SET room_type = 'TREATMENT' WHERE name LIKE 'TR%';

-- Update Ultherapy procedures to require prep room
UPDATE procedures 
SET requires_prep_room = 1, 
    prep_duration_minutes = 60
WHERE name LIKE '%Ultherapy%' OR name LIKE '%Ulthera%';

-- Update Thermage procedures to require prep room
UPDATE procedures 
SET requires_prep_room = 1, 
    prep_duration_minutes = 60
WHERE name LIKE '%Thermage%';

-- Other procedures that might need prep (adjust as needed)
UPDATE procedures 
SET requires_prep_room = 1, 
    prep_duration_minutes = 30
WHERE name LIKE '%Laser%' AND duration_minutes > 45;
