# P13: Cadastro único + Agenda de pessoal

> Origem: conversa João, revisão das rotinas do sistema (10/08/2026).
> Domínio em [`docs/rotinas/1-cadastros/00-visao-geral.md`](../docs/rotinas/1-cadastros/00-visao-geral.md) e
> [`docs/rotinas/2-producao/`](../docs/rotinas/2-producao/).

**Status: desenho fechado. Implementação não iniciada.**

---

## A ideia em 1 frase

**Uma área só para os cadastros, e uma grade semanal para saber quem faz o quê**: a agenda
é a única fonte possível de horas, e horas são a peça que falta para o custo ser real.

---

## As 4 decisões (fechadas em 10/08/2026)

### 1. Mão de obra: horas individuais, valor-hora médio
A agenda registra horas **por pessoa**; o custo usa um valor-hora **médio da equipe**
(folha do mês ÷ horas do mês). Preserva a resolução de conflito de B2 §4: nada de controle
de ponto individual: e ainda assim produz custo real, porque o que varia entre espécies é o
tempo gasto, não quem gastou.

### 2. Funcionário é `cadastro.parties`, não `users`
Papel `funcionario` em `party_roles`. `users` vira só credencial, com FK opcional para party.
Colaborador sem login existe normalmente na agenda e no financeiro.

### 3. Cadastro único é agrupador de navegação
Área `/cadastros` reunindo as telas. **Nenhuma tabela muda de schema.** `species`,
`containers` e `inputs` continuam em `public`; pessoas em `cadastro.parties`.

### 4. "Tarefas" no cadastro = catálogo de tipos
Semeadura, repicagem, irrigação, limpeza de canteiro. As tarefas atribuídas são movimento e
vivem na agenda.

---

## Impacto nos documentos de engenharia (TCC)

Estas incongruências foram encontradas e **precisavam de revisão** antes da entrega do Cap. 4.
Todas resolvidas em 19/08/2026, exceto as duas declaradas como fora de escopo:

| Doc | O que muda | Gravidade |
|---|---|---|
| **B2 §2.2.2, §2.3.1 e §2.5.1** | ✅ feito em 19/08/2026: **RF-69 a RF-76** escritos: funcionário e tipo de tarefa em Cadastros, agenda/recorrência/fechamento/conclusão em Produção, valor-hora e mão de obra no custo em Financeiro. O B2 passou de 68 para 76 RF. | - |
| **B2 §5 Conflitos** | ✅ feito em 19/08/2026: reescrito para turno de 4h × valor-hora médio da equipe, com a tensão original preservada. | - |
| **C1 §2 Subsistemas** | ✅ resolvido em 19/08/2026: os subsistemas passaram a ser agrupados nos quatro módulos e **Cadastros** virou o módulo 1, com Clientes e Fornecedores dentro. Falta só ligar a ele os UCs novos da linha seguinte. | - |
| **C1 §4 / C2** | ✅ feito em 19/08/2026: **UC-41 a UC-44** (manter funcionário, manter tipos de tarefa, montar a agenda, concluir tarefa do dia), nos diagramas por ator e no catálogo; UC-40 repontado para RF-74. C1 passou de 40 para 44 casos. **C2 fica de fora de propósito:** ele detalha 8 casos escolhidos, não os 44. | - |
| **C6 MER** | ✅ feito em 19/08/2026: as quatro entidades nos módulos a que pertencem (`task_types` em Cadastros, `week_plans`/`assignments` em Produção, `labor_rates` em Financeiro), mais `production_activities.assignment_id` e `users.party_id`, ambos opcionais. | - |
| **C8 Dicionário** | ✅ feito em 19/08/2026: as quatro entidades com atributo a atributo, na ordem dos módulos. | - |
| **D4 RBAC** | ✅ feito em 19/08/2026: linhas `Funcionários` e `Tarefas` na matriz e a regra **§3.11**: a tarefa é a primeira permissão que depende do registro, e não do perfil. | - |
| **G2 Indicadores** | ⛔ **não fazer agora**, decidido em 19/08/2026. Os três eram "possíveis", não pedidos: criar ficha para indicador que ninguém encomendou é inventar escopo, e cada ficha do G2 tem meta e responsável, que teriam de ser inventados junto. Reabrir quando a agenda estiver rodando e houver o que medir. | - |
| **B5 Rastreabilidade** | ✅ feito em 19/08/2026: oito linhas novas, e as duas lacunas de recurso sem requisito (`Funcionários`, `Tarefas`) fechadas. | - |
| **`docs/rotinas/2-producao/99-tarefas-diarias-historico.md`** | ✅ já resolvido: absorvido pela Produção, arquivo mantido como histórico. | - |

> **Nota para o TCC:** a absorção de "Tarefas Diárias" pela Produção **corrige uma
> incongruência que já existia**: `docs/rotinas/` tratava tarefas como rotina separada,
> enquanto C1 já mapeava UC-40 → RF-20 (produção). O domínio agora reflete a engenharia.

