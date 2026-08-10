# Fase 2 — Schema `financeiro`

> As tabelas, as listas fechadas e as regras que não se negociam.
> **Não depende dos extratos — pode ser implementado já.**

## Nota sobre schemas nomeados

É a primeira vez no projeto. Até aqui tudo vivia em `public`. `cadastro` e `financeiro` são
schemas Postgres de verdade, criados por migration (`CREATE SCHEMA IF NOT EXISTS`).

**`search_path` não é usado.** O pool é singleton e compartilhado com o resto do app
(`src/lib/db.ts`), então toda query qualifica o schema: `financeiro.transactions`, nunca
`transactions`. É a mesma decisão que o `readmeBI.md` já documentava.

## As 9 tabelas

```
financeiro.accounts              10 contas (9 bancárias + CAIXA)
financeiro.cost_centers           5 centros
financeiro.category_groups       14 grupos
financeiro.categories            35 de saída + 9 de entrada
financeiro.statement_imports     lote de importação — rastreável e reversível
financeiro.transactions          ← A LINHA DO EXTRATO. A verdade.
financeiro.transaction_splits    rateio opcional entre centros
financeiro.classification_rules  "descrição X → categoria Y"
financeiro.periods               fechamento mensal (trava)
```

---

## `financeiro.transactions` — o coração

| Coluna | Papel |
|---|---|
| `id` | UUID PK |
| `account_id` | FK `financeiro.accounts` — **nada existe sem conta** |
| `import_id` | FK `statement_imports`; NULL se lançado à mão |
| `posted_at` | DATE — **quando o banco moveu**. Vem do extrato, imutável (regime de caixa) |
| `competence_date` | DATE NOT NULL — **a que mês o gasto pertence**. Default `posted_at` (regime de competência) |
| `amount` | NUMERIC(14,2) — **negativo = saída, positivo = entrada** |
| `installment_number` / `installment_total` | SMALLINT — `3` de `12`, quando parcelado |
| `installment_total_amount` | NUMERIC(14,2) — o valor cheio da compra parcelada |
| `description_raw` | TEXT — o que o banco escreveu. **Nunca editado.** É a prova. |
| `fitid` | TEXT — identificador único do movimento no OFX, quando houver |
| `dedupe_key` | TEXT — fallback p/ CSV: hash de conta+data+valor+descrição+ordinal |
| `balance_after` | NUMERIC(14,2) — saldo após o movimento, quando o extrato traz |
| `kind` | `despesa` \| `receita` \| `transferencia` \| `aporte` \| `retirada` \| `estorno` |
| `category_id` | FK `categories` — **só dropdown** |
| `cost_center_id` | FK `cost_centers` — NULL quando há rateio |
| `party_id` | FK `cadastro.parties` — com quem foi |
| `transfer_pair_id` | self-FK — a perna oposta da transferência |
| `order_id` | FK `public.orders` — entrada conciliada com um pedido |
| `supplier_quote_id` | FK `public.supplier_quotes` — saída conciliada com uma cotação |
| `status` | `a-classificar` \| `classificado` \| `conciliado` \| `ignorado` |
| `notes`, `classified_by`, `classified_at`, `created_at`, `updated_at` | rastro |

**Por que o sinal no valor, e não uma coluna de direção:** é como o OFX entrega, e faz
`SUM(amount)` ser o saldo do período direto, sem `CASE`.

### Por que duas datas (`posted_at` × `competence_date`)

O extrato só sabe regime de caixa: quando o dinheiro se moveu. Mas substrato comprado em
fevereiro, com nota vencendo em março e pago em abril, é **custo de fevereiro** — e num
viveiro, onde o custo se concentra na semeadura e a receita vem meses depois, tratar isso
como abril inventa e apaga meses inteiros de custo.

- `posted_at` — do banco. Nunca editado, como `description_raw`.
- `competence_date` — default `posted_at`; só se mexe quando diverge. **99% das linhas ficam
  no default**, então não pesa na classificação.

