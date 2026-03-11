-- Add requires_doctor field to procedures table
-- This allows procedures to specify if they need a doctor or can be done by staff

ALTER TABLE procedures ADD COLUMN requires_doctor INTEGER DEFAULT 1;

-- Update existing procedures that don't require a doctor
-- Based on the provided table: Skinpen, Plasmalis, Tesla Former, D-Cool, Consult

UPDATE procedures SET requires_doctor = 0 WHERE name LIKE '%Skinpen%';
UPDATE procedures SET requires_doctor = 0 WHERE name LIKE '%Plasmalis%';
UPDATE procedures SET requires_doctor = 0 WHERE name LIKE '%Tesla%';
UPDATE procedures SET requires_doctor = 0 WHERE name LIKE '%D-Cool%' OR name LIKE '%miraDry%';
UPDATE procedures SET requires_doctor = 0 WHERE name LIKE '%Consult%' OR name LIKE '%ซื้อคอร์ส%';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_procedures_requires_doctor ON procedures(requires_doctor);

-- Add comment for clarity
-- requires_doctor: 1 if procedure needs a doctor, 0 if staff can perform it
