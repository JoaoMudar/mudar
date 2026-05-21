-- ============================================================
-- P1 — Histórico de Preços de Insumos (T1.15)
-- Registra cada mudança de preço para rastreabilidade
-- ============================================================

CREATE TABLE input_price_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id      UUID        NOT NULL REFERENCES inputs (id) ON DELETE CASCADE,
  cost_per_unit NUMERIC(10,2) NOT NULL,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT
);

CREATE INDEX idx_input_price_history ON input_price_history (input_id, changed_at DESC);

-- RLS removido — projeto usa PostgreSQL local sem autenticação Supabase.
-- Controle de acesso feito na camada de aplicação (Next.js).