**É irreversível se não nascer agora.** Daqui a dois anos, com milhares de linhas
conciliadas, ninguém reconstrói a que mês cada uma pertencia — o dado se perde no instante
da classificação, não depois.

Regra de uso nas queries:

| Pergunta | Data | Quem consome |
|---|---|---|
| "Quanto saiu do caixa em março?" | `posted_at` | Saldo, fluxo, fechamento, conferência com o extrato |
| "Quanto custou produzir em março?" | `competence_date` | DRE, estrutura de custo, custeio (P1), margem (P3) |

**O fechamento mensal (`periods`) sempre usa `posted_at`** — é ele que precisa bater com o
saldo do banco. Competência não fecha caixa.

### Parcelamento

`installment_number` / `installment_total` / `installment_total_amount` existem porque uma
parcela isolada é 1/12 de uma decisão: o extrato mostra R$780 de IPVA em março e o BI conclui
que março foi caro, sem saber que existem mais onze. Com o total registrado, dá para ver a
compra inteira sem inventar uma tabela de contratos.

Preenchido à mão na classificação, só quando é parcelado. Fora isso, NULL.

**Anti-duplicata — a trava que faz reimportar ser seguro:**

```sql
UNIQUE (account_id, fitid) WHERE fitid IS NOT NULL
UNIQUE (account_id, dedupe_key)
```

Rodar o mesmo arquivo duas vezes não cria nada — `statement_imports` só registra
`rows_duplicated`. Sem isso, a primeira reimportação por engano dobra o mês inteiro em silêncio.

**Índices:** `(account_id, posted_at)`, `(competence_date)`, `(status)`, `(category_id)`,
`(cost_center_id)`, `(party_id)`.

---

## Listas fechadas — seed por migration, não por script

São configuração, não dado de usuário. Vão numa migration para que Neon e local nasçam iguais.

### `financeiro.accounts` — 10 contas

| code | Nome | Titular | Tipo |
|---|---|---|---|
| `CRESOL-PJ` | Cresol — empresa | empresa | corrente |
| `PAGBANK` | PagBank | empresa | pagamento |
| `BB` | Banco do Brasil | gilberto | corrente |
| `CRESOL-GB` | Cresol — pessoal (Gilberto) | gilberto | corrente |
| `CREDCREA` | CREDCREA | gilberto | corrente |
| `SICREDI` | Sicredi | gilberto | corrente |
| `VIACREDI` | Viacredi | glecira | corrente |
| `CRESOL-GL` | Cresol (Glecira) | glecira | corrente |
| `CAIXA` | Dinheiro em espécie | empresa | caixa |

Cada conta tem `opening_balance` + `opening_balance_date` — **o saldo em 31/12/2025**. É ele
que faz o saldo calculado fechar com o extrato a partir do marco zero.

`CAIXA` existe para que a regra "nenhum lançamento sem conta" não empurre o gasto em dinheiro
para fora do sistema.

### `financeiro.cost_centers` — 5 centros

| code | Nome | Natureza | Ativo |
|---|---|---|---|
| `viveiro` | Viveiro — matriz (Agrolândia) | negocio | sim |
| `sitio` | Sítio — filial (Itapema) | negocio | sim |
| `clinica` | Clínica de fonoaudiologia | pessoal | sim |
| `casa` | Casa — família | pessoal | sim |
| `floricultura` | Floricultura (extinta) | negocio | **não** |

`floricultura` fica inativa: não aparece nos dropdowns de lançamento novo, mas aceita
lançamento antigo quando o backlog retroceder até os anos em que ela existia.

**É o centro de custo que separa negócio de pessoal** — não há campo "natureza" na
transação. Foi assim que a planilha errou nos dois sentidos (R$48.793 de pessoal marcado
como negócio, R$63.311 de negócio marcado como pessoal): a natureza estava na linha, digitada.

