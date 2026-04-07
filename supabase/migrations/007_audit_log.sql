-- Audit log tabel
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gebruiker_id UUID NOT NULL REFERENCES profiles(id),
  actie TEXT NOT NULL,
  module TEXT NOT NULL,
  omschrijving TEXT NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_module ON audit_log(module);
CREATE INDEX idx_audit_log_gebruiker ON audit_log(gebruiker_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Alleen beheerder mag lezen
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated USING (is_beheerder());

-- Alle ingelogde gebruikers mogen schrijven (logging)
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
