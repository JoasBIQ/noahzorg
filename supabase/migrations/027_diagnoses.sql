-- 027: Diagnoses tabel
CREATE TABLE IF NOT EXISTS diagnoses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam              TEXT NOT NULL,
  datum_gesteld     DATE,
  gesteld_door      TEXT,
  toelichting       TEXT,
  onderbouwing      TEXT,
  info_link_1       TEXT,
  info_link_1_label TEXT,
  info_link_2       TEXT,
  info_link_2_label TEXT,
  info_link_3       TEXT,
  info_link_3_label TEXT,
  actief            BOOLEAN NOT NULL DEFAULT TRUE,
  aangemaakt_door   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diagnoses_select" ON diagnoses FOR SELECT USING (TRUE);
CREATE POLICY "diagnoses_insert" ON diagnoses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "diagnoses_update" ON diagnoses FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "diagnoses_delete" ON diagnoses FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION update_diagnoses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER diagnoses_updated_at
  BEFORE UPDATE ON diagnoses
  FOR EACH ROW EXECUTE FUNCTION update_diagnoses_updated_at();
