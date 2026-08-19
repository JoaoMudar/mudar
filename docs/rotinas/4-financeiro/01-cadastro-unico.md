# Fase 1 — Cadastro único (schema `cadastro`)

> Pré-requisito do financeiro. **Não depende dos extratos — pode ser implementado já.**

## O problema

Hoje o cadastro de pessoas está partido em duas tabelas sem ligação, ambas em `public`:

- `customers` — quem compra. Tem campos fiscais completos (PF/PJ, documento, endereço).
- `suppliers` — quem vende muda para revenda. Tem só cidade/UF, sem documento nem endereço.

Três consequências:

1. **A mesma pessoa vira dois registros.** Márcio Kuhar vende muda (fornecedor) e pode
   comprar (cliente). São dois cadastros que não se sabem o mesmo.
2. **Falta todo mundo que não é nem um nem outro.** O dinheiro sai para funcionário, sócio,
   contador, banco, prefeitura, membro da família. Nenhuma das duas tabelas os representa.
3. **Endereço é coluna, não entidade.** `customers` tem um endereço embutido; um cliente com
   endereço de cobrança diferente do de entrega não cabe.

O financeiro precisa apontar "com quem foi" em cada linha do extrato — e essa contraparte
pode ser qualquer um dos seis papéis acima.

## A solução: aditiva, não migratória

Cria-se a identidade única **sem mexer no que existe**. `customers` e `suppliers` continuam
onde estão, com as mesmas colunas; ganham só um `party_id` apontando para a identidade.
Nenhuma tela, nenhuma Server Action e nenhum teste atual quebra.

```
cadastro.parties            quem é (pessoa ou empresa) — A IDENTIDADE
cadastro.party_roles        o que essa pessoa é para nós (N papéis por party)
cadastro.addresses          endereços (N por party)
        ▲                ▲
        │                └── public.suppliers.party_id   (NULL-able, aditivo)
        └─────────────────── public.customers.party_id   (NULL-able, aditivo)
        ▲
        └─────────────────── financeiro.transactions.party_id
```

### `cadastro.parties`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `kind` | `'pf'` \| `'pj'` | CHECK |
| `document` | VARCHAR(14) | só dígitos; **UNIQUE parcial** `WHERE document IS NOT NULL` — mesmo padrão do `idx_customers_document` |
| `name` | TEXT NOT NULL | nome usual (o que aparece nas listas) |
| `legal_name`, `trade_name` | TEXT | razão social / fantasia (PJ) |
| `email`, `phone`, `whatsapp` | | whatsapp só dígitos, como em `suppliers` |
| `notes`, `active` | | soft-delete via `active`, padrão do sistema |
| `created_at`, `updated_at` | TIMESTAMPTZ | trigger `set_updated_at()` |

### `cadastro.party_roles`

`(party_id, role)` UNIQUE. `role` é lista fechada:

`cliente` · `fornecedor` · `funcionario` · `socio` · `familiar` · `banco` · `governo` ·
`contador` · `outro`

Um party pode acumular papéis — é exatamente o caso do Márcio Kuhar.

### `cadastro.addresses`

`party_id`, `label` (`principal` | `entrega` | `cobranca` | `outro`), `zip_code`, `street`,
`number`, `complement`, `neighborhood`, `city`, `state(2)`, `ibge_code`, `lat`, `lng`,
`geocoded_at`, `is_primary`.

Reaproveita `src/lib/geocode.ts` e `src/lib/geo.ts`, que já geocodificam fornecedores para o
mapa da rede (P11 Fase 4).

## Backfill

Na própria migration, **sem guarda condicional** (lição nº 7 do post-mortem: migration com
`IF ... THEN RETURN` roda como no-op e ainda assim é marcada como aplicada):

1. Uma party para cada `customers`, herdando `person_type` → `kind`, `document`, `name`,
   `legal_name`, `trade_name`, `email`, `phone`. Papel `cliente`. Endereço vira uma linha em
   `addresses` quando houver CEP ou rua.
2. Uma party para cada `suppliers`, papel `fornecedor`, com `name`, `whatsapp`, `phone`,
   `email`, `city`, `state`, `lat`, `lng`.
3. **Casamento entre os dois:** por `document` quando os dois lados tiverem; por
   `lower(trim(name))` quando não. Encontrou → uma party só, com os dois papéis.
4. Grava o `party_id` de volta em `customers` e `suppliers`.

**Ambiguidade é aceita, não resolvida:** mesmo nome com documentos diferentes vira duas
parties. A fusão é manual depois — `src/app/clientes/actions.ts` já tem `mergeCustomers`
como precedente de UX para isso.

## O casamento é uma regra, não um evento (corrigido em 19/08/2026)

