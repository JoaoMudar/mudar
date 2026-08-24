-- ============================================================
-- Areas e canteiros: o endereco do viveiro
--
-- Especificacao: docs/rotinas/2-producao/04-lotes-e-canteiros.md
-- Requisitos: RF-80, RF-81 · Regra: RN-74 · Entidades: C8 `areas`, `beds`
--
-- O viveiro e dividido em areas por letra (A, B, C) e cada area tem canteiros
-- numerados de 1 ate o maximo dela. E o vocabulario que a equipe ja usa
-- apontando com o dedo: o sistema nao inventa nomenclatura nova.
--
-- A UNICIDADE E DO PAR (area_id, number), NAO DO NUMERO SOZINHO. A numeracao
-- recomeca em cada area: existe o canteiro 4 da area A e o canteiro 4 da area
-- B, e sao dois lugares diferentes.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL: scripts/migrate.ts ja
-- envolve cada arquivo numa transacao, e migration que checa antes de agir
-- roda como no-op e ainda assim e marcada como aplicada (licao no 7 do
-- post-mortem; achado J da auditoria de 11/08/2026).
-- ============================================================

CREATE TABLE areas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter      TEXT NOT NULL UNIQUE,
  name        TEXT,
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Letra unica e maiuscula: "a" e "A" seriam a mesma area para a equipe, e
  -- duas linhas distintas para o banco.
  CONSTRAINT areas_letter_formato CHECK (letter ~ '^[A-Z]{1,2}$')
);

CREATE TRIGGER areas_set_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE beds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id     UUID NOT NULL REFERENCES areas(id),
  number      INTEGER NOT NULL,

  -- Serve de AVISO ao criar lote, nao de trava. O viveiro sabe apertar mais do
  -- que a conta quando precisa, e uma trava aqui faria a gerencia registrar o
  -- lote no canteiro errado so para conseguir registra-lo.
  capacity    INTEGER,

  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT beds_number_positivo CHECK (number > 0),
  CONSTRAINT beds_capacity_positiva CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT beds_numero_unico_na_area UNIQUE (area_id, number)
);

CREATE INDEX beds_area_idx ON beds(area_id) WHERE active;

CREATE TRIGGER beds_set_updated_at
  BEFORE UPDATE ON beds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE areas IS
  'Divisao fisica do viveiro, identificada por letra. RN-74.';
COMMENT ON TABLE beds IS
  'Canteiro, numerado dentro da area. O par (letra, numero) e o endereco de uma muda. RN-74.';
COMMENT ON COLUMN beds.capacity IS
  'Quantas mudas o canteiro comporta. Aviso ao criar lote, nunca trava.';
