-- Toewijzing aan app-gebruiker toevoegen aan trello_kaarten
ALTER TABLE trello_kaarten
  ADD COLUMN IF NOT EXISTS toegewezen_aan UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Beheerder mag ook toewijzingen aanpassen van anderen
CREATE POLICY "trello_kaarten_update" ON trello_kaarten
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
