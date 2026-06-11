-- Migration: 20260611000002_order_item_generic_scope.sql
-- Descricao: Escopo de especies + especificacao para itens genericos de pedido.
--   - specification: exigencia de qualidade do cliente (ex.: "altura min 80cm, fuste retilineo").
--   - order_item_allowed_species: lista fechada de especies permitidas num item generico.
--     Vazio (sem linhas) = aberto (qualquer especie), preservando o comportamento atual.
-- Retrocompativel: genericos ja existentes continuam abertos.

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS specification TEXT;

CREATE TABLE IF NOT EXISTS order_item_allowed_species (
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  species_id    UUID NOT NULL REFERENCES species(id),
  PRIMARY KEY (order_item_id, species_id)
);

CREATE INDEX IF NOT EXISTS idx_oias_order_item ON order_item_allowed_species (order_item_id);
