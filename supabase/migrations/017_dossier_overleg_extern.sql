-- Voeg 'overleg_extern' toe aan de dossier_categorie enum
-- Voor verslagen van overleggen met artsen, zorgkantoor, gemeente of andere externe partijen

ALTER TYPE dossier_categorie ADD VALUE IF NOT EXISTS 'overleg_extern';
