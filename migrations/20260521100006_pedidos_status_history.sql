-- Migration: 20260521100006_pedidos_status_history.sql
-- Descricao: Cria tabela de historico de mudancas de status dos pedidos

CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(30),
  to_status   VARCHAR(30) NOT NULL,
  changed_by  UUID NOT NULL REFERENCES users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history (order_id);
