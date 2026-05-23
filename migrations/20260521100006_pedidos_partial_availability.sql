-- Migration: 20260521100006_pedidos_partial_availability.sql
-- Descricao: Disponibilidade parcial em itens de pedido.
--   Permite registrar que so parte da quantidade pedida esta disponivel
--   (available_quantity) e, opcionalmente, em um recipiente diferente do pedido
--   (available_container_id). Retrocompativel: colunas anulaveis.
--
-- Semantica (itens especificos):
--   Disponivel   -> is_available = true,  available_quantity = NULL, available_container_id = NULL
--   Parcial      -> is_available = false, available_quantity = N (1..quantity), available_container_id = recipiente real
--   Indisponivel -> is_available = false, available_quantity = 0,    available_container_id = NULL
--   Nao verif.   -> is_available = NULL,  available_quantity = NULL, available_container_id = NULL

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS available_quantity INTEGER;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS available_container_id UUID REFERENCES containers(id);
