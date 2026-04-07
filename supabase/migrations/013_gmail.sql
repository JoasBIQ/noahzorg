-- Gmail tokens tabel (voor OAuth koppeling)
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  gmail_email TEXT,
  connected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Slechts één rij tegelijk (singleton)
CREATE UNIQUE INDEX IF NOT EXISTS gmail_tokens_singleton ON gmail_tokens ((true));

-- RLS
ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

-- Alleen beheerder mag lezen/schrijven
CREATE POLICY "Beheerder kan gmail_tokens lezen"
  ON gmail_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'beheerder'
    )
  );

CREATE POLICY "Beheerder kan gmail_tokens aanpassen"
  ON gmail_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'beheerder'
    )
  );

-- Mail reacties tabel (interne familie-discussie per mail)
CREATE TABLE IF NOT EXISTS mail_reacties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT NOT NULL,
  auteur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bericht TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mail_reacties_message_idx ON mail_reacties (gmail_message_id);

-- RLS
ALTER TABLE mail_reacties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ingelogde gebruikers kunnen mail_reacties lezen"
  ON mail_reacties FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ingelogde gebruikers kunnen mail_reacties aanmaken"
  ON mail_reacties FOR INSERT
  WITH CHECK (auth.uid() = auteur_id);

CREATE POLICY "Beheerder kan mail_reacties verwijderen"
  ON mail_reacties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'beheerder'
    )
  );
