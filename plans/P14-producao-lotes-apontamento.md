# P14: Lotes, canteiros e apontamento de tarefas

> Origem: conversa João (24/08/2026), levantamento da rotina de produção.
> Domínio em [`docs/rotinas/2-producao/04-lotes-e-canteiros.md`](../docs/rotinas/2-producao/04-lotes-e-canteiros.md)
> e [`docs/rotinas/2-producao/05-apontamento-de-tarefas.md`](../docs/rotinas/2-producao/05-apontamento-de-tarefas.md).

**Status: engenharia e banco concluídos (24/08/2026). Nenhuma tela construída.**

> **Este plano começa onde os outros terminam.** A rodada de 24/08 fez **toda a engenharia e
> todas as migrations**: as **dezesseis tabelas novas**, em 7 migrations, existem no banco local,
> a carga das 22 tarefas e dos 2 turnos está lá, e a prova de que o modelo fecha rodou de ponta a
> ponta. O que falta é **aplicação**: Server Actions, telas e testes.

> **Conferência de 24/08, depois das migrations.** O modelo foi confrontado com o banco migrado,
> coluna por coluna, e nove correções entraram: o recorte implementado de `C6`/`C8` (que ainda
> dava as dezesseis como não implementadas), `labor_rates`, três colunas ausentes dos documentos,
> `input_stock_entries.transaction_id`, **RF-106 / UC-56 / TA-85** para a entrada de insumo, que
> não tinha requisito, o saldo do lote (mantido pela aplicação, não por gatilho), as figuras 6 e 13
> em português e as contagens de quatro documentos. Detalhe na quinta passada de
> [`docs/auditoria-divergencias.md`](../docs/auditoria-divergencias.md).

---

## A ideia em 1 frase

**O viveiro passa a ter endereço.** Cada leva de mudas ocupa um canteiro identificado, e cada
tarefa de campo diz em que leva foi trabalhada, por quem e por quanto tempo.

---

## As 5 decisões (fechadas em 24/08/2026)

### 1. Lote entrou no escopo, e a decisão está justificada por escrito
Estava excluído em `A1` §7 e fora do glossário em `A2`, enquanto o `P2` já o assumia: divergência
não catalogada, registrada agora como **achado L** da auditoria. O limite não sumiu, subiu de
altura: **rastreamento vai até o lote, nunca até a muda**.

### 2. Um lote ocupa um canteiro
Leva que não cabe em um canteiro é **outro lote**. Garantido por índice único parcial, não por
validação de tela.

### 3. Repicagem cria lote filho
A muda que muda de recipiente virou outro produto. A repicagem baixa parte do lote de origem e
cria um novo apontando para ele: é a cadeia que responde quantas mudas saíram de mil sementes.

### 4. Apontamento híbrido: real quando existe, turno quando não
Horas vêm do intervalo apontado; onde ninguém apontou, assume-se o turno planejado, marcado como
não confirmado. **Quem aponta é quem coordena, não o funcionário**: preserva a decisão de `B2` §4
contra controle de ponto.

### 5. Uma tarefa, vários executores
`assignments` perdeu `party_id` para `assignment_members`. Metade da equipe enchendo saquinho
enquanto a outra repica é a norma do viveiro.

---

## Impacto nos documentos de engenharia (TCC)

Todos já aplicados em 24/08/2026.

| Doc | O que mudou | Gravidade |
|---|---|---|
| `A1` | §7: lote saiu do fora-de-escopo, com justificativa; entrou "rastreamento individual da muda" | 🔴 alta |
| `A2` | §6 nova (Trabalho e agenda); verbetes Lote, Área, Canteiro, Classificação; "Lote" saiu dos não adotados | 🔴 alta |
| `B2` | RF-80 a RF-105; §2.2.4, §2.3.4, §2.3.5 e §2.3.6 novas; RF-70 movido e emendado | 🔴 alta |
| `B3` | RN-74 a RN-90; RN-48 e RN-51 emendadas; ressalvas §2.4 de três para cinco | 🔴 alta |
| `B4` | Quadros 3, 9 e 10 | 🟠 média |
| `B5` | 26 linhas novas; §5.5 reescrita: a lacuna de teste da agenda fechou | 🟠 média |
| `C1` | UC-46 a UC-55; subsistemas Lotes e Apontamento no §2 | 🟠 média |
| `C2` | UC-47, UC-48, UC-50 e UC-51 detalhados; UC-17 emendado (o quinto campo entrou sem virar campo) | 🟠 média |
| `C6` / `C8` | 46 → **55 entidades** e 1 → **2 visões**; `production_activities` virou `task_executions` | 🔴 alta |
| `modelo-dados-pt` | 12 → **15 figuras**, com renumeração; conceitual dividido em dois | 🔴 alta |
| `D4` | 7 recursos novos; §3.13, §3.14 e §3.15 | 🟠 média |
| `E2` | §5.1 nova: TA-59 a TA-85 | 🟠 média |
| `src/lib/permissions.ts` | 7 recursos, conferidos contra o `D4` por teste | 🟠 média |

---

## Fase 0: engenharia e banco ✅ concluída em 24/08/2026

