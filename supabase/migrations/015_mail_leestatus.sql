-- Per-gebruiker leestatus voor Gmail berichten
CREATE TABLE IF NOT EXISTS mail_leestatus (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text      NOT NULL,
  gebruiker_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gelezen_op     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gmail_message_id, gebruiker_id)
);

ALTER TABLE mail_leestatus ENABLE ROW LEVEL SECURITY;

-- Gebruiker ziet alleen eigen leestatus-rijen
CREATE POLICY "Gebruiker leest eigen leestatus"
  ON mail_leestatus FOR SELECT
  USING (auth.uid() = gebruiker_id);

-- Gebruiker schrijft alleen eigen leestatus-rijen
CREATE POLICY "Gebruiker schrijft eigen leestatus"
  ON mail_leestatus FOR INSERT
  WITH CHECK (auth.uid() = gebruiker_id);

-- Index voor snelle lookups per gebruiker
CREATE INDEX IF NOT EXISTS mail_leestatus_gebruiker_idx
  ON mail_leestatus (gebruiker_id);
