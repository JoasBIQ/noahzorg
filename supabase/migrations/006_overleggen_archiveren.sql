-- Archiveren van overleggen
ALTER TABLE overleggen ADD COLUMN IF NOT EXISTS gearchiveerd BOOLEAN NOT NULL DEFAULT false;
