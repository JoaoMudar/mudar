-- ============================================================
-- P1 — Custeio por Espécie: Schema Central
-- Tabelas fundacionais referenciadas por P2, P3, P6, P7, P10
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE species_category AS ENUM (
  'frutifera',
  'ornamental',
  'madeira',
  'restauracao',
  'pioneira',
  'climax'
);

CREATE TYPE input_category AS ENUM (
  'substrato',
  'adubo',
  'defensivo',
  'recipiente',
  'outros'
);

CREATE TYPE fixed_cost_category AS ENUM (
  'salarios',
  'energia',
  'agua',
  'manutencao',
  'combustivel',
  'depreciacao',
  'outros'
);


-- ============================================================
-- T1.1 — SPECIES
-- Entidade central do ecossistema. Referenciada por P2, P3, P6, P7, P10.
-- ============================================================

CREATE TABLE species (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name           TEXT NOT NULL,
  scientific_name       TEXT,
  category              species_category NOT NULL,
  germination_time_days INTEGER,          -- dias da semente à plântula
  growth_time_months    INTEGER,          -- meses da plântula à muda pronta
  notes                 TEXT,
  photo_url             TEXT,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER species_updated_at
  BEFORE UPDATE ON species
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_species_category ON species (category);
CREATE INDEX idx_species_active ON species (active);


-- ============================================================
-- T1.2 — CONTAINERS
-- Recipientes usados no viveiro: tubete, sacos, balde
-- ============================================================

CREATE TABLE containers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL UNIQUE,  -- 'tubete','10x18','17x22','20x26','28x32','balde'
  volume_liters             NUMERIC(6,3),
  substrate_per_unit_liters NUMERIC(6,3),
  unit_cost                 NUMERIC(10,2),         -- custo do recipiente vazio
  active                    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- T1.3 — INPUTS (Insumos)
-- Substrato, adubo, defensivos, recipientes e outros
-- ============================================================

CREATE TABLE inputs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  category           input_category NOT NULL,
  unit_of_measure    TEXT NOT NULL,   -- 'kg', 'L', 'saco', 'unidade'
  cost_per_unit      NUMERIC(10,2),
  supplier           TEXT,
  last_purchase_date DATE,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER inputs_updated_at
  BEFORE UPDATE ON inputs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_inputs_category ON inputs (category);


-- ============================================================
-- T1.4 — FIXED_COSTS (Custos Fixos Mensais)
-- Salários, energia, água, manutenção, combustível, depreciação
-- ============================================================

CREATE TABLE fixed_costs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category         fixed_cost_category NOT NULL,
  monthly_amount   NUMERIC(12,2) NOT NULL,
  reference_month  DATE NOT NULL,  -- sempre o primeiro dia do mês (ex: 2026-04-01)
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fixed_costs_month ON fixed_costs (reference_month);


-- ============================================================
-- T1.5 — SEED_COLLECTION_COSTS (Custo de Coleta de Sementes)
-- Deslocamento + horas por espécie e região de coleta
-- ============================================================

CREATE TABLE seed_collection_costs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id            UUID NOT NULL REFERENCES species (id),
  collection_region     TEXT,
  distance_km           NUMERIC(8,2),
  fuel_cost             NUMERIC(10,2),
  labor_hours           NUMERIC(8,2),
  labor_cost_per_hour   NUMERIC(10,2),
  total_cost            NUMERIC(12,2) NOT NULL,
  seeds_collected_qty   INTEGER,
  cost_per_seed         NUMERIC(10,4) GENERATED ALWAYS AS (
    CASE
      WHEN seeds_collected_qty > 0 THEN total_cost / seeds_collected_qty
      ELSE NULL
    END
  ) STORED,
  collection_date       DATE NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seed_collection_species ON seed_collection_costs (species_id);


-- ============================================================
-- T1.6 — PRODUCTION_COSTS (Custo Variável por Espécie × Recipiente)
-- Um registro por combinação espécie+recipiente
-- ============================================================

CREATE TABLE production_costs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id           UUID NOT NULL REFERENCES species (id),
  container_id         UUID NOT NULL REFERENCES containers (id),
  substrate_cost       NUMERIC(10,2) NOT NULL DEFAULT 0,
  seed_cost            NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- [{input_id, name, qty, unit_cost, total}]
  input_costs_json     JSONB NOT NULL DEFAULT '[]',
  labor_minutes        NUMERIC(8,2) NOT NULL DEFAULT 0,
  labor_cost           NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_variable_cost  NUMERIC(12,2) GENERATED ALWAYS AS (
    substrate_cost + seed_cost + labor_cost
  ) STORED,
  calculated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (species_id, container_id)
);

CREATE INDEX idx_production_costs_species ON production_costs (species_id);
CREATE INDEX idx_production_costs_container ON production_costs (container_id);


-- ============================================================
-- T1.7 — VIEW species_unit_cost
-- Custo unitário estimado = custo variável + rateio de custos fixos
-- Fórmula de rateio simples (placeholder até P2 trazer produção real)
-- ============================================================

CREATE VIEW species_unit_cost AS
WITH current_fixed_total AS (
  SELECT COALESCE(SUM(monthly_amount), 0) AS total
  FROM fixed_costs
  WHERE reference_month = date_trunc('month', NOW())::date
),
active_combinations AS (
  SELECT COUNT(*) AS qty
  FROM production_costs pc
  JOIN species s ON s.id = pc.species_id
  WHERE s.active = TRUE
)
SELECT
  s.id                                              AS species_id,
  s.common_name,
  s.scientific_name,
  s.category,
  c.id                                              AS container_id,
  c.name                                            AS container_name,
  pc.substrate_cost,
  pc.seed_cost,
  pc.labor_cost,
  pc.input_costs_json,
  pc.total_variable_cost,
  cft.total                                         AS total_fixed_cost_month,
  CASE
    WHEN ac.qty > 0 THEN ROUND(cft.total / ac.qty, 4)
    ELSE 0
  END                                               AS fixed_cost_allocated,
  pc.total_variable_cost + CASE
    WHEN ac.qty > 0 THEN ROUND(cft.total / ac.qty, 4)
    ELSE 0
  END                                               AS unit_cost_estimated,
  pc.calculated_at
FROM production_costs pc
JOIN species         s   ON s.id = pc.species_id
JOIN containers      c   ON c.id = pc.container_id
CROSS JOIN current_fixed_total cft
CROSS JOIN active_combinations ac
WHERE s.active = TRUE;
