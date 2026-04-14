-- Bijhoudt wie een Trello-kaart heeft aangemaakt via de app
CREATE TABLE IF NOT EXISTS trello_kaarten (
  trello_card_id TEXT PRIMARY KEY,
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trello_kaarten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trello_kaarten_select" ON trello_kaarten
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trello_kaarten_insert" ON trello_kaarten
  FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());

-- Notities op Trello-kaarten, opgeslagen in de app (niet ophalen van Trello)
CREATE TABLE IF NOT EXISTS trello_kaart_notities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trello_card_id TEXT NOT NULL,
  auteur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bericht TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trello_kaart_notities_card_idx
  ON trello_kaart_notities (trello_card_id);

ALTER TABLE trello_kaart_notities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trello_kaart_notities_select" ON trello_kaart_notities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trello_kaart_notities_insert" ON trello_kaart_notities
  FOR INSERT TO authenticated WITH CHECK (auteur_id = auth.uid());

CREATE POLICY "trello_kaart_notities_delete" ON trello_kaart_notities
  FOR DELETE TO authenticated USING (auteur_id = auth.uid());
