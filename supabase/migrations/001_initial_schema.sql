-- Noah's Zorg - Database Schema
-- Volledig migratiebestand voor Supabase

-- Extensies
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE user_role AS ENUM ('beheerder', 'gebruiker');
CREATE TYPE logboek_categorie AS ENUM ('observatie', 'zorg', 'incident', 'emotie', 'praktisch');
CREATE TYPE taak_status AS ENUM ('open', 'bezig', 'gereed', 'gearchiveerd');
CREATE TYPE taak_prioriteit AS ENUM ('laag', 'normaal', 'hoog', 'urgent');
CREATE TYPE agenda_type AS ENUM ('medisch', 'zorg', 'juridisch', 'sociaal', 'overleg', 'overig');
CREATE TYPE medicatie_status AS ENUM ('actief', 'gestopt', 'on_hold');
CREATE TYPE traject_status AS ENUM ('lopend', 'afgerond', 'on_hold', 'gestopt');
CREATE TYPE bestand_categorie AS ENUM ('brief', 'rapport', 'indicatie', 'foto', 'overig');

-- ============================================================
-- TABELLEN
-- ============================================================

-- Profiles (uitbreiding op auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  rol user_role NOT NULL DEFAULT 'gebruiker',
  kleur TEXT NOT NULL DEFAULT '#93C5FD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Noah's profiel (singleton)
CREATE TABLE noah_profiel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volledige_naam TEXT,
  geboortedatum DATE,
  bsn_encrypted TEXT, -- versleuteld met pgcrypto, alleen beheerder
  diagnose TEXT,
  huisarts TEXT,
  zorgkantoor TEXT,
  zorgkantoor_nummer TEXT,
  notities TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Logboek
CREATE TABLE logboek (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auteur_id UUID NOT NULL REFERENCES profiles(id),
  categorie logboek_categorie NOT NULL DEFAULT 'observatie',
  bericht TEXT NOT NULL,
  gearchiveerd BOOLEAN NOT NULL DEFAULT false,
  gearchiveerd_door UUID REFERENCES profiles(id),
  gearchiveerd_op TIMESTAMPTZ,
  reacties JSONB NOT NULL DEFAULT '[]'::jsonb,
  gelezen_door UUID[] NOT NULL DEFAULT '{}'
);

-- Taken
CREATE TABLE taken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  titel TEXT NOT NULL,
  omschrijving TEXT,
  toegewezen_aan UUID REFERENCES profiles(id),
  deadline DATE,
  prioriteit taak_prioriteit NOT NULL DEFAULT 'normaal',
  status taak_status NOT NULL DEFAULT 'open',
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id),
  gearchiveerd BOOLEAN NOT NULL DEFAULT false,
  overleg_id UUID -- FK wordt later toegevoegd na overleggen tabel
);

-- Agenda
CREATE TABLE agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  titel TEXT NOT NULL,
  datum_tijd TIMESTAMPTZ NOT NULL,
  type agenda_type NOT NULL DEFAULT 'overig',
  locatie TEXT,
  notities TEXT,
  betrokkenen UUID[] NOT NULL DEFAULT '{}',
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id)
);

-- Medicaties
CREATE TABLE medicaties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  dosering TEXT,
  frequentie TEXT,
  voorschrijver TEXT,
  startdatum DATE,
  einddatum DATE,
  status medicatie_status NOT NULL DEFAULT 'actief',
  notities TEXT,
  aangemaakt_door UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trajecten
CREATE TABLE trajecten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam_traject TEXT NOT NULL,
  organisatie TEXT,
  contactpersoon TEXT,
  contactpersoon_email TEXT,
  contactpersoon_telefoon TEXT,
  startdatum DATE,
  einddatum DATE,
  status traject_status NOT NULL DEFAULT 'lopend',
  notities TEXT,
  aangemaakt_door UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts kluis (alleen beheerder)
CREATE TABLE accounts_kluis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  gebruikersnaam TEXT,
  wachtwoord_encrypted TEXT, -- versleuteld met pgcrypto
  notities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Bestanden
CREATE TABLE bestanden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  naam TEXT NOT NULL,
  beschrijving TEXT,
  categorie bestand_categorie NOT NULL DEFAULT 'overig',
  storage_path TEXT NOT NULL,
  geupload_door UUID NOT NULL REFERENCES profiles(id)
);

-- Overleggen
CREATE TABLE overleggen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  titel TEXT NOT NULL,
  datum_tijd TIMESTAMPTZ NOT NULL,
  aanwezigen UUID[] NOT NULL DEFAULT '{}',
  bespreekpunten JSONB NOT NULL DEFAULT '[]'::jsonb,
  notities TEXT,
  drive_verslag_id TEXT,
  drive_opname_id TEXT,
  aangemaakt_door UUID NOT NULL REFERENCES profiles(id)
);