- [x] **T14.1** `A2` e `A1`: glossário e revisão de escopo do lote
- [x] **T14.2** `auditoria-divergencias.md`: achado L e a resolução
- [x] **T14.3** `B3`: RN-74 a RN-90; RN-48 e RN-51 emendadas
- [x] **T14.4** `B2`: RF-80 a RF-105
- [x] **T14.5** `C1` e `C2`: UC-46 a UC-55; quatro detalhados
- [x] **T14.6** `C6`, `C8` e `modelo-dados-pt`: 55 entidades, 15 figuras regeradas
- [x] **T14.7** `D4` e `src/lib/permissions.ts`: 7 recursos, teste verde
- [x] **T14.8** `E2`: TA-59 a TA-85
- [x] **T14.9** `B5` e `B4`: rastreabilidade e quadros
- [x] **T14.10** rotinas: `01` reescrita, `04-lotes-e-canteiros.md` e `05-apontamento-de-tarefas.md`
- [x] **T14.11** 7 migrations, aplicadas no Postgres local
- [x] **T14.12** prova de que o modelo fecha, rodada no banco

## Fase 1: cadastro do viveiro

- [ ] **T14.13** `/cadastros/areas`: CRUD de área e canteiro numa tela só (RF-80, RF-81)
- [ ] **T14.14** `/cadastros/tipos-tarefa`: CRUD com categoria, medição e exigências (RF-70)
- [ ] **T14.15** `/admin/configuracoes`: `settings` e período de trabalho (RF-83)
- [ ] **T14.16** ligar os três em `src/lib/modules.ts` (o teste de navegação quebra sem isso)

## Fase 2: lotes

- [ ] **T14.17** `src/lib/batches.ts`: criar, movimentar e encerrar, com o saldo mantido na mesma transação do movimento
- [ ] **T14.18** `/producao/lotes`: ocupação por área e canteiro (RF-85)
- [ ] **T14.19** `/producao/lotes/novo`: criar lote, com canteiros livres na lista (RF-84)
- [ ] **T14.20** `/producao/lotes/[id]`: ficha e histórico de movimentos (RF-87)
- [ ] **T14.21** repicagem gerando lote filho, com a perda no mesmo gesto (RF-86, UC-48)
- [ ] **T14.22** perda e contagem a partir do lote; migrar `/producao/perdas` para pedir lote (RF-91)

## Fase 3: agenda da semana

- [ ] **T14.23** `/producao/agenda`: grade semanal, com grupo por célula (RF-71, RF-92)
- [ ] **T14.24** copiar semana passada e tarefas recorrentes (RF-72)
- [ ] **T14.25** lançar para intervalo de dias (RF-93)
- [ ] **T14.26** publicar e fechar a semana (RF-73)
- [ ] **T14.27** versão mobile: um dia por tela

## Fase 4: apontamento

- [ ] **T14.28** `/producao/agenda/hoje`: planejado do dia e um cartão por funcionário (RF-94)
- [ ] **T14.29** iniciar apontamento encerrando o aberto, na mesma transação (RF-95, RF-97)
- [ ] **T14.30** encerrar tarefa: quantidade só quando a medição pedir (RF-98)
- [ ] **T14.31** encerrar o dia, e reabrir quando foi engano (RF-96)
- [ ] **T14.32** insumos e gasto extra no encerramento, com a fila offline já existente (RF-101, RF-104)
- [ ] **T14.33** `/producao/insumos/saldo`: a visão `input_stock_balance` (RF-102, RF-103)
- [ ] **T14.34** `/minhas-tarefas` para o colaborador (RF-74)

## Fase 5: custo de mão de obra

- [ ] **T14.35** `labor_rates`: manter o valor-hora do mês
- [ ] **T14.36** horas do período: apontadas quando há, do turno quando não (RF-100)
- [ ] **T14.37** custo de mão de obra por espécie e por lote, entrando em `species_unit_cost`
- [ ] **T14.38** painel de planejado × realizado (RF-76)

---

## Critérios de aceite

- [ ] TA-59 a TA-84 de [`E2`](../docs/engenharia/E-qualidade/E2-casos-de-teste-de-aceite.md) executados
- [ ] `npm test` verde, com testes de Server Action para lote e apontamento
- [ ] A grade da semana é preenchida em menos de 10 minutos por quem coordena
- [ ] Trocar um funcionário de tarefa leva **dois toques** na agenda do dia
- [ ] O custo unitário de uma espécie passa a incluir mão de obra

---

## Reconciliação com os planos existentes

**Absorve `P2` T2.1 a T2.7.** Aquele plano previa `batches`, `batch_counts` e
`mortality_thresholds` para Supabase. As tabelas entram com nomes reconciliados: `batches` +
`batch_movements` no lugar de `batches` + `batch_counts`, e a contagem física passa a ser
`stock_counts` com `batch_id`, sem entidade paralela. `mortality_thresholds` virou uma chave em
`settings` (`producao.mortalidade_limite_pct`): é **um valor**, não uma lista de coisas.

**Continua `P13` Fases 3 a 5.** T13.9 (migration da agenda) está feita aqui, em
`20260824000005_producao_agenda.sql`, com `assignments` já no formato de grupo. T13.10 a T13.21
seguem válidas e correspondem às Fases 3 a 5 acima.

**Depende de `P13` T13.3 e T13.7**: `users.party_id` e o CRUD de funcionários. A agenda escala
`cadastro.parties`, e sem a tela de funcionário não há quem escalar.