### `financeiro.categories` — 35 de saída, em 14 grupos

| Categoria | Grupo |
|---|---|
| Impostos/Taxas | Tributos/Serviços |
| Licenças/Certificações ambientais | Tributos/Serviços |
| Contab./Serviços prof. | Tributos/Serviços |
| Material/Escritório | Tributos/Serviços |
| Insumos/Produção | Operacional produção |
| Mudas de terceiros/Revenda | Operacional produção |
| Sementes/Matrizes de terceiros | Operacional produção |
| Manutenção/Equipamento | Operacional |
| Saúde | Saúde |
| Mercado/Alimentação | Alimentação/Pessoal |
| Combustível | Veículos/Logística |
| Pedágio/Transporte | Veículos/Logística |
| Frete/Entrega a clientes | Veículos/Logística |
| Veículos – impostos/seguro | Veículos/Logística |
| Salário/Folha de pagamento | Pessoas |
| Mão de obra/Diaristas | Pessoas |
| Pró-labore/Retirada de sócio | Pessoas |
| Brindes/Confraternização | Pessoas |
| Bens/Investimento | Bens/Investimento |
| Construção/Reforma | Bens/Investimento |
| Educação | Educação |
| Assinaturas/Lazer | Pessoal família |
| Mesada/Família | Pessoal família |
| Viagem/Turismo | Pessoal família |
| Moradia/Condomínio | Ocupação/Utilidades |
| Energia | Ocupação/Utilidades |
| Água | Ocupação/Utilidades |
| Gás | Ocupação/Utilidades |
| Telefone/Internet | Ocupação/Utilidades |
| Seguros | Financeiro |
| Bancário/Financeiro | Financeiro |
| Empréstimos/Financiamentos – parcelas | Financeiro |
| Marketing/Publicidade | Marketing/Institucional |
| Doações/Institucional | Marketing/Institucional |
| Outros/Extraordinário | Outros |

**`Mudas de terceiros/Revenda` é a categoria que o BI antigo não tinha** — muda comprada de
outro produtor caía em Insumos/Produção. Uma migração separou 215 lançamentos / R$111.726,50;
em 2025 isso era R$28,9k de R$52,5k, ou seja **55% do "insumo" não era insumo.**

### Categorias de entrada — 9, no grupo `Entradas`

Não estavam na lista original (que só cobria gastos), mas são necessárias porque conciliamos
entradas também. **Confirmar com João na implementação:**

`Venda de mudas` · `Compensação ambiental` · `Serviço/Plantio` · `Receita da clínica` ·
`Aporte de sócio` · `Empréstimo recebido` · `Estorno/Devolução` · `Rendimento financeiro` ·
`Outras entradas`

Cada categoria tem `direction` (`saida` | `entrada` | `ambos`) para o dropdown só oferecer o
que faz sentido para o sinal do valor.

### Três observações sobre os grupos

Não bloqueiam nada — é higiene de fundação, para decidir antes de o seed existir:

1. **`Manutenção/Equipamento` está sozinha no grupo `Operacional`**, enquanto as outras três
   operacionais estão em `Operacional produção`. Vale unificar ou renomear.
2. **`Mercado/Alimentação` está em `Alimentação/Pessoal` e `Mesada/Família` em
   `Pessoal família`** — dois grupos pessoais quase iguais.
3. **`Saúde` e `Educação` são grupos de uma categoria só.** Funciona, mas o donut de
   estrutura de custo fica com fatias de item único.

---

## `financeiro.transaction_splits` — rateio

`transaction_id`, `cost_center_id`, `category_id` (NULL herda da transação), `amount`.

O caso comum não usa: 1 centro de custo vive direto em `transactions.cost_center_id`. O split
existe para o caso real de a energia do imóvel servir casa e clínica, ou o combustível de uma
viagem passar no viveiro e no sítio.

