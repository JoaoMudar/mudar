# P12 — Financeiro sobre extratos bancários

> Substitui a tentativa anterior de BI sobre a planilha (`DESPESAS AAAA.xls`), abandonada
> em 05/08/2026. **Leia o [post-mortem](../docs/postmortem-financeiro-bi.md) antes de
> escrever qualquer linha** — ele mede, com números da base real, por que a planilha não
> pode ser a fonte da verdade.
>
> Origem: conversa João — "encruzilhada organização financeira" (05/08/2026).
> Detalhamento por fase em [`docs/rotinas/rotina-financeiro/`](../docs/rotinas/rotina-financeiro/).

**Status: Fase 0 ✅ concluída (05/08/2026). Fase 1 pronta para começar.**
**Branch: `feat/conciliacao-bancaria`.**

---

## A ideia em 1 frase

**O extrato do banco vira a verdade. A planilha vira só a explicação dele.**

Hoje é o contrário: tenta-se encaixar a planilha (errada, incompleta) no extrato (real).
Nunca fecha. Invertendo, o erro de digitação e a omissão morrem sozinhos — porque nada
existe se não bater com um movimento do banco.

---

## Fase 0 — as 4 decisões (fechadas)

### 1. Marco zero: **01/01/2026**
Reconcilia 100% dali pra frente. Carrega **jan–jul/2026 primeiro** e retrocede depois.
Passado não se reconstrói à mão — já está no banco `notas_despesas` pra tendência.

### 2. Extrato manda
Todo lançamento nasce do extrato. Nada solto. Gasto em dinheiro entra pela conta `CAIXA`.
Concilia-se **entradas e saídas** — só assim o saldo fecha com o banco, que é a única
prova de que nenhuma linha ficou de fora.

### 3. Pessoal vs. empresa: pelo centro de custo
Não é um campo à parte. `viveiro` e `sitio` são negócio; `casa` e `clinica` são pessoal.
Retirada e aporte são `kind` próprio, não despesa.

### 4. Chega de digitar categoria
Tudo é lista fechada (dropdown). Sem campo aberto = sem typo.

**As 9 contas** (+ `CAIXA`):

| Titular | Contas |
|---|---|
| Empresa | Cresol (empresa), PagBank |
| Gilberto | BB, Cresol (pessoal), CREDCREA, Sicredi |
| Glecira | Viacredi, Cresol |

**Os 5 centros de custo:**

| code | Nome | Natureza | Ativo |
|---|---|---|---|
| `viveiro` | Viveiro — matriz (Agrolândia) | negócio | sim |
| `sitio` | Sítio — filial (Itapema) | negócio | sim |
| `clinica` | Clínica de fonoaudiologia (em casa) | pessoal | sim |
| `casa` | Casa — gastos da família | pessoal | sim |
| `floricultura` | Floricultura (extinta) | negócio | **não** — só aparece em extrato antigo |

**As 35 categorias em 14 grupos** — transcritas em
[`docs/rotinas/rotina-financeiro/02-schema-financeiro.md`](../docs/rotinas/rotina-financeiro/02-schema-financeiro.md).

---

## Como cada linha do extrato fica

```
data do banco | valor | descrição que o banco escreveu   ← imutável, é a prova
  + data de competência (default = a data do banco; muda só quando diverge)
  + conta   + centro de custo   + categoria   + contraparte (party)
  + tipo: despesa | receita | transferência | aporte | retirada | estorno
  + parcela (3/12 + valor total), quando for parcelado
  + liga (ou não) num pedido ou numa cotação de fornecedor
  + status: a-classificar | classificado | conciliado | ignorado
```

Só se gasta energia no que **não** casou. O resto o sistema casa sozinho — e o que você
classificar uma vez vira regra, então da próxima ele já vem preenchido.

---

## Caixa e competência — por que existem duas datas

**Regime de caixa** é quando o dinheiro se moveu; é o que o extrato registra.
**Regime de competência** é a que mês o gasto pertence; é o que a nota fiscal registra.

