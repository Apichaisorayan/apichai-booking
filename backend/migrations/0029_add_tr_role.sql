-- Add TR (Treatment Room Staff) role to users table
-- TR role is for staff who handle procedures that don't require a doctor
-- Examples: Plasmalis, Tesla, D-Cool, Diode

-- First, we need to drop the existing CHECK constraint and recreate it with TR included
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new users table with TR role
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'DOCTOR', 'SALES', 'CRM', 'TR')),
  is_available INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Step 2: Copy all data from old table
INSERT INTO users_new (id, name, email, password, role, is_available, created_at, updated_at)
SELECT id, name, email, password, role, is_available, created_at, updated_at
FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table to users
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