---

## Fase 1: Cadastro de pessoas (pré-requisito)

Compartilhada com o P12 Fase 1. **Fazer uma vez, serve aos dois.**

> ✅ **T13.1 e T13.2 concluídas em 11/08/2026**, migration
> `20260811000004_cadastro_unico_parties.sql` (aditiva; backfill de 10 clientes e 15 fornecedores
> verificado no Postgres local) e `src/lib/parties.ts` com 27 testes. Nenhuma tela mudou.
> **T13.3 (`users.party_id`) segue pendente.**
>
> Duas coisas divergiram da especificação e ficam registradas: `suppliers` **não tem** coluna
> `document`, então 100% do casamento cliente↔fornecedor cai em `lower(trim(name))`; e as quatro
> colunas sem destino declarado: `customers.state_registration`, `customers.ie_exempt`,
> `suppliers.contact_name`, `suppliers.instagram`, **ficam onde estão**, por serem atributos do
> papel e não da identidade.
>
> ⚠️ **19/08/2026: três defeitos encontrados e corrigidos** (branch
> `feat/cadastro-unico-casamento-pessoa`, sem migration: o schema estava certo, o erro era de
> aplicação). O backfill uniu as identidades **uma vez**, mas nada mantinha a regra depois:
>
> 1. `createCustomer`/`createSupplier` nunca procuravam identidade existente: toda criação fazia
>    party nova, e o fornecedor que virasse cliente voltava a ser dois cadastros. Agora
>    `findPartyMatch` procura (documento, senão nome normalizado) e a tela **pergunta** antes de
>    unir, no create e no update. O update é o caminho de conserto do passivo acumulado.
> 2. `mergeCustomers` movia os pedidos mas não tocava em `parties`, deixando a identidade do
>    duplicado viva e sem dono. Agora chama `mergeParties`.
> 3. `upsertParty` usava COALESCE em todas as colunas, então `null` e "não sei" eram a mesma
>    coisa e nenhum campo podia ser apagado pela tela. Agora só as colunas conhecidas entram no
>    comando.
>
> Suíte: 557 → 581 testes.

- [x] **T13.1** Migration do schema `cadastro`: `parties`, `party_roles`, `addresses` + backfill de `customers` e `suppliers` (ver [`4-financeiro/01-cadastro-unico.md`](../docs/rotinas/4-financeiro/01-cadastro-unico.md))
- [x] **T13.2** `src/lib/parties.ts` como ponto único de escrita, com testes
- [ ] **T13.3** Migration: `users.party_id` UUID NULL → `cadastro.parties`, com backfill dos usuários existentes, **é o que faz o filtro Funcionários de `/cadastros/pessoas` deixar de vir vazio**

## Fase 2: Área `/cadastros`

- [x] **T13.4** Layout `/cadastros` com os cards das entidades e guarda de perfil (chefia/gerência), feito na reconciliação dos quatro módulos (19/08/2026); funcionários e tipos de tarefa entram com T13.7/T13.8
- [x] **T13.5** Mover `/admin/especies`, `/admin/recipientes`, `/admin/insumos` para `/cadastros/*` com redirect das rotas antigas, junto vieram `/admin/custos-fixos` → `/financeiro/*`, `/admin/coleta-sementes` → `/producao/*` e `/insumos/registrar` → `/producao/consumo-insumos`
- [x] **T13.6** Linkar `/clientes` e `/fornecedores` a partir de `/cadastros` (rotas permanecem), feito como **papéis** dentro de `/cadastros/pessoas`, não como abas irmãs
- [ ] **T13.7** `/cadastros/funcionarios`: CRUD sobre `parties` com papel `funcionario` (nome, contato, papel operacional, vínculo fixo/diarista, ativo). O papel já aparece como filtro em `/cadastros/pessoas` e o recurso `funcionario` já está na matriz de permissões; falta a tela, ao criá-la, ligar o `href` em `PESSOA_ROLES` (`src/lib/modules.ts`), que o teste cobre
- [ ] **T13.8** `/cadastros/tipos-de-tarefa`, CRUD de `task_types` (nome, categoria, exige espécie?, exige recipiente?, unidade, tempo médio por unidade, ativo)

### Centros de custo (24/08/2026)

> **Origem:** pergunta do João, "dá para acrescentar centro de custo e inativar outro pelo sistema?".
> Não dava: a lista era carga inicial fechada em código (`RN-41`, `RF-57`), e mexer nela exigia
> migration. Rotina de domínio em
> [`docs/rotinas/1-cadastros/centros-de-custo.md`](../docs/rotinas/1-cadastros/centros-de-custo.md).
>
> **Escopo fechado:** só centro de custo. Categorias (35 em 14 grupos) e contas (9) continuam carga
> inicial alterada por migration, e o padrão daqui serve de molde se um dia forem abertas.
>
> **A tabela vem antes do P12.** `financeiro.cost_centers` nasce aqui, não na Fase 2 do P12: o
> cadastro não depende de extrato nenhum, e esperar travaria a rotina por um projeto inteiro.

