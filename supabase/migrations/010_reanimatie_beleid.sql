-- Reanimatie-beleid velden toevoegen aan noah_profiel
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS reanimatie_beleid TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS reanimatie_toelichting TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS reanimatie_gesprek_gevoerd BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS reanimatie_gesprek_datum DATE;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS reanimatie_gesprek_met TEXT;

-- Medicatielijst apotheek link
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS medicatielijst_apotheek_link TEXT;
