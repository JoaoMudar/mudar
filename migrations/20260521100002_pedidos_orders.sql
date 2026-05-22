-- Migration: 20260521100002_pedidos_orders.sql
-- Descricao: Cria tabela de pedidos

CREATE TABLE IF NOT EXISTS orders (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number  SERIAL,
  customer_id   UUID NOT NULL REFERENCES customers(id),
  sale_channel  VARCHAR(50) NOT NULL DEFAULT 'atacado',
  status        VARCHAR(30) NOT NULL DEFAULT 'cadastrado',
  delivery_date DATE,
  notes         TEXT,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_orders_status CHECK (
    status IN ('cadastrado', 'verificando_disponibilidade', 'verificado',
               'pendente_alteracao', 'aprovado', 'separando', 'pronto_envio', 'cancelado')
  )
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders (delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
