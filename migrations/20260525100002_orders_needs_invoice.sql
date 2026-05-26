-- Migration: 20260525100002_orders_needs_invoice.sql
-- Descricao: Adiciona orders.needs_invoice. Definido no fechamento do pedido (Fase 4).
--            Default false garante que pedidos antigos e o fluxo simples (sem NF)
--            permanecem coerentes e nao exigem dados fiscais.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS needs_invoice BOOLEAN NOT NULL DEFAULT false;
