-- ── 1. Tabel aanmaken ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicatie_dossier (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam            TEXT NOT NULL,
  werkzame_stof   TEXT,
  dosering        TEXT,
  toediening      TEXT,
  tijdstip        TEXT,
  startdatum      DATE,
  einddatum       DATE,
  actief          BOOLEAN NOT NULL DEFAULT TRUE,
  reden_start     TEXT,
  reden_stop      TEXT,
  voorschrijver   TEXT,
  notities        TEXT,
  fk_url          TEXT,
  indicatie       TEXT,
  aangemaakt_door UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE medicatie_dossier ENABLE ROW LEVEL SECURITY;

-- Iedereen mag lezen
CREATE POLICY "medicatie_dossier_select"
  ON medicatie_dossier FOR SELECT
  USING (TRUE);

-- Alleen ingelogde gebruikers mogen schrijven
CREATE POLICY "medicatie_dossier_insert"
  ON medicatie_dossier FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "medicatie_dossier_update"
  ON medicatie_dossier FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "medicatie_dossier_delete"
  ON medicatie_dossier FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_medicatie_dossier_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER medicatie_dossier_updated_at
  BEFORE UPDATE ON medicatie_dossier
  FOR EACH ROW EXECUTE FUNCTION update_medicatie_dossier_updated_at();

-- ── 2. Seed: Noah's huidige medicatie ────────────────────────────────────────
INSERT INTO medicatie_dossier
  (naam, werkzame_stof, dosering, toediening, tijdstip, startdatum, actief, fk_url, indicatie, aangemaakt_door)
VALUES
  -- Ochtend
  ('Dipiperon 40mg/ml', 'Pipamperon', '2 druppels op theelepeltje', 'Oraal', 'Ochtend', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/p/pipamperon',
   'Antipsychoticum — rust en gedragsregulatie', NULL),

  ('Duratears', 'Hypromellose', '1 druppel in elk oog', 'Oogdruppels', 'Ochtend', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/h/hypromellose',
   'Kunsttranen — droge ogen', NULL),

  ('Lorazepam 1mg', 'Lorazepam', '1 mg met water', 'Oraal', 'Ochtend', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/lorazepam',
   'Benzodiazepine — angst en spanning', NULL),

  ('Amlodipine 5mg', 'Amlodipine', '1 tablet met water', 'Oraal', 'Ochtend', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/a/amlodipine',
   'Calciumantagonist — bloeddruk', NULL),

  -- Lunch
  ('Lorazepam 0,5mg', 'Lorazepam', '0,5 mg', 'Oraal', 'Lunch', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/lorazepam',
   'Benzodiazepine — angst en spanning', NULL),

  -- Uur voor bedtijd
  ('Dipiperon 40mg/ml', 'Pipamperon', '2 druppels', 'Oraal', 'Uur voor bedtijd', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/p/pipamperon',
   'Antipsychoticum — rust en gedragsregulatie', NULL),

  ('Escitalopram 20mg', 'Escitalopram', '1 tablet', 'Oraal', 'Uur voor bedtijd', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/e/escitalopram',
   'Antidepressivum (SSRI) — stemming', NULL),

  ('Multivitamine', NULL, '1 dragee', 'Oraal', 'Uur voor bedtijd', '2026-04-14', true,
   NULL,
   'Vitaminesuppletie', NULL),

  ('Lorazepam 0,5mg', 'Lorazepam', '0,5 mg', 'Oraal', 'Uur voor bedtijd', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/lorazepam',
   'Benzodiazepine — angst en spanning', NULL),

  -- Bedtijd
  ('Xalmono', 'Latanoprost', '1 druppel in elk oog', 'Oogdruppels', 'Bedtijd', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/latanoprost',
   'Oogdruppels — verhoogde oogdruk (glaucoom)', NULL),

  -- Zo nodig
  ('Lorazepam 1mg', 'Lorazepam', '1 mg max 1× per dag', 'Oraal', 'Zo nodig', '2026-04-14', true,
   'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/lorazepam',
   'Benzodiazepine — angst en spanning', NULL);
