-- Migration: Update machine names for staff-only validation
-- Purpose: Ensure D-Cool and other machines have correct names for validation

-- Update existing machines with proper names (only if name is NULL or empty)
UPDATE machines SET name = 'D-Cool' WHERE (name IS NULL OR name = '') AND id LIKE '%dcool%';
UPDATE machines SET name = 'Tesla' WHERE (name IS NULL OR name = '') AND id LIKE '%tesla%';
UPDATE machines SET name = 'Plasmalis' WHERE (name IS NULL OR name = '') AND id LIKE '%plasma%';
UPDATE machines SET name = 'Skinpen' WHERE (name IS NULL OR name = '') AND id LIKE '%skin%';

-- Ensure is_available column exists and set default
UPDATE machines SET is_available = 1 WHERE is_available IS NULL;

-- Show current machine names for verification
SELECT id, name, is_available FROM machines;
