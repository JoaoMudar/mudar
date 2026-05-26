-- Migration: 20260525100001_clientes_fiscal_fields.sql
-- Descricao: Adiciona campos fiscais (PF/PJ, documento, endereco, e-mail) em customers
--            para suportar emissao de NF futura. Tudo aditivo e NULL-able: o cadastro
--            simples (legado / inline no pedido) continua valido e suficiente.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS person_type        VARCHAR(2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS document           VARCHAR(14);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email              VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS legal_name         VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS trade_name         VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state_registration VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ie_exempt          BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zip_code           VARCHAR(8);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street             VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_number     VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS complement         VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood       VARCHAR(100);

-- CHECK de person_type: aceita apenas 'pf'/'pj' (NULL = cadastro legado/simples).
-- ADD CONSTRAINT nao aceita IF NOT EXISTS em Postgres antigo, entao envolvemos em
-- bloco DO que checa pg_constraint para manter a migracao idempotente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_person_type_chk'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT customers_person_type_chk
      CHECK (person_type IN ('pf', 'pj'));
  END IF;
END $$;

-- Documento (CPF/CNPJ, so digitos) unico apenas quando informado — nao quebra os
-- clientes simples (document NULL) e bloqueia duplicidade quando ha documento.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_document
  ON customers (document) WHERE document IS NOT NULL;
