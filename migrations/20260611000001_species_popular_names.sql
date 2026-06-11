-- Nomes populares adicionais (sinonimos) de especies.
-- O nome popular principal continua em species.common_name; esta tabela guarda
-- os demais nomes conhecidos. UNIQUE em name_normalized garante que um nome
-- popular aponta para UMA unica especie ("esse nome e tal nome cientifico").
-- name_normalized e calculado no app (normalizePopularName em src/lib/species-names.ts):
-- sem acentos, minusculo, hifen/underscore/barra viram espaco, espacos colapsados.

BEGIN;

CREATE TABLE IF NOT EXISTS species_popular_names (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  species_id      UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_normalized TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_species_popular_names_species
  ON species_popular_names(species_id);

COMMIT;