O backfill acima roda **uma vez**. Durante os primeiros dias, `createCustomer` e
`createSupplier` continuaram criando uma party nova a cada cadastro, sem procurar identidade
existente — então um fornecedor que virasse cliente ganhava um segundo registro e a
duplicidade voltava sozinha. Isso foi corrigido:

- **Procura antes de criar.** `findPartyMatch` (em `src/lib/parties.ts`) busca por `document`
  quando existe e por `lower(trim(name))` quando não, e **só devolve resultado se a identidade
  encontrada ainda não tiver o papel** que está sendo cadastrado — do contrário seria duplicata
  do mesmo papel, caso que o `idx_customers_document` já trata.
- **O sistema nunca une sozinho**, nem quando o documento bate. A tela pergunta *"É a mesma
  pessoa?"* e só liga se alguém confirmar. Mantém a linha do backfill — ambiguidade é aceita,
  não resolvida — e deixa a decisão com quem conhece as pessoas.
- **A pergunta também aparece ao editar**, não só ao cadastrar. É o caminho de conserto dos
  duplicados criados entre o backfill e a correção: abrir e salvar levanta a questão, sem
  precisar de tela de manutenção.
- **Unir clientes une as identidades.** `mergeCustomers` chama `mergeParties`, que move os
  papéis, completa as lacunas, repointa `customers`/`suppliers` e **apaga** a party redundante.
  O DELETE é exceção deliberada ao soft-delete do sistema: `idx_parties_document` é UNIQUE
  parcial e não filtra por `active`, então uma identidade inativa com documento prenderia
  aquele CPF/CNPJ para sempre.

## Convivência (o ponto delicado)

Depois do backfill, o mesmo nome existe em dois lugares: em `parties` e na coluna antiga de
`customers`/`suppliers`. Isso é dívida deliberada e temporária, com uma trava:

- **`parties` é a verdade de identidade** (nome, documento, contato, endereço).
- **`customers`/`suppliers` guardam o que é do papel** — `reliability_score`, `status` de
  outreach, notas comerciais.
- Enquanto as telas não migram, **toda escrita passa por um único arquivo**,
  `src/lib/parties.ts` (`upsertPartyFromCustomer`, `upsertPartyFromSupplier`), coberto por
  teste. Um ponto de estrangulamento é um lugar só onde a duplicidade pode divergir.
- **`undefined` ≠ `null` na identidade.** Chave ausente quer dizer "este formulário não conhece
  o campo" e preserva o que existe (o de fornecedor não tem documento); `null` quer dizer "o
  usuário apagou" e grava NULL. Antes as duas coisas eram a mesma — um COALESCE em todas as
  colunas —, e o efeito era que apagar um telefone errado em `/clientes` zerava
  `customers.phone` e **mantinha o valor errado** em `parties.phone`.
- **Exceção na hora de ligar:** ao vincular um cadastro a uma identidade que já existia,
  `fillOnly` desliga o apagar. O formulário preenchido ali nunca mostrou os dados do outro
  papel, então campo em branco é "não preenchi", e não "apague o que o fornecedor tinha".
- Uma fase futura faz as telas lerem de `parties` e remove as colunas duplicadas por migration.

## O que muda para quem usa

Na Fase 1, **nada**: era só fundação. Depois da correção de 19/08/2026, uma coisa só —
cadastrar (ou salvar) alguém cujo nome ou documento já existe em outro papel mostra um aviso
perguntando se é a mesma pessoa, com dois botões. Respondeu, o cadastro segue normalmente.
`/clientes`, `/fornecedores` e `/pedidos` continuam idênticos no resto.

O valor maior aparece na Fase 2, quando o financeiro tem para onde apontar.

## Verificação

```sql
\dn                                            -- lista o schema cadastro
SELECT count(*) FROM customers WHERE party_id IS NULL AND active;   -- 0
SELECT count(*) FROM suppliers WHERE party_id IS NULL AND active;   -- 0
SELECT document, count(*) FROM cadastro.parties
  WHERE document IS NOT NULL GROUP BY 1 HAVING count(*) > 1;        -- vazio
```

Candidatos a duplicata que ainda restem (nomes repetidos nesta lista são a mesma pessoa em
duas identidades — a fusão é manual, abrindo o cadastro e salvando):

```sql
SELECT p.id, p.name, array_agg(r.role) AS papeis
  FROM cadastro.parties p
  JOIN cadastro.party_roles r ON r.party_id = p.id
 GROUP BY p.id, p.name
HAVING count(*) = 1
 ORDER BY LOWER(TRIM(p.name));
```

Mais `npm test` (validação de documento em `src/lib/parties.ts`, reusando as funções de
`src/lib/customers.ts`) e uma passada em `/clientes`, `/fornecedores` e `/pedidos` no
`npm run dev`.
