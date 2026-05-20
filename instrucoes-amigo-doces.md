# Instruções para montar o banco PostgreSQL - Doceria

## 1. Instalar o PostgreSQL

Se ainda não tem, baixa e instala:
- **Windows**: https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql@17`
- **Linux**: `sudo apt install postgresql`

## 2. Criar o banco de dados

Abre o terminal (ou o **psql**) e roda:

```bash
psql -U postgres
```

Dentro do psql:

```sql
CREATE DATABASE doceria;
\c doceria
```

## 3. Criar a função auxiliar (trigger de updated_at)

Isso faz o campo `updated_at` atualizar sozinho quando tu edita um registro:

```sql
CREATE FUNCTION set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

## 4. Criar os ENUMs (categorias)

```sql
-- Categorias de custo fixo (serve pra qualquer negócio)
CREATE TYPE fixed_cost_category AS ENUM (
    'salarios',
    'energia',
    'agua',
    'manutencao',
    'combustivel',
    'depreciacao',
    'outros'
);

-- Categorias de insumo (adapta pro teu negócio)
CREATE TYPE input_category AS ENUM (
    'farinha',
    'acucar',
    'chocolate',
    'embalagem',
    'outros'
);
```

> **Dica**: muda os valores do `input_category` pro que fizer sentido pra ti (leite, manteiga, corante, etc).

## 5. Criar as tabelas

### 5.1 Produtos (o que tu vende)

```sql
CREATE TABLE products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    notes text,
    photo_url text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_products_active ON products (active);

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.2 Insumos (ingredientes e materiais)

```sql
CREATE TABLE inputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    category input_category NOT NULL,
    unit_of_measure text NOT NULL,       -- ex: 'kg', 'litro', 'unidade'
    cost_per_unit numeric(10,2),
    supplier text,
    last_purchase_date date,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_inputs_category ON inputs (category);

CREATE TRIGGER inputs_updated_at
    BEFORE UPDATE ON inputs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.3 Histórico de preço dos insumos

Toda vez que o preço de um insumo mudar, registra aqui pra ter o histórico:

```sql
CREATE TABLE input_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    input_id uuid NOT NULL REFERENCES inputs(id) ON DELETE CASCADE,
    cost_per_unit numeric(10,2) NOT NULL,
    changed_at timestamptz DEFAULT now() NOT NULL,
    notes text
);

CREATE INDEX idx_input_price_history ON input_price_history (input_id, changed_at DESC);
```

### 5.4 Custos fixos mensais

```sql
CREATE TABLE fixed_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    category fixed_cost_category NOT NULL,
    monthly_amount numeric(12,2) NOT NULL,
    reference_month date NOT NULL,       -- primeiro dia do mês, ex: '2026-05-01'
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_fixed_costs_month ON fixed_costs (reference_month);
```

### 5.5 Custos de produção por produto

```sql
CREATE TABLE production_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES products(id),
    ingredient_costs_json jsonb DEFAULT '[]' NOT NULL,  -- lista dos insumos usados
    labor_minutes numeric(8,2) DEFAULT 0 NOT NULL,
    labor_cost numeric(10,2) DEFAULT 0 NOT NULL,
    packaging_cost numeric(10,2) DEFAULT 0 NOT NULL,
    total_variable_cost numeric(12,2) GENERATED ALWAYS AS (
        labor_cost + packaging_cost
    ) STORED,
    calculated_at timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (product_id)
);

CREATE INDEX idx_production_costs_product ON production_costs (product_id);
```

> **Nota**: o `ingredient_costs_json` guarda algo tipo:
> ```json
> [{"input": "Chocolate 70%", "qty": 0.5, "unit": "kg", "cost": 15.00}]
> ```
> Assim tu tem o detalhe de cada ingrediente por produto.

### 5.6 Uso de insumos (registro de consumo)

```sql
CREATE TABLE input_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    input_id uuid NOT NULL REFERENCES inputs(id),
    product_id uuid NOT NULL REFERENCES products(id),
    quantity numeric(10,3) NOT NULL CHECK (quantity > 0),
    usage_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_input_usages_date ON input_usages (usage_date);
CREATE INDEX idx_input_usages_input ON input_usages (input_id);
CREATE INDEX idx_input_usages_product ON input_usages (product_id);
```

## 6. Pronto! Testar

Pra ver se tudo foi criado:

```sql
\dt
```

Deve listar: `products`, `inputs`, `input_price_history`, `fixed_costs`, `production_costs`, `input_usages`.

---

## O que NÃO está incluído aqui (coisas específicas do viveiro)

O banco original tem algumas coisas que são do nosso negócio de mudas e não fazem sentido pra doceria:

- **`species`** e **`species_category`** — cadastro de espécies de plantas nativas (frutífera, ornamental, madeira, etc)
- **`containers`** — tipos de recipiente de muda (tubete, saco plástico por tamanho, balde)
- **`seed_collection_costs`** — custos de coleta de sementes no mato (distância em km, combustível, quantidade de sementes)
- **`species_unit_cost`** (view) — cálculo de custo unitário por espécie+recipiente com rateio de custo fixo

Se um dia precisar de algo tipo "custo unitário por doce com rateio de custo fixo", a gente pode adaptar aquela view pra ti. Manda um salve!