- [ ] **T13.24** Migration `2026MMDD_financeiro_cost_centers.sql`: `CREATE SCHEMA financeiro`, tabela
      `cost_centers` (`id`, `code` UK, `name`, `nature` com CHECK, `active`, `created_at`,
      `created_by` → `users`, `deactivated_at`) e carga inicial dos cinco, floricultura com
      `active = false`. **Sem `BEGIN`/`COMMIT` próprios e sem guarda condicional**, pelas razões no
      cabeçalho de `20260811000004_cadastro_unico_parties.sql`. Sem RLS: o controle é de aplicação
      (`20260413000002_p1_rls.sql`)
- [ ] **T13.25** `src/lib/cost-centers.ts`: slug do código, validação da natureza e a regra de
      imutabilidade (natureza só muda enquanto não houver lançamento), com testes, no molde de
      `src/lib/parties.ts`
- [ ] **T13.26** `/cadastros/centros-de-custo`: `page.tsx` + `actions.ts` + manager, no molde de
      `src/app/cadastros/recipientes/`. Recurso `centro_custo` em `src/lib/permissions.ts` (chefia e
      admin; criar, ler e atualizar, **sem excluir**) e link em `CADASTROS`
      (`src/lib/modules.ts`), que `modules.test.ts` confere contra as rotas existentes

## Fase 3: Agenda da semana

- [ ] **T13.9** Migration: `week_plans`, `assignments`, `labor_rates`; `production_activities.assignment_id` NULL
- [ ] **T13.10** Grade semanal em `/producao/agenda` (desktop/tablet): pessoas × dias, célula = tipo de tarefa + espécie? + turno(s)
- [ ] **T13.11** Cadastro de tarefa em 3 toques (pessoa → tipo → turno); espécie/recipiente só quando o tipo exigir
- [ ] **T13.12** Botão **"Copiar semana passada"** e marcação de tarefa fixa (recorrente)
- [ ] **T13.13** Visão mobile: um dia por tela, deslizando
- [ ] **T13.14** Publicar semana (rascunho → publicada) e fechar semana (trava)

## Fase 4: Execução pelo colaborador

- [ ] **T13.15** `/minhas-tarefas`: lista do dia, concluir pedindo só a quantidade
- [ ] **T13.16** Fila offline (IndexedDB), reusando o padrão de `/insumos/registrar`
- [ ] **T13.17** Ao fechar a semana, planejado não confirmado vira realizado com marca `nao_confirmado`

## Fase 5: Custo de mão de obra

- [ ] **T13.18** `labor_rates`: valor-hora médio por mês, alimentado pela folha (financeiro)
- [ ] **T13.19** View de custo de mão de obra por espécie e período (turnos × 4h × valor-hora)
- [ ] **T13.20** Rateio das tarefas sem espécie como custo indireto, junto de `fixed_costs`
- [ ] **T13.21** Ligar ao P1: `species_unit_cost` passa a incluir mão de obra real

## Fase 6: Engenharia (TCC)

- [x] **T13.22** Atualizar B2 (RF-69 a RF-76 + o conflito de §5 reescrito), C1 (UC-41 a UC-44), C6, C8, D4 (§3.11) e B5, feito em 19/08/2026. **Fora**: C2, que detalha 8 casos escolhidos e não todos; e G2, por decisão registrada na tabela acima. B3 ganhou junto oito regras de negócio (RN-48 a RN-55), que a tabela não previa.
- [ ] **T13.23** `npm run docs:tcc` para regenerar `docs/engenharia/word/`
- [x] **T13.27** Engenharia dos centros de custo, feito em 24/08/2026 junto do desenho da rotina:
      `B3` (RN-71 a RN-73, RN-41 emendada), `B2` (§2.2.3 com RF-77 a RF-79, RF-57 emendado), `C1`
      (UC-45), `C6`/`C8` (`created_at`, `created_by`, `deactivated_at`), `D4` (recurso *Centros de
      custo* e regra §3.12), `E2` (TA-56 a TA-58), `B5`, `B4`, `A2` e `auditoria-divergencias`.
      `npm run docs:tcc`, `npm run docs:mapas` e `npm run docs:quadros` rodados

---

## Critérios de aceite

- [ ] Débora monta a semana inteira em menos de 5 minutos usando "copiar semana passada"
- [ ] Colaborador conclui uma tarefa em 2 toques + 1 número, funcionando sem internet
- [ ] Funcionário sem login aparece na agenda e recebe tarefa
- [ ] Custo de mão de obra por espécie sai do relatório e confere com a folha do mês
- [ ] Nenhuma tela existente de clientes, fornecedores ou pedidos quebra
