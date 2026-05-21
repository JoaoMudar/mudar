-- ============================================================
-- P1 — Tabela de registro de consumo de insumos (T1.10)
-- Funcionários registram o que usaram por espécie × recipiente
-- ============================================================

CREATE TABLE input_usages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id      UUID NOT NULL REFERENCES inputs (id),
  species_id    UUID NOT NULL REFERENCES species (id),
  container_id  UUID NOT NULL REFERENCES containers (id),
  quantity      NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  usage_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_input_usages_input    ON input_usages (input_id);
CREATE INDEX idx_input_usages_species  ON input_usages (species_id);
CREATE INDEX idx_input_usages_date     ON input_usages (usage_date);

ALTER TABLE input_usages ENABLE ROW LEVEL SECURITY;

-- Local Postgres does not have Supabase auth functions, so allow access through the application layer.
CREATE POLICY "input_usages_auth_all" ON input_usages
  FOR ALL USING (true);