-- FK van taken naar overleggen
ALTER TABLE taken ADD CONSTRAINT taken_overleg_id_fkey FOREIGN KEY (overleg_id) REFERENCES overleggen(id);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON noah_profiel FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON medicaties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON trajecten FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile bij nieuwe gebruiker
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, naam, rol, kleur)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'naam', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'rol')::user_role, 'gebruiker'),
    COALESCE(NEW.raw_user_meta_data->>'kleur', '#93C5FD')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE noah_profiel ENABLE ROW LEVEL SECURITY;
ALTER TABLE logboek ENABLE ROW LEVEL SECURITY;
ALTER TABLE taken ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE trajecten ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_kluis ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestanden ENABLE ROW LEVEL SECURITY;
ALTER TABLE overleggen ENABLE ROW LEVEL SECURITY;

-- Helper: is huidige gebruiker beheerder?
CREATE OR REPLACE FUNCTION is_beheerder()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'beheerder'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE TO authenticated USING (is_beheerder());

-- NOAH PROFIEL
CREATE POLICY "noah_profiel_select" ON noah_profiel FOR SELECT TO authenticated USING (true);
CREATE POLICY "noah_profiel_update" ON noah_profiel FOR UPDATE TO authenticated USING (true);
CREATE POLICY "noah_profiel_insert" ON noah_profiel FOR INSERT TO authenticated WITH CHECK (true);

-- LOGBOEK
CREATE POLICY "logboek_select" ON logboek FOR SELECT TO authenticated USING (true);
CREATE POLICY "logboek_insert" ON logboek FOR INSERT TO authenticated WITH CHECK (auteur_id = auth.uid());
CREATE POLICY "logboek_update_own" ON logboek FOR UPDATE TO authenticated USING (auteur_id = auth.uid());
CREATE POLICY "logboek_update_admin" ON logboek FOR UPDATE TO authenticated USING (is_beheerder());

-- TAKEN
CREATE POLICY "taken_select" ON taken FOR SELECT TO authenticated USING (true);
CREATE POLICY "taken_insert" ON taken FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());
CREATE POLICY "taken_update_own" ON taken FOR UPDATE TO authenticated USING (aangemaakt_door = auth.uid() OR toegewezen_aan = auth.uid());
CREATE POLICY "taken_update_admin" ON taken FOR UPDATE TO authenticated USING (is_beheerder());

-- AGENDA
CREATE POLICY "agenda_select" ON agenda FOR SELECT TO authenticated USING (true);
CREATE POLICY "agenda_insert" ON agenda FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());
CREATE POLICY "agenda_update_own" ON agenda FOR UPDATE TO authenticated USING (aangemaakt_door = auth.uid());
CREATE POLICY "agenda_update_admin" ON agenda FOR UPDATE TO authenticated USING (is_beheerder());

-- MEDICATIES
CREATE POLICY "medicaties_select" ON medicaties FOR SELECT TO authenticated USING (true);
CREATE POLICY "medicaties_insert" ON medicaties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "medicaties_update" ON medicaties FOR UPDATE TO authenticated USING (true);

-- TRAJECTEN
CREATE POLICY "trajecten_select" ON trajecten FOR SELECT TO authenticated USING (true);
CREATE POLICY "trajecten_insert" ON trajecten FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "trajecten_update" ON trajecten FOR UPDATE TO authenticated USING (true);

-- ACCOUNTS KLUIS (alleen beheerder)
CREATE POLICY "kluis_all" ON accounts_kluis FOR ALL TO authenticated USING (is_beheerder());

-- BESTANDEN
CREATE POLICY "bestanden_select" ON bestanden FOR SELECT TO authenticated USING (true);
CREATE POLICY "bestanden_insert" ON bestanden FOR INSERT TO authenticated WITH CHECK (geupload_door = auth.uid());

-- OVERLEGGEN
CREATE POLICY "overleggen_select" ON overleggen FOR SELECT TO authenticated USING (true);
CREATE POLICY "overleggen_insert" ON overleggen FOR INSERT TO authenticated WITH CHECK (aangemaakt_door = auth.uid());
CREATE POLICY "overleggen_update_own" ON overleggen FOR UPDATE TO authenticated USING (aangemaakt_door = auth.uid());
CREATE POLICY "overleggen_update_admin" ON overleggen FOR UPDATE TO authenticated USING (is_beheerder());

-- ============================================================
-- SEED DATA
-- ============================================================

-- Noah's profiel singleton aanmaken
INSERT INTO noah_profiel (volledige_naam, diagnose) VALUES ('Noah', 'CDK13-syndroom');
