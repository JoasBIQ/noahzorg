-- Seed Noah's current medications into medicatie_dossier table
-- startdatum 2026-04-14, actief=true, aangemaakt_door=NULL

INSERT INTO medicatie_dossier (naam, werkzame_stof, dosering, toediening, tijdstip, startdatum, actief, fk_url, aangemaakt_door) VALUES
  -- Ochtend
  ('Dipiperon 40mg/ml', 'Pipamperon', '2 druppels op theelepeltje', 'Oraal', 'Ochtend', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/p/pipamperon', NULL),
  ('Duratears', 'Hypromellose', '1 druppel in elk oog', 'Oogdruppels', 'Ochtend', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/h/hypromellose', NULL),
  ('Lorazepam 1mg', 'Lorazepam', '1 mg met water', 'Oraal', 'Ochtend', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/lorazepam', NULL),
  ('Amlodipine 5mg', 'Amlodipine', '1 tablet met water', 'Oraal', 'Ochtend', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/a/amlodipine', NULL),

  -- Lunch
  ('Lorazepam 0,5mg', 'Lorazepam', '0,5 mg', 'Oraal', 'Lunch', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/lorazepam', NULL),

  -- Uur voor bedtijd
  ('Dipiperon 40mg/ml', 'Pipamperon', '2 druppels', 'Oraal', 'Uur voor bedtijd', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/p/pipamperon', NULL),
  ('Escitalopram 20mg', 'Escitalopram', '1 tablet', 'Oraal', 'Uur voor bedtijd', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/e/escitalopram', NULL),
  ('Multivitamine', NULL, '1 dragee', 'Oraal', 'Uur voor bedtijd', '2026-04-14', true, NULL, NULL),
  ('Lorazepam 0,5mg', 'Lorazepam', '0,5 mg', 'Oraal', 'Uur voor bedtijd', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/lorazepam', NULL),

  -- Bedtijd
  ('Xalmono', 'Latanoprost', '1 druppel in elk oog', 'Oogdruppels', 'Bedtijd', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/latanoprost', NULL),

  -- Zo nodig
  ('Lorazepam 1mg', 'Lorazepam', '1 mg max 1× per dag', 'Oraal', 'Zo nodig', '2026-04-14', true, 'https://www.farmacotherapeutischkompas.nl/bladeren/preparaatteksten/l/lorazepam', NULL);
