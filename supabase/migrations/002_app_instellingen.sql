-- App instellingen tabel (key-value store voor app-brede settings)
CREATE TABLE IF NOT EXISTS app_instellingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- RLS
ALTER TABLE app_instellingen ENABLE ROW LEVEL SECURITY;

-- Iedereen mag lezen
CREATE POLICY "app_instellingen_select" ON app_instellingen FOR SELECT TO authenticated USING (true);

-- Alleen beheerder mag schrijven
CREATE POLICY "app_instellingen_insert" ON app_instellingen FOR INSERT TO authenticated WITH CHECK (is_beheerder());
CREATE POLICY "app_instellingen_update" ON app_instellingen FOR UPDATE TO authenticated USING (is_beheerder());
CREATE POLICY "app_instellingen_delete" ON app_instellingen FOR DELETE TO authenticated USING (is_beheerder());
