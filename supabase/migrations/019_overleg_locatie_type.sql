-- Voeg type_overleg enum en locatie toe aan overleggen tabel
CREATE TYPE type_overleg AS ENUM ('fysiek', 'online', 'telefoon');

ALTER TABLE overleggen ADD COLUMN IF NOT EXISTS locatie text;
ALTER TABLE overleggen ADD COLUMN IF NOT EXISTS type_overleg type_overleg NOT NULL DEFAULT 'fysiek';
