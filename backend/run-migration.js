#!/usr/bin/env node

/**
 * Database Migration Runner for Cloudflare D1
 * Usage: node run-migration.js <migration-file>
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Usage: node run-migration.js <migration-file>');
  process.exit(1);
}

try {
  console.log(`📄 Running migration: ${migrationFile}`);
  
  // Read migration SQL
  const migrationSQL = readFileSync(migrationFile, 'utf8');
  console.log('📝 Migration SQL:', migrationSQL);
  
  // Run migration using wrangler
  console.log('🚀 Executing migration...');
  const result = execSync(`npx wrangler d1 execute beauty-clinic-db --file="${migrationFile}"`, {
    encoding: 'utf8',
    stdio: 'inherit'
  });
  
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
