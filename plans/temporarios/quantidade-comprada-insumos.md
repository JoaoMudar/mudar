# Quantidade Comprada — Cadastro de Insumos

**Data:** 2026-05-20
**Status:** Concluído

## Problema

Na aba de cadastro de insumos (`/admin/insumos`), só era possível registrar a **unidade de medida** e o **custo unitário**. Não havia campo para informar a **quantidade total comprada**, impossibilitando saber o estoque inicial e o custo total da compra.

## O que foi feito

### 1. Migração SQL

**Arquivo criado:** `migrations/20260520000001_add_quantity_purchased.sql`

```sql
ALTER TABLE inputs ADD COLUMN quantity_purchased NUMERIC(10,2);
```

- Coluna nullable para não quebrar dados existentes
- Rodada manualmente no banco local: `psql -U postgres -d viveiro`

### 2. Server Actions

**Arquivo alterado:** `src/app/admin/insumos/actions.ts`

- Adicionado `quantity_purchased: number | null` ao tipo `InputPayload`
- Atualizado `createInsumo()` — INSERT agora inclui `quantity_purchased` (8 parâmetros)
- Atualizado `updateInsumo()` — UPDATE agora inclui `quantity_purchased` (9 parâmetros, WHERE no $9)

### 3. Componente do Formulário

**Arquivo alterado:** `src/app/admin/insumos/InsumosManager.tsx`

- Adicionado `quantity_purchased` à interface `Input`
- Adicionado ao `emptyForm()` (valor inicial `null`)
- Adicionado ao `openEdit()` (carrega valor do item)
- **Formulário reorganizado:**
  - Linha 1: Custo/unid. (R$) | Qtd. comprada (com hint da unidade, ex: "kg")
  - Linha 2: Última compra | Total (R$) — calculado automaticamente (custo × quantidade), somente leitura
- **Listagem de cards:** exibe quantidade e total quando preenchidos

## Layout do formulário (resultado)

```
[Custo/unid. (R$)]    [Qtd. comprada (kg)]
[Última compra    ]    [Total: R$ 150,00  ]  ← calculado, read-only
```

## Arquivos tocados

| Arquivo | Ação |
|---------|------|
| `migrations/20260520000001_add_quantity_purchased.sql` | Criado |
| `src/app/admin/insumos/actions.ts` | Alterado |
| `src/app/admin/insumos/InsumosManager.tsx` | Alterado |

## Verificação

- Build (`next build`) passou sem erros
- Migração executada no banco local sem erros
