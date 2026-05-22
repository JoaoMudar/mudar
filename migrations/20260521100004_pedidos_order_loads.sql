-- Migration: 20260521100004_pedidos_order_loads.sql
-- Descricao: Cria tabela de cargas (viagens) por pedido

CREATE TABLE IF NOT EXISTS order_loads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  load_number INTEGER NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pendente',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_order_loads_status CHECK (
    status IN ('pendente', 'separando', 'pronto')
  ),
  UNIQUE (order_id, load_number)
);

CREATE TRIGGER order_loads_updated_at
  BEFORE UPDATE ON order_loads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_order_loads_order_id ON order_loads (order_id);
