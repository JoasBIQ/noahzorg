-- Migratie 016: Leestatus per gebruiker voor mail-overleg reacties

CREATE TABLE IF NOT EXISTS mail_reacties_leestatus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_reactie_id uuid NOT NULL REFERENCES mail_reacties(id) ON DELETE CASCADE,
  gebruiker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gelezen_op timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mail_reactie_id, gebruiker_id)
);

ALTER TABLE mail_reacties_leestatus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruiker leest eigen reactie-leestatus"
  ON mail_reacties_leestatus FOR SELECT
  USING (auth.uid() = gebruiker_id);

CREATE POLICY "Gebruiker schrijft eigen reactie-leestatus"
  ON mail_reacties_leestatus FOR INSERT
  WITH CHECK (auth.uid() = gebruiker_id);

CREATE INDEX IF NOT EXISTS mail_reacties_leestatus_gebruiker_idx
  ON mail_reacties_leestatus (gebruiker_id);

CREATE INDEX IF NOT EXISTS mail_reacties_leestatus_reactie_idx
  ON mail_reacties_leestatus (mail_reactie_id);
