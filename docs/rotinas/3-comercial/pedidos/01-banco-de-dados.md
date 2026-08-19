# Fase 1: Banco de Dados, Migracoes

## Objetivo
Criar todas as tabelas necessarias para o sistema de pedidos, cargas e notificacoes.

## Pre-requisitos
- Schema existente com tabelas: `species`, `containers`, `users`, `sessions`
- Pool de conexao em `src/lib/db.ts`
- Pasta `migrations/` com migracoes SQL sequenciais

## Tarefas

### T1.1: Tabela `customers` (clientes)
- [x] Criar migracao `migrations/20260521100001_pedidos_customers.sql`
- [x] Campos:
  - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
  - `name` VARCHAR(255) NOT NULL: nome do cliente ou empresa
  - `phone` VARCHAR(20): telefone/WhatsApp (formato livre, ex: "47 99999-0000")
  - `city` VARCHAR(100): cidade
  - `state` VARCHAR(2) DEFAULT 'SC': UF
  - `notes` TEXT: observacoes livres
  - `active` BOOLEAN DEFAULT true
  - `created_at` TIMESTAMPTZ DEFAULT now()
  - `updated_at` TIMESTAMPTZ DEFAULT now()
- [x] Index: `idx_customers_name` em `name`
- [x] Index: `idx_customers_active` em `active`

