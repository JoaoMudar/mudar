-- Migration: 20260521100003_pedidos_order_items.sql
-- Descricao: Cria tabela de itens do pedido (especificos e genericos)

CREATE TABLE IF NOT EXISTS order_items (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  species_id         UUID REFERENCES species(id),
  container_id       UUID NOT NULL REFERENCES containers(id),
  quantity           INTEGER NOT NULL CHECK (quantity > 0),
  is_generic         BOOLEAN NOT NULL DEFAULT false,
  parent_item_id     UUID REFERENCES order_items(id) ON DELETE CASCADE,
  is_available       BOOLEAN DEFAULT NULL,
  availability_notes TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_generic_no_species CHECK (
    is_generic = false OR species_id IS NULL
  ),
  CONSTRAINT chk_specific_has_species CHECK (
    is_generic = true OR parent_item_id IS NOT NULL OR species_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_parent_item_id ON order_items (parent_item_id);