Os dois divergem o tempo todo: substrato comprado em fevereiro, nota vencendo em março,
pago em abril. Pelo caixa é despesa de abril. Pela competência é fevereiro. Num viveiro,
onde o custo se concentra na semeadura e a receita vem meses depois, essa diferença
**inventa e apaga meses inteiros de custo**.

Por isso `transactions` tem **duas datas**: `posted_at` (do banco, imutável) e
`competence_date` (default = `posted_at`, só se mexe quando diverge — 99% das linhas ficam
no default). Custa quase nada na classificação e é **irreversível se não for feito agora**:
daqui a dois anos, com milhares de linhas conciliadas, ninguém reconstrói a que mês cada uma
pertencia.

O BI passa a responder as duas perguntas, que são perguntas diferentes:

- *"Quanto saiu do caixa em março?"* → soma por `posted_at`. Pergunta de sobrevivência.
- *"Quanto custou produzir em março?"* → soma por `competence_date`. Pergunta de margem —
  é ela que alimenta o custeio (P1).

## Extrato é a espinha dorsal; lançamento na origem é a exceção

Empresa organizada lança pela competência (a nota vira contas a pagar) e usa o extrato como
**controle**, não como origem. Aqui a ordem se inverte de propósito, porque a origem manual
já foi testada e falhou: a planilha *era* o lançamento na origem, e faltavam R$299 mil só em
2026. **Lançamento manual falha por omissão, e omissão é invisível. Extrato falha por falta
de contexto, e contexto faltando é visível** — a linha está lá, pedindo classificação.

O lançamento na origem entra em **três lugares só**, onde a falta dele estraga o BI:

| Onde | Por quê |
|---|---|
| Notas de compra de insumo (substrato, tubete, semente, adubo) | É o que vira custo por muda. O extrato diz "R$3.400 Agro Comercial"; a nota diz 40 sacos a R$85. |
| Gasto parcelado (financiamento, IPVA, seguro, maquinário) | Uma parcela é 1/12 de uma decisão. Sem o total, o custo mensal não explica nada. Resolvido pelos campos de parcela. |
| Pagamento que atravessa o mês | Nota de dezembro paga em janeiro. 5 ou 6 casos por ano — exceção tratada, não rotina. |

Todo o resto (mercado, combustível, energia, mesada, pedágio) nasce e morre no extrato.

---

## Rotina: semanal para classificar, mensal para fechar

**Toda sexta-feira, 5 min** — classificar o que entrou na semana.
Não é preciosismo: é memória. Um PIX de R$1.200 para "JOSE M SILVA" você sabe o que foi na
terça. No dia 32 você não sabe, chuta, ou joga em `Outros/Extraordinário` — que é onde a
informação morre. A carga total é a mesma; a qualidade da classificação não.

**Dia 1 de cada mês, 15 min** — o fechamento formal:

1. Baixa o extrato do mês fechado (OFX de preferência).
2. Importa — não digita, o arquivo entra inteiro.
3. Sistema casa automático por valor + data + regras aprendidas.
4. O que sobrou (pouco, se a rotina semanal rodou): classifica no dropdown.
5. Zerou a fila → confere o saldo contra o extrato → **fecha o mês. Trava.**

Só mês fechado vira indicador. Mês aberto mostra travessão, nunca um número que parece verdade.

---

## Arquitetura em 1 tela

```
cadastro.parties            ← quem é (pessoa/empresa). Identidade única.
cadastro.party_roles          cliente | fornecedor | funcionário | sócio | banco | governo…
cadastro.addresses
        ▲            ▲
        │            └── public.suppliers.party_id   (aditivo — nada quebra)
        └─────────────── public.customers.party_id   (aditivo — nada quebra)
        ▲
        │
financeiro.transactions     ← A LINHA DO EXTRATO. A verdade.
        ├── accounts (10)         contas + saldo de abertura
        ├── cost_centers (5)      lista fechada
        ├── category_groups (14) / categories (35 saída + 9 entrada)
        ├── transaction_splits    rateio opcional entre centros
        ├── statement_imports     lote de importação, rastreável e reversível
        ├── classification_rules  "descrição X → categoria Y" (a fila encolhe)
        └── periods               fechamento mensal (trava)
```

