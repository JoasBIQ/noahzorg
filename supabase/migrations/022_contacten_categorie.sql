-- Voeg categorie kolom toe aan contacten
ALTER TABLE contacten
  ADD COLUMN IF NOT EXISTS categorie TEXT CHECK (categorie IN ('familie', 'zorg', 'overig')) DEFAULT 'overig';

-- Migreer bestaande contacten op basis van functie-tekst
UPDATE contacten
SET categorie = 'familie'
WHERE categorie IS NULL
  AND functie IS NOT NULL
  AND (
    lower(functie) LIKE '%familie%' OR
    lower(functie) LIKE '%ouder%' OR
    lower(functie) LIKE '%broer%' OR
    lower(functie) LIKE '%zus%'
  );

UPDATE contacten
SET categorie = 'zorg'
WHERE categorie IS NULL OR categorie = 'overig'
  AND functie IS NOT NULL
  AND (
    lower(functie) LIKE '%arts%' OR
    lower(functie) LIKE '%begeleider%' OR
    lower(functie) LIKE '%therapeut%' OR
    lower(functie) LIKE '%zorg%' OR
    lower(functie) LIKE '%verpleeg%'
  );
