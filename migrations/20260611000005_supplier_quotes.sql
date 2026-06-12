-- Migration: 20260611000005_supplier_quotes.sql
-- Descricao: Pedidos de orcamento a fornecedores (P11 Fase 2).
--
-- Modelo: um "disparo" de cotacao para N fornecedores gera N linhas em
-- supplier_quotes compartilhando o mesmo request_group_id (UUID gerado na
-- action; sem tabela-pai — e so chave de agregacao na leitura).
-- order_id NULL = cotacao avulsa (sem pedido de cliente vinculado).
-- message_text guarda a mensagem exata gerada/editada (auditoria do outreach:
-- o envio e sempre clique manual do usuario via link wa.me — nunca automatico).

BEGIN;

CREATE TABLE IF NOT EXISTS supplier_quotes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_group_id UUID NOT NULL,
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  order_id         UUID REFERENCES orders(id),
  channel          VARCHAR(15) NOT NULL DEFAULT 'whatsapp'
                   CHECK (channel IN ('whatsapp', 'email', 'instagram', 'manual')),
  message_text     TEXT NOT NULL,
  status           VARCHAR(15) NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'sent', 'responded', 'no_reply', 'cancelled')),
  sent_at          TIMESTAMPTZ,
  responded_at     TIMESTAMPTZ,
  raw_response     TEXT,                 -- resposta crua colada do WhatsApp (opcional)
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS supplier_quotes_updated_at ON supplier_quotes;
CREATE TRIGGER supplier_quotes_updated_at
  BEFORE UPDATE ON supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_supplier_quotes_group    ON supplier_quotes (request_group_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_supplier ON supplier_quotes (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_order    ON supplier_quotes (order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_status   ON supplier_quotes (status);

CREATE TABLE IF NOT EXISTS supplier_quote_items (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id          UUID NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
  species_id        UUID NOT NULL REFERENCES species(id),
  order_item_id     UUID REFERENCES order_items(id),  -- rastreio; NULL na avulsa
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  size              TEXT,                             -- tamanho desejado (texto livre)
  quoted_unit_price NUMERIC(10,2) CHECK (quoted_unit_price >= 0),
  response_notes    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_quote_items_quote   ON supplier_quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_items_species ON supplier_quote_items (species_id);

COMMIT;
