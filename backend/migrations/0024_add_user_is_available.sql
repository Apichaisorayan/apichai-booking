-- Add is_available column to users table (to be consistent with rooms/machines)
ALTER TABLE users ADD COLUMN is_available INTEGER DEFAULT 1;
