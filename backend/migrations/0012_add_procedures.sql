-- Create procedures table
CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create machine_procedures junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS machine_procedures (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  procedure_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE,
  UNIQUE(machine_id, procedure_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_machine_procedures_machine_id ON machine_procedures(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_procedures_procedure_id ON machine_procedures(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedures_name ON procedures(name);
CREATE INDEX IF NOT EXISTS idx_procedures_is_active ON procedures(is_active);
