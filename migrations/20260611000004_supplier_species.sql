-- Migration: 20260611000004_supplier_species.sql
-- Descricao: Especies que cada fornecedor oferece (P11 Fase 1).
--
-- species_id referencia o catalogo canonico existente (species +
-- species_popular_names) — nao ha catalogo paralelo de fornecedor.
-- size/container sao TEXTO LIVRE: a tabela containers modela a producao
-- interna do viveiro (custos de substrato etc.); fornecedor externo usa
-- embalagem arbitraria ("raiz nua", "lata", "saco 1m").
-- SEM UNIQUE (supplier_id, species_id): o mesmo fornecedor pode oferecer a
-- especie em tamanhos/precos diferentes; a UI agrupa por especie.

BEGIN;

CREATE TABLE IF NOT EXISTS supplier_species (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id  UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  species_id   UUID NOT NULL REFERENCES species(id),
  size         TEXT,                          -- ex: '30-50cm', '1m'
  container    TEXT,                          -- ex: 'saquinho', 'tubete', 'raiz nua'
  unit_price   NUMERIC(10,2) CHECK (unit_price >= 0),
  min_quantity INTEGER CHECK (min_quantity > 0),
  availability VARCHAR(15) NOT NULL DEFAULT 'unknown'
               CHECK (availability IN ('in_stock', 'on_order', 'unknown')),
  source       VARCHAR(15) NOT NULL DEFAULT 'manual'
               CHECK (source IN ('manual', 'paste', 'quote')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS supplier_species_updated_at ON supplier_species;
CREATE TRIGGER supplier_species_updated_at
  BEFORE UPDATE ON supplier_species
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_supplier_species_supplier ON supplier_species (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_species_species  ON supplier_species (species_id);

COMMIT;
