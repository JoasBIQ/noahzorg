-- Voeg aanwezigen_tekst en bron toe aan overleggen tabel
ALTER TABLE overleggen ADD COLUMN IF NOT EXISTS aanwezigen_tekst text;
ALTER TABLE overleggen ADD COLUMN IF NOT EXISTS bron text NOT NULL DEFAULT 'handmatig';
