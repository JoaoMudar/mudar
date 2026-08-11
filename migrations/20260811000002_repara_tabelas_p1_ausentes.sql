-- ============================================================
-- REPARO — `input_usages` e `input_price_history` nunca foram criadas
--
-- Descoberto em 11/08/2026, ao tentar acrescentar `client_id` a
-- `input_usages`. As duas tabelas constam de `_migrations` como aplicadas:
--
--     20260413000003_p1_input_usages.sql
--     20260413000004_p1_input_price_history.sql
--
-- ...mas nao existem NEM no Postgres local NEM no Neon (producao). Conferido
-- nos dois bancos: 24 e 23 tabelas respectivamente, ambas ausentes nos dois.
--
-- E a licao no 7 do post-mortem acontecendo de verdade: migration marcada como
-- aplicada sem ter sido executada. Ha ainda um registro fantasma em
-- `_migrations` — `20260521100006_pedidos_partial_availability.sql` — que nao
-- corresponde a arquivo nenhum de migrations/, confirmando uso de
-- `--mark-applied` no passado. Esse registro extra e inofensivo e foi mantido:
-- apagar linha de `_migrations` a mao e o que produz este tipo de problema.
--
-- Consequencia em producao, ate agora silenciosa:
--   * /insumos/registrar (P1 T1.10-T1.12, marcadas como concluidas) falha em
--     TODO envio — a tabela de destino nao existe.
--   * getPriceHistory em /admin/insumos (T1.15) idem.
--
-- As definicoes abaixo sao as das migrations originais, com uma diferenca
-- deliberada: sem ENABLE ROW LEVEL SECURITY nem a policy `USING (true)`. O
-- projeto abandonou RLS em 20260413000002_p1_rls.sql, e uma policy permissiva
-- so sugere uma protecao que nao existe. O controle e a checagem de perfil na
-- Server Action (D4).
--
-- Sem `IF NOT EXISTS` de proposito: se algum banco ja tiver as tabelas, esta
-- migration deve falhar alto e parar o deploy, em vez de passar em silencio e
-- deixar o historico mentindo de novo.
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

CREATE TABLE input_price_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id      UUID        NOT NULL REFERENCES inputs (id) ON DELETE CASCADE,
  cost_per_unit NUMERIC(10,2) NOT NULL,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT
);

CREATE INDEX idx_input_price_history ON input_price_history (input_id, changed_at DESC);