### T1.2: Tabela `orders` (pedidos)
- [x] Criar migracao `migrations/20260521100002_pedidos_orders.sql`
- [x] Campos:
  - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
  - `order_number` SERIAL: numero sequencial legivel (ex: #001, #002)
  - `customer_id` UUID NOT NULL REFERENCES customers(id)
  - `sale_channel` VARCHAR(50) NOT NULL DEFAULT 'atacado', (atacado, compensacao_ambiental, paisagismo, prefeitura, varejo)
  - `status` VARCHAR(30) NOT NULL DEFAULT 'cadastrado', ver enum de statuses
  - `delivery_date` DATE: data desejada de entrega
  - `notes` TEXT: observacoes do pedido
  - `created_by` UUID NOT NULL REFERENCES users(id): quem cadastrou
  - `created_at` TIMESTAMPTZ DEFAULT now()
  - `updated_at` TIMESTAMPTZ DEFAULT now()
- [x] CHECK constraint em `status`: valores validos conforme lista de statuses
- [x] Index: `idx_orders_status` em `status`
- [x] Index: `idx_orders_customer_id` em `customer_id`
- [x] Index: `idx_orders_delivery_date` em `delivery_date`
- [x] Index: `idx_orders_created_at` em `created_at`

### T1.3: Tabela `order_items` (itens do pedido)
- [x] Criar migracao `migrations/20260521100003_pedidos_order_items.sql`
- [x] Campos:
  - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
  - `order_id` UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
  - `species_id` UUID REFERENCES species(id): **NULLABLE**: NULL = item generico (gerencia escolhe)
  - `container_id` UUID NOT NULL REFERENCES containers(id), para generico, eh o recipiente MINIMO
  - `quantity` INTEGER NOT NULL CHECK (quantity > 0)
  - `is_generic` BOOLEAN NOT NULL DEFAULT false, true = cliente nao especificou especie
  - `parent_item_id` UUID REFERENCES order_items(id) ON DELETE CASCADE, se este item eh filho de um generico
  - `is_available` BOOLEAN DEFAULT NULL: NULL=nao verificado, true=disponivel, false=indisponivel
  - `availability_notes` TEXT: observacao da gerencia sobre disponibilidade
  - `created_at` TIMESTAMPTZ DEFAULT now()
- [x] Index: `idx_order_items_order_id` em `order_id`
- [x] Index: `idx_order_items_parent_item_id` em `parent_item_id`
- [x] CHECK constraint: se `is_generic = true` entao `species_id IS NULL`
- [x] CHECK constraint: se `is_generic = false AND parent_item_id IS NULL` entao `species_id IS NOT NULL`

**Logica de itens genericos:**
- Item generico: `is_generic=true, species_id=NULL, container_id=recipiente_minimo, quantity=500`
- Quando gerencia atribui especies, cria itens filhos:
  - `parent_item_id=id_do_generico, is_generic=false, species_id=X, container_id=Y, quantity=200`
  - `parent_item_id=id_do_generico, is_generic=false, species_id=Z, container_id=W, quantity=300`
- A soma das quantidades dos filhos deve ser igual a quantidade do pai
- O item pai fica como referencia, os filhos sao os itens reais do pedido
- Container dos filhos deve ter volume >= volume do container minimo do pai

### T1.4: Tabela `order_loads` (cargas / viagens)
- [x] Criar migracao `migrations/20260521100004_pedidos_order_loads.sql`
- [x] Campos:
  - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
  - `order_id` UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
  - `load_number` INTEGER NOT NULL: sequencial dentro do pedido (1, 2, 3...)
  - `status` VARCHAR(20) NOT NULL DEFAULT 'pendente', (pendente, separando, pronto)
  - `notes` TEXT
  - `created_at` TIMESTAMPTZ DEFAULT now()
  - `updated_at` TIMESTAMPTZ DEFAULT now()
- [x] UNIQUE constraint em (order_id, load_number)
- [x] Index: `idx_order_loads_order_id` em `order_id`

### T1.5: Tabela `order_load_items` (itens por carga)
- [x] Criar migracao `migrations/20260521100005_pedidos_order_load_items.sql`
- [x] Campos:
  - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
  - `load_id` UUID NOT NULL REFERENCES order_loads(id) ON DELETE CASCADE
  - `order_item_id` UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE
  - `quantity` INTEGER NOT NULL CHECK (quantity > 0), pode ser parcial (300 de 500)
  - `is_separated` BOOLEAN DEFAULT false: se ja foi fisicamente separado nesta carga
  - `created_at` TIMESTAMPTZ DEFAULT now()
- [x] UNIQUE constraint em (load_id, order_item_id), mesmo item nao aparece 2x na mesma carga
- [x] Index: `idx_order_load_items_load_id` em `load_id`

**Logica de cargas:**
- Ao aprovar pedido, se gerencia nao dividir em cargas, 1 carga eh criada automaticamente com todos os itens (quantidade total)
- Se gerencia divide: N cargas, cada uma com subset dos itens (quantidades parciais ou totais)
- Regra: soma de `order_load_items.quantity` por `order_item_id` across all loads == `order_items.quantity`
- Cada carga pode ter `is_separated` independente por item
- Carga so fica `pronto` quando todos seus `order_load_items.is_separated = true`
- Pedido so fica `pronto_envio` quando TODAS as cargas estao `pronto`

### T1.6: Tabela `order_status_history` (historico de status)
- [x] Criar migracao `migrations/20260521100006_pedidos_status_history.sql`
- [x] Campos:
  - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
  - `order_id` UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
  - `from_status` VARCHAR(30): NULL quando eh criacao
  - `to_status` VARCHAR(30) NOT NULL
  - `changed_by` UUID NOT NULL REFERENCES users(id)
  - `notes` TEXT
  - `created_at` TIMESTAMPTZ DEFAULT now()
- [x] Index: `idx_order_status_history_order_id` em `order_id`

### T1.7: Tabela `notifications` (notificacoes in-app)
- [x] Criar migracao `migrations/20260521100007_pedidos_notifications.sql`
- [x] Campos:
  - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
  - `user_id` UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - `type` VARCHAR(30) NOT NULL: (novo_pedido, pedido_verificado, pedido_aprovado, pedido_alterado, pedido_pronto)
  - `title` VARCHAR(255) NOT NULL
  - `message` TEXT
  - `link` VARCHAR(255): URL para onde navegar ao clicar
  - `read` BOOLEAN DEFAULT false
  - `created_at` TIMESTAMPTZ DEFAULT now()
- [x] Index: `idx_notifications_user_id_read` em (user_id, read)
- [x] Index: `idx_notifications_created_at` em `created_at`

### T1.8: Rodar migracoes e validar
- [x] Executar `npm run db:migrate` e confirmar que todas as tabelas foram criadas
- [x] Verificar com query `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`

## Notas Tecnicas
- Todas as migracoes devem ser idempotentes (usar `IF NOT EXISTS` onde possivel)
- UUIDs para PKs, consistente com o resto do schema
- `order_number` eh SERIAL para gerar numeros sequenciais automaticos, mais facil de referenciar verbalmente ("pedido 47")
- `is_available` usa NULL/true/false (tri-state): NULL = ainda nao verificado, permite distinguir de "verificado como indisponivel"
- ON DELETE CASCADE em order_items, status_history, loads e load_items porque nao fazem sentido sem o pedido pai
- `parent_item_id` permite rastrear quais itens especificos vieram de um item generico
- A separacao de cargas eh feita na Fase 6, nao no banco: o banco so armazena a estrutura
