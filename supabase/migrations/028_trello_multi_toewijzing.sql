-- Meerdere personen toewijzen aan een Trello-kaart
-- Voegt een UUID-array kolom toe naast de bestaande enkele toewijzing.
-- De oude kolom blijft voor backwards-compatibiliteit.

ALTER TABLE trello_kaarten
  ADD COLUMN IF NOT EXISTS toegewezen_aan_ids UUID[] NOT NULL DEFAULT '{}';

-- Index voor snelle lookup
CREATE INDEX IF NOT EXISTS idx_trello_kaarten_toewijzing_ids
  ON trello_kaarten USING GIN (toegewezen_aan_ids);
