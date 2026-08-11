# P13 — Cadastro único + Agenda de pessoal

> Origem: conversa João — revisão das rotinas do sistema (10/08/2026).
> Domínio em [`docs/rotinas/rotina-cadastros.md`](../docs/rotinas/rotina-cadastros.md) e
> [`docs/rotinas/rotina-producao/`](../docs/rotinas/rotina-producao/).

**Status: desenho fechado. Implementação não iniciada.**

---

## A ideia em 1 frase

**Uma área só para os cadastros, e uma grade semanal para saber quem faz o quê** — a agenda
é a única fonte possível de horas, e horas são a peça que falta para o custo ser real.

---

## As 4 decisões (fechadas em 10/08/2026)

### 1. Mão de obra: horas individuais, valor-hora médio
A agenda registra horas **por pessoa**; o custo usa um valor-hora **médio da equipe**
(folha do mês ÷ horas do mês). Preserva a resolução de conflito de B2 §4 — nada de controle
de ponto individual — e ainda assim produz custo real, porque o que varia entre espécies é o
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

Estas incongruências foram encontradas e **precisam de revisão** antes da entrega do Cap. 4:

| Doc | O que muda | Gravidade |
|---|---|---|
| **B2 §2.3 Produção** | Faltam RFs para agenda semanal, catálogo de tipos de tarefa, cadastro de funcionário e custo de mão de obra. Estimados **~8 RF novos** (RF-69…RF-76). | alta |
| **B2 §4 Conflitos** | A resolução "mão de obra por tempo médio estimado por atividade" precisa ser **reescrita** para "horas planejadas na agenda × valor-hora médio da equipe". A tensão continua a mesma; a solução ficou melhor. | alta |
| **C1 §2 Subsistemas** | Os 12 subsistemas não incluem **Cadastros**. Entra como S13, ligado a Chefia e Gerência. | média |
| **C1 §4 / C2** | UC-40 "Consultar tarefas do dia" hoje aponta para RF-20. Precisa de UCs novos: montar agenda da semana, concluir tarefa, cadastrar funcionário, cadastrar tipo de tarefa. | média |
| **C6 MER** | Entidades novas: `task_types`, `week_plans`, `assignments`, `labor_rates`. `production_activities` ganha `assignment_id` opcional. `users` ganha `party_id` opcional. | alta |
| **C8 Dicionário** | Idem — documentar as 4 entidades novas. | alta |
| **D4 RBAC** | Regra nova: colaborador lê/edita só as próprias tarefas; grade da semana é gerência/chefia. | média |
| **G2 Indicadores** | Indicadores novos possíveis: horas por espécie, planejado × realizado, % de tarefas não confirmadas. | baixa |
| **B5 Rastreabilidade** | Refazer as linhas dos RFs novos. | média |
| **`docs/rotinas/rotina-tarefas.md`** | ✅ já resolvido — absorvido pela Produção, arquivo mantido como histórico. | — |

> **Nota para o TCC:** a absorção de "Tarefas Diárias" pela Produção **corrige uma
> incongruência que já existia**: `docs/rotinas/` tratava tarefas como rotina separada,
> enquanto C1 já mapeava UC-40 → RF-20 (produção). O domínio agora reflete a engenharia.

---

## Fase 1 — Cadastro de pessoas (pré-requisito)

Compartilhada com o P12 Fase 1. **Fazer uma vez, serve aos dois.**

> ✅ **T13.1 e T13.2 concluídas em 11/08/2026** — migration
> `20260811000004_cadastro_unico_parties.sql` (aditiva; backfill de 10 clientes e 15 fornecedores
> verificado no Postgres local) e `src/lib/parties.ts` com 27 testes. Nenhuma tela mudou.
> **T13.3 (`users.party_id`) segue pendente.**
>
> Duas coisas divergiram da especificação e ficam registradas: `suppliers` **não tem** coluna
> `document`, então 100% do casamento cliente↔fornecedor cai em `lower(trim(name))`; e as quatro
> colunas sem destino declarado — `customers.state_registration`, `customers.ie_exempt`,
> `suppliers.contact_name`, `suppliers.instagram` — **ficam onde estão**, por serem atributos do
> papel e não da identidade.