Detalhe de cada tabela em
[`docs/rotinas/rotina-financeiro/02-schema-financeiro.md`](../docs/rotinas/rotina-financeiro/02-schema-financeiro.md).

---

## Regras invioláveis (do post-mortem — não repetir os erros)

1. `description_raw` e `posted_at` **nunca** são editados — são a prova de que a linha veio
   do banco.
2. **Saldo se apura por `posted_at`; custo se apura por `competence_date`.**
3. **Zero campo de texto livre** em classificação. Dropdown ou não existe.
4. **Transferência entre contas próprias não é despesa** — senão o mesmo R$ conta duas vezes.
5. **Nenhum lançamento sem conta.** Dinheiro em espécie → conta `CAIXA`.
6. **Período aberto não vira indicador.**
7. **Agregação em CTE**, nunca subquery escalar correlacionada sobre view empilhada
   (lição nº 6: 11 s → 130 ms).
8. **Migration sem guarda condicional** (lição nº 7: roda como no-op e mesmo assim é
   marcada como aplicada).

---

## Fases

- [x] **Fase 0 — João:** contas, centros de custo, categorias e marco zero. *(05/08/2026)*
- [ ] ✅ **Fase 1 concluída em 11/08/2026** (feita pelo P13 T13.1–T13.2 — era a mesma fase).

**Fase 1 — schema `cadastro`:** `parties`, `party_roles`, `addresses`, `party_id` em
      `customers`/`suppliers` + backfill. `src/lib/parties.ts` + testes.
      **Não depende dos extratos — pode começar já.**
- [ ] **Fase 2 — schema `financeiro`:** as 9 tabelas + seed das listas fechadas
      (5 centros, 14 grupos, 44 categorias, 10 contas). Nenhuma tela ainda.
      **Também não depende dos extratos.**
- [ ] **Fase 3 — entrada de dados:** ⏸ *aguarda João juntar os extratos das 9 contas.*
      Formatos prováveis: OFX na maioria, CSV/Excel em algumas. O desenho só é escrito
      com os arquivos reais na mesa — a tabela já aceita qualquer origem.
- [ ] **Fase 4 — a fila:** `/financeiro/lancamentos`, classificação em 3 toques, rateio,
      transferência. É aqui que o trabalho humano acontece; o resto é suporte.
- [ ] **Fase 5 — automação e trava:** `classification_rules` + fechamento mensal +
      conferência de saldo calculado × saldo do extrato.
- [ ] **Fase 6 — amarração:** vínculo com `orders` e cotações; custo mensal do centro
      `viveiro` alimentando P1 (custeio); primeiros painéis, só sobre meses fechados.

---

## 3 armadilhas que afundam o plano

1. Fundação frouxa (centros de custo mal definidos) → bagunça de novo.
2. Querer reconciliar a história inteira → desiste no meio. **Marco zero é sagrado.**
3. Rotina não virar hábito → apodrece em 3 meses. Fechamento mensal no calendário.

---

## Aproveitável do que já existe

| Item | Onde | Serve pra quê |
|---|---|---|
| `formatCurrency` / `formatDate` / `formatPct` pt-BR | `src/lib/format.ts` | Toda tela de número |
| `ChartCard`, `StatTile`, paleta validada | `src/components/charts/` | Painéis, quando houver o que mostrar |
| Validação de CPF/CNPJ/CEP/UF | `src/lib/customers.ts` | `cadastro.parties` |
| Geocoding de endereço | `src/lib/geocode.ts`, `src/lib/geo.ts` | `cadastro.addresses` |
| Padrão de import por colagem de texto | `src/lib/supplier-paste.ts` | Extrato que só sai em PDF |
| Banco histórico (42.666 linhas, 2003–2026) | Postgres local, banco `notas_despesas` | Tendência e conciliação do passado |
| Regras críticas do banco histórico | `readmeBI.md` | Ler antes de qualquer query nele |
| Por que a abordagem anterior falhou | `docs/postmortem-financeiro-bi.md` | Não repetir |
