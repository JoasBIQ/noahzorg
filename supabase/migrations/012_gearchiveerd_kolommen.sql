-- Voeg gearchiveerd kolom toe aan alle tabellen die dat nog niet hebben

ALTER TABLE contacten ADD COLUMN IF NOT EXISTS gearchiveerd BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE behandelaars ADD COLUMN IF NOT EXISTS gearchiveerd BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE document_verwijzingen ADD COLUMN IF NOT EXISTS gearchiveerd BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE dossier_items ADD COLUMN IF NOT EXISTS gearchiveerd BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE medicaties ADD COLUMN IF NOT EXISTS gearchiveerd BOOLEAN NOT NULL DEFAULT false;