- [x] **T13.1** Migration do schema `cadastro`: `parties`, `party_roles`, `addresses` + backfill de `customers` e `suppliers` (ver [`rotina-financeiro/01-cadastro-unico.md`](../docs/rotinas/rotina-financeiro/01-cadastro-unico.md))
- [x] **T13.2** `src/lib/parties.ts` como ponto único de escrita, com testes
- [ ] **T13.3** Migration: `users.party_id` UUID NULL → `cadastro.parties`, com backfill dos usuários existentes

## Fase 2 — Área `/cadastros`

- [ ] **T13.4** Layout `/cadastros` com os cards das 7 entidades e guarda de perfil (chefia/gerência)
- [ ] **T13.5** Mover `/admin/especies`, `/admin/recipientes`, `/admin/insumos` para `/cadastros/*` com redirect das rotas antigas
- [ ] **T13.6** Linkar `/clientes` e `/fornecedores` a partir de `/cadastros` (rotas permanecem)
- [ ] **T13.7** `/cadastros/funcionarios` — CRUD sobre `parties` com papel `funcionario` (nome, contato, papel operacional, vínculo fixo/diarista, ativo)
- [ ] **T13.8** `/cadastros/tipos-de-tarefa` — CRUD de `task_types` (nome, categoria, exige espécie?, exige recipiente?, unidade, tempo médio por unidade, ativo)

## Fase 3 — Agenda da semana

- [ ] **T13.9** Migration: `week_plans`, `assignments`, `labor_rates`; `production_activities.assignment_id` NULL
- [ ] **T13.10** Grade semanal em `/producao/agenda` (desktop/tablet): pessoas × dias, célula = tipo de tarefa + espécie? + turno(s)
- [ ] **T13.11** Cadastro de tarefa em 3 toques (pessoa → tipo → turno); espécie/recipiente só quando o tipo exigir
- [ ] **T13.12** Botão **"Copiar semana passada"** e marcação de tarefa fixa (recorrente)
- [ ] **T13.13** Visão mobile: um dia por tela, deslizando
- [ ] **T13.14** Publicar semana (rascunho → publicada) e fechar semana (trava)

## Fase 4 — Execução pelo colaborador

- [ ] **T13.15** `/minhas-tarefas` — lista do dia, concluir pedindo só a quantidade
- [ ] **T13.16** Fila offline (IndexedDB), reusando o padrão de `/insumos/registrar`
- [ ] **T13.17** Ao fechar a semana, planejado não confirmado vira realizado com marca `nao_confirmado`

## Fase 5 — Custo de mão de obra

- [ ] **T13.18** `labor_rates`: valor-hora médio por mês, alimentado pela folha (financeiro)
- [ ] **T13.19** View de custo de mão de obra por espécie e período (turnos × 4h × valor-hora)
- [ ] **T13.20** Rateio das tarefas sem espécie como custo indireto, junto de `fixed_costs`
- [ ] **T13.21** Ligar ao P1: `species_unit_cost` passa a incluir mão de obra real

## Fase 6 — Engenharia (TCC)

- [ ] **T13.22** Atualizar B2 (RFs novos + reescrever o conflito de §4), C1, C2, C6, C8, D4, G2, B5 conforme a tabela de impacto acima
- [ ] **T13.23** `npm run docs:tcc` para regenerar `docs/engenharia/word/`

---

## Critérios de aceite

- [ ] Débora monta a semana inteira em menos de 5 minutos usando "copiar semana passada"
- [ ] Colaborador conclui uma tarefa em 2 toques + 1 número, funcionando sem internet
- [ ] Funcionário sem login aparece na agenda e recebe tarefa
- [ ] Custo de mão de obra por espécie sai do relatório e confere com a folha do mês
- [ ] Nenhuma tela existente de clientes, fornecedores ou pedidos quebra
