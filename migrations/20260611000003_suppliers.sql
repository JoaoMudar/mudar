-- Migration: 20260611000003_suppliers.sql
-- Descricao: Fornecedores de mudas (rede de revenda/intermediacao — P11 Fase 1).
--
-- Semantica de active vs status (redundancia deliberada, padrao do sistema):
--   active = false       -> registro arquivado via soft-delete (some das listagens)
--   status = 'inactive'  -> fornecedor parou de vender, mas o historico interessa
--   status = 'do_not_contact' -> pediu para nao ser contatado (opt-out); nunca
--                                entra em cotacoes/outreach (LGPD).

BEGIN;

CREATE TABLE IF NOT EXISTS suppliers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,            -- nome do viveiro/produtor
  contact_name      TEXT,                     -- pessoa de contato
  whatsapp          VARCHAR(20),              -- so digitos (normalizado no app)
  phone             VARCHAR(20),              -- telefone secundario
  email             TEXT,
  instagram         TEXT,
  city              TEXT,
  state             VARCHAR(2),               -- sem default 'SC': fornecedor e de qualquer UF
  notes             TEXT,
  reliability_score SMALLINT CHECK (reliability_score BETWEEN 0 AND 5),
  status            VARCHAR(20) NOT NULL DEFAULT 'lead'
                    CHECK (status IN ('lead', 'active', 'inactive', 'do_not_contact')),
  last_contacted_at TIMESTAMPTZ,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_suppliers_name   ON suppliers (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_city   ON suppliers (city);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers (status);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers (active);

COMMIT;
