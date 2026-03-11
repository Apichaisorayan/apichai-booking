-- Update user passwords to plain text for development (hash.js is disabled)
-- This allows login with simple passwords

-- Update all users with a simple password: "password123"
UPDATE users SET password = 'password123' WHERE id IN (
  'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10', 'u11', 'u12'
);

-- Set admin user with password "admin123"
UPDATE users SET password = 'admin123' WHERE id = 'u4' AND role = 'ADMIN';
