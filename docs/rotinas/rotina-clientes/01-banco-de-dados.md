# Fase 1: Banco de Dados — Migração Aditiva

## Objetivo
Estender `customers` com campos fiscais (PF/PJ, documento, endereço, e-mail) e
adicionar `orders.needs_invoice`, **sem** quebrar o cadastro simples existente.
Tudo aditivo, idempotente e retrocompatível: nenhum cliente legado deixa de funcionar.

## Pré-requisitos
- Tabela `customers` já existe (`migrations/20260521100001_pedidos_customers.sql`):
  hoje só `name`, `phone`, `city`, `state`, `notes`, `active`, timestamps + trigger `set_updated_at`.
- Tabela `orders` já existe (`migrations/20260521100002_pedidos_orders.sql`).
- Padrão de migração do projeto: arquivo `.sql` em `migrations/` (psql puro), com
  header `-- Descricao:`, idempotente (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).
- Runner: `npm run db:migrate`.

## Tarefas

### T1.1 — Campos fiscais em `customers`
- [x] Criar migração `migrations/20260525xxxxxx_clientes_fiscal_fields.sql`
- [x] `ADD COLUMN IF NOT EXISTS` para cada campo (todos NULL-able):
  - `person_type` VARCHAR(2) — CHECK (`person_type IN ('pf','pj')`); `NULL` = legado/simples
  - `document` VARCHAR(14) — CPF (11) ou CNPJ (14), **só dígitos**
  - `email` VARCHAR(255)
  - `legal_name` VARCHAR(255) — razão social (PJ)
  - `trade_name` VARCHAR(255) — nome fantasia (PJ)
  - `state_registration` VARCHAR(20) — inscrição estadual (IE)
  - `ie_exempt` BOOLEAN DEFAULT false — isento de IE
  - `zip_code` VARCHAR(8) — CEP, só dígitos
  - `street` VARCHAR(255) — logradouro
  - `address_number` VARCHAR(20) — número (evita a palavra reservada `number`)
  - `complement` VARCHAR(255)
  - `neighborhood` VARCHAR(100) — bairro
  - (reutiliza `city` e `state` já existentes)
- [x] `name` permanece `NOT NULL` e é o rótulo de exibição: PF = nome completo;
  PJ = nome fantasia (ou razão social).
- [x] Índice **único parcial** para evitar documento duplicado só quando informado:
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_document ON customers (document) WHERE document IS NOT NULL;`
- [x] Manter `idx_customers_name` e `idx_customers_active` existentes.

### T1.2 — `orders.needs_invoice`
- [x] Criar migração separada `migrations/20260525xxxxxx_orders_needs_invoice.sql`
- [x] `ALTER TABLE orders ADD COLUMN IF NOT EXISTS needs_invoice BOOLEAN NOT NULL DEFAULT false;`
- [x] Definido no fechamento do pedido (Fase 4). Default `false` garante que pedidos
  antigos e o fluxo simples não exigem NF.

### T1.3 — Rodar e validar
- [x] Executar `npm run db:migrate` e confirmar que as colunas foram criadas.
- [x] Validar com:
  `SELECT column_name FROM information_schema.columns WHERE table_name='customers';`
- [x] Confirmar que clientes legados continuam selecionáveis (campos fiscais `NULL`).
- [x] (Local) Testar de forma segura no Postgres espelho — ver `docs/banco-local-espelho.md`
  (`npm run db:refresh-local`).

## Esboço do SQL (referência)

```sql
-- 20260525xxxxxx_clientes_fiscal_fields.sql
-- Descricao: Adiciona campos fiscais (PF/PJ) em customers para suportar NF futura.
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

-- CHECK de person_type (adicionar só se ainda não existir — ver Notas Técnicas)
-- ALTER TABLE customers ADD CONSTRAINT customers_person_type_chk
--   CHECK (person_type IN ('pf','pj'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_document
  ON customers (document) WHERE document IS NOT NULL;
```

## Notas Técnicas
- **Por que tudo NULL-able**: a completude fiscal é regra de aplicação
  (`isFiscallyComplete`), não do banco. Manter o banco permissivo é o que preserva o
  cadastro simples e os clientes legados. Ver `00-visao-geral.md` → "Gate fiscal".
- **`document` só dígitos**: normalizar antes de gravar (sem `.`, `-`, `/`). A máscara
  é responsabilidade da UI. O índice único parcial evita duplicidade só quando há documento.
- **`address_number` em vez de `number`**: `number` é palavra reservada/confusa em SQL.
- **CHECK constraint idempotente**: `ADD CONSTRAINT` não aceita `IF NOT EXISTS` em
  Postgres antigo; envolver em bloco `DO $$ ... $$` que verifica `pg_constraint`, ou
  validar no app via `person_type` no TypeScript. Preferir a checagem no app + CHECK
  simples se o ambiente suportar.
- **Migração separada para `orders`**: mudanças em tabelas diferentes em arquivos
  diferentes, seguindo o padrão sequencial das migrações de pedidos.
- **Convenção do projeto** (CLAUDE.md): toda alteração de banco mantém compatibilidade
  retroativa e é registrada (header descritivo na migração).
- **Melhoria futura**: `pg_trgm` em `name`/`legal_name`/`phone` para busca tolerante —
  anotado, não implementar agora.
