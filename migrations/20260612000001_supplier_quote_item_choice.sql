-- Migration: 20260612000001_supplier_quote_item_choice.sql
-- Descricao: Escolha do fornecedor vencedor por item de cotacao (P11 Fase 3).
--
-- is_chosen marca, dentro de um request_group, qual oferta foi escolhida para
-- cada especie (no maximo uma por especie do grupo — garantido na action, nao
-- no banco, porque o grupo atravessa varias linhas de supplier_quotes).
-- sale_unit_price e o preco de REVENDA ao cliente definido no fechamento
-- (custo = quoted_unit_price + margem; piso minimo validado na action via env).

BEGIN;

ALTER TABLE supplier_quote_items
  ADD COLUMN IF NOT EXISTS is_chosen BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE supplier_quote_items
  ADD COLUMN IF NOT EXISTS sale_unit_price NUMERIC(10,2) CHECK (sale_unit_price >= 0);

CREATE INDEX IF NOT EXISTS idx_supplier_quote_items_chosen
  ON supplier_quote_items (quote_id) WHERE is_chosen;

COMMIT;