**Invariante:** havendo splits, `SUM(splits.amount) = transactions.amount`.
Validado na Server Action — testável e com mensagem legível — mais a view
`financeiro.vw_rateio_inconsistente` como rede de segurança. **Não trigger:** trigger falha
com erro de banco no meio da tela e não dá para testar com `vi.mock`.

## `financeiro.classification_rules` — a fila que encolhe

`pattern` + `match_type` (`contains` | `regex`), opcionalmente presa a uma conta, apontando
para `category_id` / `cost_center_id` / `party_id` / `kind`, com `priority`, `active` e
contador de `hits`.

Você classifica "CRESOL DEB AUT CELESC" uma vez; na importação seguinte já vem preenchido.
Ataca direto o defeito nº 6 do post-mortem: na planilha a fila sem categoria chegou a
**2.764 linhas / R$407.138,09** e crescia sozinha, porque cada linha nova nascia sem categoria.

## `financeiro.statement_imports` — o lote

`account_id`, `source_format`, `file_name`, `file_hash`, `period_start`, `period_end`,
`rows_total`, `rows_new`, `rows_duplicated`, `imported_by` (FK `users`), `created_at`.

Serve para duas coisas: saber de onde veio cada linha, e poder desfazer uma importação
inteira sem caçar linha por linha.

## `financeiro.periods` — a trava

`(account_id, year, month)` com `status` (`aberto` | `fechado`), `closing_balance`,
`closed_by`, `closed_at`.

Mês fechado não aceita edição. E **só mês fechado vira indicador** — resolve as lições nº 2 e
nº 3 do post-mortem de uma vez: "tem lançamento no mês" nunca significou "o mês está
completo", e comparar um período parcial com um período cheio inventa variação.

---

## As 8 regras invioláveis

1. **`description_raw` e `posted_at` nunca são editados** — são a prova de que a linha veio
   do banco.
2. **Saldo se apura por `posted_at`; custo se apura por `competence_date`.** Trocar as duas
   produz um número que parece certo e não é.
3. **Zero campo de texto livre** em classificação. Dropdown ou não existe. *(Campo de texto
   livre é dívida: categoria digitada à mão sempre vira categoria errada em escala.)*
4. **Transferência entre contas próprias não é despesa.** Sem `transfer_pair_id`, o R$ que
   saiu do BB e entrou no Cresol conta duas vezes.
5. **Nenhum lançamento sem conta.** Dinheiro em espécie entra pela conta `CAIXA`.
6. **Período aberto não vira indicador.** Mês incompleto mostra travessão.
7. **Agregação em CTE** (`GROUP BY ano, mes` uma vez, recorte com `FILTER`), nunca subquery
   escalar correlacionada sobre view empilhada — lição nº 6: 11 s → 130 ms.
8. **Migration sem guarda condicional.** `IF ... THEN RETURN` roda como no-op e mesmo assim é
   marcada como aplicada — foi o que deixou 6 migrations registradas no Neon sem terem criado
   nada. Migration falha alto ou não existe.

## Permissão

Tudo em `/financeiro` exige `requireRole('admin', 'chefia')`, no padrão do resto do sistema.
`src/middleware.ts` já protege a rota; o corte fino é nas Server Actions.

## Verificação

```sql
\dn                                              -- cadastro e financeiro listados
SELECT count(*) FROM financeiro.cost_centers;    -- 5
SELECT count(*) FROM financeiro.category_groups; -- 15 (14 de saída + Entradas)
SELECT count(*) FROM financeiro.categories;      -- 44
SELECT count(*) FROM financeiro.accounts;        -- 10
```

Mais: inserir a mesma transação duas vezes com o mesmo `fitid` → a segunda falha na UNIQUE;
dividir R$300 em 150/150 → aceita, em 150/100 → a action recusa e `vw_rateio_inconsistente`
segue vazia.
