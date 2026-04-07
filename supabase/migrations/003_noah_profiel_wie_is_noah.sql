-- Nieuwe velden voor "Wie is Noah" sectie
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS karakter TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS wat_fijn TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS wat_onrustig TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS communicatie TEXT;
