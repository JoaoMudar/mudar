# Log da Migração Local → Neon (2026-05-20)

## Contexto
Banco PostgreSQL local precisava ser migrado para o Neon (serverless Postgres) para que o sistema ficasse acessível via Vercel. O plano de implementação estava em `vercel-neon.md`, com T1, T5 e T6 já concluídos.

---

## O que foi feito

### 1. Conexão com o Neon (T2)
- Connection string recebida: `postgresql://neondb_owner:...@ep-crimson-dew-ac59o0lc-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require`

### 2. Restauração do dump (T3)
- Executado `psql <connection_string> < dump.sql` — rodou sem erros
- Porém, ao verificar, as tabelas estavam **vazias**
- Investigação revelou que o `dump.sql` tinha os comandos `COPY ... FROM stdin;` seguidos imediatamente de `\.`, ou seja, o dump foi gerado quando o banco local já estava com tabelas vazias (schema-only na prática)

### 3. Migração dos dados via script Node.js (T3 complemento)
- Verificação do banco local: **142 espécies** em `species`, demais tabelas vazias (`inputs`, `containers` = 0)
- `pg_dump` não estava no PATH do Windows, então a migração foi feita via Node.js
- Script usou `pg` para ler do banco local e `@neondatabase/serverless` (função `neon()`) para inserir no Neon
- 142 registros inseridos com `ON CONFLICT (id) DO NOTHING`
- Erro no `setval('species_id_seq')` ignorado — coluna `id` é UUID, não tem sequence

### 4. Verificação (T4)
- 7 tabelas confirmadas no Neon: `containers`, `fixed_costs`, `inputs`, `production_costs`, `seed_collection_costs`, `species`, `species_unit_cost`
- 142 espécies confirmadas via query

### 5. Teste local apontando pro Neon (T7)
- `.env.local` alterado: `DATABASE_URL` trocada de localhost para Neon (URL local ficou comentada)
- `npm run dev` testado — espécies aparecem corretamente

### 6. Verificação no Vercel (T8–T11)
- Build no Vercel passando
- Espécies aparecem na URL pública do Vercel
- Testado no celular Android — funcionando (T14)

### 7. Configuração do `.env.local` (T13)
- Adicionado `NEXT_PUBLIC_APP_URL=https://viveiro-mudar.vercel.app`

---

## Estado final do `.env.local`
```
# DATABASE_URL=postgresql://postgres:Giba15%25@127.0.0.1:5432/viveiro
DATABASE_URL=postgresql://neondb_owner:...@ep-crimson-dew-ac59o0lc-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
NEXT_PUBLIC_APP_URL=https://viveiro-mudar.vercel.app
```

## Pendências
- **T12** — Domínio personalizado (viveiromudar.com.br) não configurado ainda
- **T15** — Novo dump de referência após migração confirmada

## Observações
- O driver `@neondatabase/serverless` com a função `neon()` (HTTP) funciona bem no Windows/dev; o `Pool` do Neon deu erro de WebSocket (`non-101 status code`) no ambiente local
- `db.ts` usa `NeonPool` em produção e `pg.Pool` em dev — funciona corretamente nos dois ambientes
