-- Eindtijd toevoegen aan agenda (optioneel)
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS eind_tijd TIMESTAMPTZ;
