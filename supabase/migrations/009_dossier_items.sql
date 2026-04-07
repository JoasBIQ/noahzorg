CREATE TYPE dossier_categorie AS ENUM ('brief', 'rapport', 'verslag', 'recept', 'indicatie', 'juridisch', 'financieel', 'overig');

CREATE TABLE dossier_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  titel TEXT NOT NULL,
  categorie dossier_categorie NOT NULL DEFAULT 'overig',
  datum_document DATE,
  afzender TEXT,
  samenvatting TEXT,
  inhoud TEXT,
  drive_link TEXT,
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id)
);

ALTER TABLE dossier_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dossier_select" ON dossier_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "dossier_insert" ON dossier_items FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());
CREATE POLICY "dossier_update" ON dossier_items FOR UPDATE TO authenticated USING (true);
