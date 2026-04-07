-- Google event ID op agenda tabel voor iCal koppeling
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS google_event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS agenda_google_event_id_unique
  ON agenda(google_event_id) WHERE google_event_id IS NOT NULL;
