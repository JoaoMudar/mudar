-- Migration: 20260521100005_pedidos_order_load_items.sql
-- Descricao: Cria tabela de itens por carga (quantidade parcial ou total)

CREATE TABLE IF NOT EXISTS order_load_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id       UUID NOT NULL REFERENCES order_loads(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  is_separated  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (load_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_order_load_items_load_id ON order_load_items (load_id);
