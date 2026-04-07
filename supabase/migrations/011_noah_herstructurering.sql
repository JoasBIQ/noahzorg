-- Noah herstructurering: contacten, behandelaars, document_verwijzingen
-- + nieuwe kolommen op noah_profiel

-- ============================================================
-- NIEUWE TABELLEN
-- ============================================================

-- Contacten
CREATE TABLE IF NOT EXISTS contacten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  naam TEXT NOT NULL,
  functie TEXT,
  organisatie TEXT,
  telefoon TEXT,
  email TEXT,
  adres TEXT,
  notities TEXT,
  is_noodcontact BOOLEAN NOT NULL DEFAULT false,
  nood_volgorde INTEGER,
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id)
);

ALTER TABLE contacten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacten_select" ON contacten FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacten_insert" ON contacten FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());
CREATE POLICY "contacten_update" ON contacten FOR UPDATE TO authenticated USING (true);
CREATE POLICY "contacten_delete" ON contacten FOR DELETE TO authenticated USING (aangemaakt_door = auth.uid() OR is_beheerder());

-- Behandelaars
CREATE TABLE IF NOT EXISTS behandelaars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  naam TEXT NOT NULL,
  specialisme TEXT,
  ziekenhuis TEXT,
  telefoon TEXT,
  notities TEXT,
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id)
);

ALTER TABLE behandelaars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "behandelaars_select" ON behandelaars FOR SELECT TO authenticated USING (true);
CREATE POLICY "behandelaars_insert" ON behandelaars FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());
CREATE POLICY "behandelaars_update" ON behandelaars FOR UPDATE TO authenticated USING (true);
CREATE POLICY "behandelaars_delete" ON behandelaars FOR DELETE TO authenticated USING (aangemaakt_door = auth.uid() OR is_beheerder());

-- Document verwijzingen
CREATE TABLE IF NOT EXISTS document_verwijzingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  naam TEXT NOT NULL,
  omschrijving TEXT,
  locatie TEXT,
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id)
);

ALTER TABLE document_verwijzingen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docverw_select" ON document_verwijzingen FOR SELECT TO authenticated USING (true);
CREATE POLICY "docverw_insert" ON document_verwijzingen FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());
CREATE POLICY "docverw_update" ON document_verwijzingen FOR UPDATE TO authenticated USING (true);
CREATE POLICY "docverw_delete" ON document_verwijzingen FOR DELETE TO authenticated USING (aangemaakt_door = auth.uid() OR is_beheerder());

-- ============================================================
-- NIEUWE KOLOMMEN OP NOAH_PROFIEL
-- ============================================================

-- Wie is Noah: dagelijks leven
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS dagritme TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS eetgewoontes TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS slaap TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS activiteiten TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS gewoontes TEXT;

-- Praktisch: wonen
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS wonen_huidig TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS wonen_historie TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS wonen_wensen TEXT;

-- Praktisch: financieel en juridisch
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS financieel_notities TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS juridisch_notities TEXT;

-- Medisch: huisarts details
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS huisarts_naam TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS huisarts_praktijk TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS huisarts_telefoon TEXT;

-- Medisch: medicatielijst apotheek
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS medicatielijst_tekst TEXT;
ALTER TABLE noah_profiel ADD COLUMN IF NOT EXISTS medicatielijst_afbeelding_url TEXT;
