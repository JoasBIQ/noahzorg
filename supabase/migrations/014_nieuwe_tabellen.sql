-- Migratie 014: Nieuwe tabellen voor Zorgplan, Dagbesteding en Calendar tokens
-- Veilig te runnen met IF NOT EXISTS overal

-- ============================================================
-- 1. CALENDAR_TOKENS
-- Slaat Google Calendar OAuth tokens op (max 1 rij = singleton)
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  connected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton: maximaal één rij
CREATE UNIQUE INDEX IF NOT EXISTS calendar_tokens_singleton ON calendar_tokens ((true));

ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beheerder kan calendar_tokens lezen"
  ON calendar_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'beheerder'
    )
  );

CREATE POLICY "Beheerder kan calendar_tokens aanpassen"
  ON calendar_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'beheerder'
    )
  );

-- ============================================================
-- 2. ZORGPLAN_AFSPRAKEN
-- Zorgafspraken per categorie
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zorgplan_categorie') THEN
    CREATE TYPE zorgplan_categorie AS ENUM (
      'algemeen', 'medisch', 'dagbesteding', 'wonen',
      'financieel', 'communicatie', 'overig'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS zorgplan_afspraken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  categorie zorgplan_categorie NOT NULL DEFAULT 'algemeen',
  titel TEXT NOT NULL,
  omschrijving TEXT,
  wie_doet_het TEXT,
  frequentie TEXT,
  notities TEXT,
  actief BOOLEAN NOT NULL DEFAULT true,
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id)
);

ALTER TABLE zorgplan_afspraken ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zorgplan_select" ON zorgplan_afspraken
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "zorgplan_insert" ON zorgplan_afspraken
  FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());

CREATE POLICY "zorgplan_update" ON zorgplan_afspraken
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "zorgplan_delete" ON zorgplan_afspraken
  FOR DELETE TO authenticated
  USING (aangemaakt_door = auth.uid() OR is_beheerder());

-- ============================================================
-- 3. DAGBESTEDING
-- Dagbestedingslocaties voor Noah
-- ============================================================

CREATE TABLE IF NOT EXISTS dagbesteding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  naam TEXT NOT NULL,
  adres TEXT,
  contactpersoon TEXT,
  telefoon TEXT,
  dagen_tijden TEXT,
  activiteiten TEXT,
  bijzonderheden TEXT,
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id)
);

ALTER TABLE dagbesteding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dagbesteding_select" ON dagbesteding
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dagbesteding_insert" ON dagbesteding
  FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());

CREATE POLICY "dagbesteding_update" ON dagbesteding
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "dagbesteding_delete" ON dagbesteding
  FOR DELETE TO authenticated
  USING (aangemaakt_door = auth.uid() OR is_beheerder());
