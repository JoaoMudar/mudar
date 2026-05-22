-- Migration: 20260521100001_pedidos_customers.sql
-- Descricao: Cria tabela de clientes para o sistema de pedidos

CREATE TABLE IF NOT EXISTS customers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  phone      VARCHAR(20),
  city       VARCHAR(100),
  state      VARCHAR(2) DEFAULT 'SC',
  notes      TEXT,
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers (active);
