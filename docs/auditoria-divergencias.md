# Auditoria de divergências: docs × planos × código

> Feita em **10/08/2026**, antes de retomar o desenvolvimento. Objetivo: colocar toda a
> documentação na mesma linha, para que nenhum plano mande construir algo que o sistema
> real não comporta.
>
> Método: leitura dos 13 planos, das 9 rotinas, dos 17 artefatos de engenharia e conferência
> contra `migrations/`, `src/` e `package.json`.
>
> **Sequência:** as correções apontadas aqui foram executadas em 10–11/08/2026. O que ficou
> pendente depois delas está em [`divida-tecnica.md`](divida-tecnica.md).

## Resumo

| # | Divergência | Gravidade |
|---|---|---|
| [A](#a--stack-fantasma-supabase-em-6-planos) | 6 planos escritos para uma stack (Supabase) que foi abandonada | 🔴 alta |
| [B](#b--tarefa-marcada-como-feita-que-foi-desfeita) | `P1 T1.8` marcado `[x]` para RLS, que a migration seguinte removeu | 🔴 alta |
| [C](#c--cabeçalho-de-status-mentindo) | `P1` diz "NÃO INICIADO" com 16 de 32 tarefas feitas | 🟠 média |
| [D](#d--colaborador-nos-docs--funcionario-no-banco) | Perfil chamado `colaborador` nos docs e `funcionario` no banco | 🟠 média |
| [E](#e--roadmap-desatualizado-em-três-lugares) | Roadmap P1→P10 repetido em 3 arquivos, sem P11, P12 e P13 | 🟠 média |
| [F](#f--execution-guide-fossilizado) | `EXECUTION-GUIDE.md` descreve um cronograma que a realidade não seguiu | 🟠 média |
| [G](#g--dois-documentos-definindo-os-mesmos-indicadores) | `P6` e `G2` definem indicadores diferentes para a mesma tela | 🟠 média |
| [H](#h--pendências-já-registradas-do-p13) | Agenda de pessoal e cadastro único ainda não estão na engenharia | ✅ resolvido 19/08 |
| [I](#i--o-que-não-é-divergência) | 55 entidades especificadas × 44 tabelas reais | ⚪ não é erro |
| [J](#j--migrations-marcadas-como-aplicadas-que-nunca-rodaram) | Duas tabelas do P1 registradas em `_migrations` e inexistentes nos dois bancos | 🔴 alta |
| [K](#k--sete-taxonomias-de-modulo-concorrentes) | Sete agrupamentos diferentes dos mesmos módulos, e o código não seguia nenhum | 🟠 média |
| [L](#l-lote-excluído-em-três-documentos-e-assumido-num-plano-24082026) | "Lote" fora de escopo em `A1`, `A2` e `C2`, e assumido pelo `P2` | ✅ resolvido 24/08 |

---

## A: Stack fantasma (Supabase em 6 planos)

O projeto **não usa Supabase**. Usa PostgreSQL direto (`pg` local / `@neondatabase/serverless`
em produção) com Server Actions do Next.js. A própria migration diz isso:

```
migrations/20260413000002_p1_rls.sql
-- RLS removido — projeto usa PostgreSQL local sem autenticação Supabase.
-- Controle de acesso será feito na camada de aplicação (Next.js) quando necessário.
```

Mesmo assim, seis planos ainda mandam construir sobre Supabase:

| Plano | Onde | O que manda fazer |
|---|---|---|
| P1 | T1.18, linha 127 | Edge Function `calculate-species-cost`; Supabase Realtime |
| P2 | T2.8, T2.14, linha 150 | RLS policies; Edge Function `check-mortality-alerts`; Supabase Storage |
| P3 | T3.8, T3.9, T3.10 | três Edge Functions de precificação |
| P5 | linha 83, T5.14, linha 134 | webhooks do Supabase disparando o n8n |
| P6 | T6.6, T6.11, linhas 166-167 | Edge Function `dashboard-summary`; Realtime; "Supabase views" |
| P7 | T7.2 | bucket `species-photos` no Supabase Storage |
| P9 | linha 71 | Supabase Edge Function + Resend para o formulário de contato |

**Conflito adicional:** P7 quer as fotos no Supabase Storage; o `CLAUDE.md` diz
`public/uploads/especies/`, que é o que o código faz.

**Equivalência na stack real:** Edge Function → Server Action ou rota de API; RLS → verificação
de perfil na Server Action (é o que `D4` já especifica); Realtime → `revalidatePath` ou polling;
Storage → `public/uploads/`; webhook do Supabase → chamada HTTP a partir da própria Server Action.

## B: Tarefa marcada como feita que foi desfeita

`plans/P1-custeio-por-especie.md` linha 76:

```
- [x] **T1.8** Criar RLS policies: apenas usuários autenticados leem/escrevem. Admin full access.
```

A migration correspondente não cria política nenhuma, remove o conceito. O `[x]` afirma uma
proteção que não existe. É o tipo de marca que, mantida, faz alguém assumir que o banco tem
defesa própria e escrever uma Server Action sem checar perfil.

## C: Cabeçalho de status mentindo

| Plano | Cabeçalho diz | Caixas marcadas | Realidade |
|---|---|---|---|
| **P1** | `## Status: NÃO INICIADO` | 16 de 32 | tabelas, view e todos os CRUDs prontos; falta o motor de cálculo |
| **P12** | Fase 0 concluída | 1 de 7 | correto |
| **P11** | bloco `📌 STATUS`, datado e detalhado | 25 de 25 | correto: só não usa o formato `## Status:` dos demais |
| P2…P10 | NÃO INICIADO | 0 | correto |

Só o **P1** afirma algo falso. O P11 usa um formato próprio de status, mais rico que o dos
outros; a inconsistência é de forma, não de conteúdo.

## D: `colaborador` nos docs × `funcionario` no banco

```sql
-- migrations/20260521000001_auth_users_sessions.sql
CREATE TYPE user_role AS ENUM ('admin', 'chefia', 'gerencia', 'funcionario');
```

Toda a documentação: `00-mapa-de-rotinas`, `D4 Matriz RBAC`, `C1 Casos de uso`,
`G2 Indicadores`, `B2 Requisitos`: chama esse perfil de **Colaborador**. A palavra
`colaborador` não aparece em uma linha de código.

O problema piora com o [cadastro único](rotinas/1-cadastros/00-visao-geral.md): lá, `funcionario` é um
**papel de cadastro** (`cadastro.party_roles`), que significa "é nosso empregado", e existe
para gente que não tem login nenhum. Passa a haver dois `funcionario` com sentidos diferentes:

| Termo | Onde | Significa |
|---|---|---|
| `user_role = 'funcionario'` | `users` | nível de acesso mais baixo do app |
| `party_roles.role = 'funcionario'` | `cadastro.party_roles` | esta pessoa trabalha aqui |

Gilberto é chefia no primeiro sentido e funcionário no segundo. Sem desambiguar, a matriz RBAC
e o cadastro vão brigar na primeira consulta que juntar os dois.

## E: Roadmap desatualizado em três lugares

O diagrama `P1 → P10` está copiado em `CLAUDE.md`, `docs/contexto-projeto.md` e
`docs/README.md`. Nenhuma das três cópias inclui **P11** (concluído), **P12** (em curso) ou
**P13** (novo). O `docs/README.md` já ganhou uma tabela complementar nesta rodada; as outras duas
continuam mostrando só o encadeamento original.

A ordem real de execução também não foi a planejada: o que se construiu primeiro foi
Pedidos/Clientes/Fornecedores: que sequer existiam no roadmap original.

## F: `EXECUTION-GUIDE` fossilizado

`docs/EXECUTION-GUIDE.md` descreve um cronograma de 4 meses, sessão por sessão, de P1 a P10.
Três problemas:

1. **A realidade não seguiu.** "Sprint 1 Sessão 2: P2 Fase 1" nunca aconteceu; P2 está zerado
   e o que se construiu foi P11.
2. **A árvore de arquivos está errada**: não mostra `migrations/`, `docs/rotinas/`,
   `docs/engenharia/`, `data/seeds/`.
3. **Não menciona** os testes obrigatórios nem o hook de pre-commit, que hoje são regra do
   `CLAUDE.md` e bloqueiam commit.

## G: Dois documentos definindo os mesmos indicadores

| | `G2: Fichas de indicadores` | `P6: Dashboard` |
|---|---|---|
| Quantos | 9 (IND-01 a IND-09) | "5-7, a definir" |
| Especificação | fórmula, fonte, janela, meta, faixas, responsável | lista de nomes |
| Painel por perfil | definido (chefia 9, gerência 4, colaborador nenhum) | não trata |
| Regra de mês aberto | travessão, nunca zero (RF-61) | não trata |

São a mesma tela especificada duas vezes, e `P6` é a versão mais fraca e mais antiga. Quem
implementar o dashboard lendo só o plano vai construir a coisa errada.

## H: Pendências já registradas do P13

Cadastro único e agenda de pessoal ainda não constam da engenharia: faltam ~8 RF em `B2`, o
subsistema Cadastros em `C1`, quatro entidades em `C6`/`C8`, a regra do colaborador em `D4` e
as linhas novas em `B5`. Lista completa em
[`plans/P13-producao-agenda-cadastros.md`](../plans/P13-producao-agenda-cadastros.md).

> ✅ **Resolvido em 19/08/2026**: RF-69 a RF-76 no `B2`, RN-48 a RN-55 no `B3`, UC-41 a UC-44 no
> `C1`, as quatro entidades da agenda em `C6`/`C8`, a regra §3.11 no `D4` e as linhas do `B5`.
> Detalhe na terceira passada, no fim deste arquivo. Ficaram de fora, com motivo declarado, o `C2`
> e os indicadores novos do `G2`.

## I: O que **não** é divergência

`C6`/`C8` especificam **55 entidades**; o banco tem **44 tabelas** e 2 visões. Isso é intencional e
está declarado em `docs/engenharia/00-indice.md`:

> Os artefatos são redigidos em tempo de projeto, como especificação da solução a ser
> construída. São documentos de projeto, não relatórios de código.

As entidades ainda não criadas são **onze, e todas do Financeiro**: `sale_channels`,
`sale_prices` e as nove do esquema `financeiro` (`accounts`, `cost_centers`, `category_groups`,
`categories`, `statement_imports`, `transactions`, `transaction_splits`, `classification_rules`,
`periods`). Correspondem ao P12: projeto especificado e não implementado, dependente de acesso a
extrato bancário que o protótipo ainda não tem.

**A lista encolheu duas vezes.** `parties`, `party_roles` e `addresses` saíram em 11/08/2026, na
Fase 1 do P12/P13. Em 24/08/2026 saíram as dezesseis da rotina de produção (`settings`,
`task_types`, `areas`, `beds`, `work_shifts`, `batches`, `batch_movements`, `week_plans`,
`assignments`, `assignment_members`, `task_executions`, `labor_rates`, `input_stock_entries`,
`task_expenses`, `loss_events`, `stock_counts`), criadas pelas migrations `20260824000001` a
`20260824000007`, junto da visão `input_stock_balance`. `production_activities` não saiu da lista:
deixou de existir, substituída por `task_executions` antes de chegar ao banco.

> **`task_types` mudou de forma em 25/08/2026**, depois da conferência acima.
> `migrations/20260825000001_tipos_tarefa_simplificacao.sql` trocou `measurement_type` (lista de
> `tempo`/`saco`/`tubete`) pelo booleano `is_quantitative` e removeu `avg_minutes_per_unit`. As
> 22 tarefas da carga inicial continuam, 9 delas quantitativas. `C6`, `C8` e a figura 10 do
> `modelo-dados-pt` foram atualizados na mesma alteração.

**Uma coluna, e não uma entidade, também está nessa condição:** `users.party_id`, especificada em
`C6 §3.1` e `C8`, com a justificativa da opcionalidade nos dois, não existe no banco. A migration
`20260811000004` ligou `party_id` em `customers` e `suppliers`, e deixou `users` de fora. Fica
registrada aqui pelo mesmo critério das entidades acima: é especificação à frente do código, não
erro de documento. Desde 24/08/2026 a própria linha do `C8` traz a marca **Especificado, não
implementado**, e o mesmo vale para `order_items.unit_price`, `order_items.sale_price_id` e
`input_stock_entries.transaction_id`, este à espera do esquema `financeiro`.

> ✅ **Conferência de 21/08/2026.** `C6` e `C8` foram confrontados com as 33 migrations, coluna por
> coluna. Sete divergências no sentido inverso, banco à frente do documento, foram corrigidas:
> a tabela `species_photos`, `customers.party_id`, `suppliers.party_id`,
> `input_usages.client_id`, `order_items.availability_notes`, `supplier_species.notes` e
> `supplier_quotes.notes`. `species.category`, coluna legada que sobreviveu à adoção de `tags`,
> passou a ser declarada como tal no `C8`.

**Também conferido e consistente:**

- Os 8 estados de pedido (`cadastrado` → `pronto_envio`) batem entre código, `rotinas/3-comercial/pedidos/`,
  `C2`, `C8`, `D4` e `E2`. É a área mais bem mantida do projeto.
- Os 5 canais de venda batem entre `CLAUDE.md`, `orders.ts` e o banco.
- O limite de mortalidade de 20% bate entre `CLAUDE.md`, `RF-29` e `IND-01`.
- Contagens declaradas conferem: 68 RF, 26 RNF, 40 casos de uso. *(Em 19/08/2026 passaram a 76 RF e 44 casos de uso, com os requisitos da agenda de pessoal; em 24/08/2026, a 79 RF e 45 casos, com o cadastro de centros de custo; em 25/08/2026, a 107 RF, 83 RN e 86 casos de aceite, com a simplificação do catálogo de tipos de tarefa, RF-107 e RN-91.)*
- Financeiro: as 9 contas e os 5 centros de custo **iniciais** batem entre `P12`, `4-financeiro/` e `C8`. Desde 24/08/2026 os centros são cadastro mantido pela chefia (RN-71 a RN-73, RF-77 a RF-79), e não lista fixa: o número deixa de ser conferível por igualdade, o que se confere é a carga inicial.

## J: Migrations marcadas como aplicadas que nunca rodaram

> Achado em **11/08/2026**, fora da rodada anterior: só apareceu ao tentar acrescentar uma
> coluna a `input_usages`.

`_migrations` registrava como aplicadas:

```
20260413000003_p1_input_usages.sql
20260413000004_p1_input_price_history.sql
```

As duas tabelas **não existiam em nenhum dos dois bancos**, nem no Postgres local (24 tabelas)
nem no Neon (23). Havia ainda um registro sem arquivo correspondente,
`20260521100006_pedidos_partial_availability.sql`, confirmando uso de `--mark-applied` no
passado.

É a **lição nº 7 do post-mortem acontecendo de fato**: migration marcada sem ter sido executada.
O histórico afirmava um schema que o banco não tinha, e nada acusou: porque migration marcada
nunca mais é tentada.

**O que estava quebrado em produção, silenciosamente:**

| Tela | Tarefa no P1 | Sintoma |
|---|---|---|
| `/insumos/registrar` | T1.10–T1.12 (marcadas `[x]`) | todo envio falhava: tabela de destino inexistente |
| `/admin/insumos` → histórico de preço | T1.15 (marcada `[x]`) | `getPriceHistory` falhava |

**Correção:** `migrations/20260811000002_repara_tabelas_p1_ausentes.sql` recria as duas com a
definição original, sem `IF NOT EXISTS`: se algum banco já as tiver, deve falhar alto e parar o
deploy em vez de passar em silêncio. O registro fantasma foi mantido: apagar linha de
`_migrations` à mão é o que produz este tipo de problema.

**Prevenção:** o achado só existiu porque alguém foi mexer na tabela. Não há hoje nada que
compare o schema declarado nas migrations com o schema real. Fica registrado como candidato a
teste de CI: comparar `CREATE TABLE` das migrations com `pg_tables` do banco alvo.

---

## Correções aplicadas: 10/08/2026

| # | Decisão | O que mudou |
|---|---|---|
| **A** | Marcar, não reescrever | Bloco de alerta no topo de P1, P2, P3, P5, P6, P7 e P9, com a tabela de tradução (Edge Function → Server Action, RLS → checagem de perfil, Storage → `public/uploads/`, Realtime → `revalidatePath`, webhook → chamada HTTP na própria action) |
| **B** | Desmarcar | `P1 T1.8` voltou a `[ ]`, riscado, apontando para a migration que removeu RLS e para a `D4` como controle real |
| **C** | Corrigir | `P1` passou a `Status: PARCIAL, 16 de 32`, com o que está feito e o que falta |
| **D** | Renomear o banco | Migration `20260810000001`: `ALTER TYPE user_role RENAME VALUE 'funcionario' TO 'colaborador'`; 13 referências no código; `C8` e o apêndice B do TCC. **Aplicada no Postgres local; falta aplicar no Neon antes do próximo deploy.** |
| **E** | Roadmap único | `contexto-projeto.md` passou a ser a fonte, com estado real por projeto e P13 antes do P1; `CLAUDE.md` e `docs/README.md` apontam para lá |
| **F** | Reescrever | `EXECUTION-GUIDE.md` refeito a partir de onde o projeto está, com a ordem nova, os comandos reais e a distinção Neon × Supabase |
| **G** | `G2` é a fonte | Alerta no topo do `P6`: implementar pelas 9 fichas do `G2`; as listas de KPI do plano ficam como histórico |
| **H** | Junto do P13 | Permanece pendente, na Fase 6 do `P13` |

### Por que "marcar" e não "reescrever" nos planos Supabase

Reescrever as tarefas de infraestrutura de sete planos não implementados produziria muito
texto novo sobre decisões que ainda não foram tomadas, e que serão tomadas melhor no momento
de implementar, com o código na frente. O alerta no topo resolve o risco real, que é alguém
implementar sem perceber a troca de stack.

### Decisão de fundo sobre o roadmap

**P13 passou na frente do P1.** O custo unitário depende da mão de obra, e a mão de obra só
existe quando a agenda de pessoal registrar horas. Enquanto isso não acontecer, o motor de
cálculo do P1 (T1.18–T1.20) só sabe somar insumo e custo fixo, devolveria um custo
sistematicamente subestimado, que é exatamente o erro que o projeto existe para corrigir.


---

## K: Sete taxonomias de módulo concorrentes

> Encontrada em **19/08/2026**. Corrigida na mesma data.

Os mesmos módulos apareciam agrupados de sete maneiras diferentes, e a navegação do app não
seguia nenhuma delas:

| Fonte | Agrupamento |
|---|---|
| `docs/rotinas/img/mapa-sistema.mmd` (v1) | 6 blocos |
| `docs/rotinas/img/mapa-sistema-v2.mmd` | 7 blocos |
| `mapa-4-areas` | Cadastros · Pedidos · Produção · Financeiro |
| `mapa-0-acesso` … `mapa-4-financeiro` | Acesso · Cadastros · Produção · Comercial · Financeiro |
| `00-mapa-de-rotinas.md` §1–8 | 8 rotinas planas |
| `D1-arquitetura-c4.md` §4 | Acesso · Núcleo · Operação · Comercial · Rede externa · Financeiro |
| `C1-diagrama-casos-de-uso.md` §2 | 12 subsistemas planos, sem Cadastros |
| `src/lib/permissions.ts` | 7 blocos, com `custo_fixo` e `coleta_semente` sob Produção |
| `src/app/page.tsx` (o menu real) | Pedidos · Operações de Campo · Administração · Minha Conta |

Sintomas concretos: Clientes, Estoque, Perdas e Entregas mudavam de dono conforme o
documento; Custeio e Precificação ora eram "o que a produção gera", ora Financeiro; Custos
fixos e Coleta de sementes estavam em três lugares ao mesmo tempo (tela em `/admin`,
permissão sob Produção, mapa sob Cadastros); o fornecedor aparecia duas vezes no mapa v2,
contra o cadastro único que o P12 Fase 1 estava construindo; e o `mapa-sistema-v2` não era
referenciado por nenhum `.md`: o mapa de rotinas ainda embutia a v1.

**Correção.** Uma taxonomia só: **Cadastros · Produção · Comercial · Financeiro**, com Acesso
transversal. Regra de corte de Cadastros mantida do `1-cadastros/00-visao-geral.md` (*é cadastro se, ao
apagá-lo, um movimento passado ficar sem sentido*), o que tirou Custos fixos (→ Financeiro) e
Coleta de sementes (→ Produção) de lá. Estoque voltou para a Produção; Custeio, Precificação
e os Dashboards foram para o Financeiro; Indicadores deixou de ser módulo próprio; Compras
passou a nascer no Financeiro, com a seta de retorno para a Produção que faltava.

**O que impede a divergência de voltar:** a lista de telas de cada módulo passou a viver em
`src/lib/modules.ts` (uma fonte só, lida pelo painel inicial, pelos hubs e pelas abas) e
`src/lib/__tests__/modules.test.ts` confere cada link contra as rotas que existem em
`src/app/` e contra a matriz de permissões.

### Adendo: cliente e fornecedor viram papéis de uma pessoa

Na primeira passada eu deixei Clientes e Fornecedores como **duas abas irmãs** em
`/cadastros`, o que reintroduzia em menor escala a mesma divergência: o modelo de dados diz
"uma identidade, N papéis" (`cadastro.parties`), a navegação dizia "duas listas".

Corrigido em 19/08/2026: `/cadastros/pessoas` é uma lista só de `cadastro.parties`, com
filtro por papel e um selo por papel em cada linha. As telas `/clientes` e `/fornecedores`
continuam sendo as telas **do papel**: é lá que vivem os campos que não são de identidade
(dados fiscais e CNPJ de um lado; espécies, confiabilidade e geocodificação do outro).

Dois efeitos colaterais que valem registro:

- O recurso **`funcionario`** entrou na matriz de permissões (`src/lib/permissions.ts`),
  declarado como pendência do D4 no mesmo molde de `tarefa`. Sem ele, o filtro de
  funcionário cairia numa permissão emprestada.
- `ModuleLink.permission` passou a aceitar lista, avaliada com `canAny`, Pessoas reúne três
  recursos numa tela só. `canLink()` é o único lugar que decide se um atalho aparece.

A ficha da pessoa (`/cadastros/pessoas/[id]`) nasceu junto, e com uma finalidade declarada: é
onde *quanto compramos e quanto vendemos para esta pessoa* vai ser respondido. Hoje ela mostra
volume de venda e valor cotado de compra, e diz na tela que o valor em reais depende da Fase 2
do P12: `order_items` ainda não tem preço no banco (o modelo passou a especificá-lo em 24/08/2026,
ver a quarta passada), então o número virá do extrato, apontando para a mesma
`party_id`. Ver também [`divida-tecnica.md`](divida-tecnica.md) §8, que registra o conserto que
`mergeParties` vai precisar quando essa tabela existir.

### Segunda passada: a documentação alcança o código (19/08/2026)

A reconciliação do achado K parou no código e nos diagramas. Uma comparação entre o mapa novo
e o que estava planejado mostrou que **o resto da documentação continuava na taxonomia
antiga**: e, em três pontos, dizendo coisa que o sistema já não fazia. Corrigido nesta
passada:

| Onde | O que estava | O que ficou |
|---|---|---|
| `docs/rotinas/` | 8 arquivos `rotina-*.md` soltos na raiz, herança das rotinas planas | quatro pastas, `1-cadastros/` a `4-financeiro/`; `rotina-producao.md` e `rotina-financeiro.md` (índices redundantes) absorvidos pelos `00-visao-geral.md` |
| `B2 §2` · `B5 §2` | 12 seções por subsistema | Acesso + os quatro módulos, sem renumerar RF nenhum |
| `C1 §2, §3` | Cadastros sem o catálogo; subgrafos por rótulo informal | catálogo entra no módulo 1; subgrafos por módulo; catálogo de UC ganha coluna **Módulo** |
| `C6 §1` · `C8` | "a divisão por área corresponde aos subsistemas" | declarado que **área de dados não é módulo**, com o mapa entre as duas decomposições. Área 2 e 3 renomeadas (`Núcleo`→`Catálogo`, `Operação`→`Produção`) |
| `D4 §2` | 29 recursos em ordem histórica | 31 recursos agrupados por módulo; `Funcionários` e `Tarefas` saem de "pendente" e entram na matriz |
| `A1 §6` | escopo por subsistema | escopo pelos quatro módulos |
| `plans/P1…P10` | rotas `/app/admin/*`, `/app/relatorios/*`, `/app/lotes/*` | rotas reais, com tabela de-para no P1 e faixa de módulo em cada plano |
| `contexto-projeto.md` | roadmap só por projeto | módulos primeiro, tabela projeto × módulo × situação, e o ciclo com o elo que falta |

**A correção de fundo: "o financeiro é exclusivo da chefia" era falso desde o reagrupamento.**
`D4 §3.2` dizia restrição total do subsistema, mas o módulo 4 passou a abrigar custo unitário,
margem, preço e indicadores: quatro recursos que a matriz sempre deu à gerência em leitura, e
que `src/lib/permissions.ts` de fato dá. A regra foi reescrita para o que é verdade e é
defensável: **restringe-se o que expõe a base bancária; o que dela deriva permanece legível**.
`RF-62`, `RN-44`, `TA-04` e o painel do `G2 §6` foram alinhados a esse enunciado.

**Achado lateral, de ferramenta.** `npm run docs:tcc` vinha descartando **seis das vinte e uma
figuras** (as de `D1` e `D3`) em silêncio: no Windows o checkout entrega esses artefatos em
CRLF (`core.autocrlf`) e a regex do gerador exigia `\n`. As figuras do Word estavam
desatualizadas desde a reescrita do `D1`. Corrigido em `scripts/build-docs-tcc.mjs` com
`\r?\n`; a pasta `word/` foi regerada com as 21.

### Terceira passada: o resto (19/08/2026)

O que a segunda passada não alcançou, resolvido na mesma data.

**A regra do módulo restrito não tinha chegado ao código.** `permissions.ts`, `modules.ts` e o
comentário do próprio teste ainda diziam "exclusivo da chefia" a três linhas de `custo_unitario`,
`margem_canal`, `preco_venda` e `indicador`, que dão `ler` à gerência. Corrigidos, e o teste ganhou
as quatro asserções do lado que faltava: sem elas, "consertar" o módulo restrito fechando o que
nunca foi fechado passaria despercebido. A transcrição do `D4 §2` no teste também estava
incompleta: `Funcionários` e `Tarefas` entraram.

**Os mapas: cor na fonte, cinza na figura.** Os três diagramas de topo discordavam entre si sobre o
status de Comercial e de Financeiro, e os sub-mapas usavam outro vocabulário de classes. Agora são
oito arquivos com as mesmas três classes (`ok`/`meio`/`falta`), definidas **em cores**, e
`npm run docs:mapas` troca a paleta por escala de cinza só na hora de renderizar. O status passou a
ser contado por critério verificável: quantas etapas da tabela de cada módulo têm tela
(Cadastros 4/6, Produção 2/10, Comercial 6/8, Financeiro 1/9), com a fração no rótulo do nó.

**`C6` e `C8` adotaram os quatro módulos**: as duas últimas peças em taxonomia própria. A objeção
de perder arestas ao separar entidades relacionadas foi resolvida com a convenção de **caixa
vazia**: a entidade de outro módulo aparece sem atributos, só para a aresta existir.

**A dívida do P13 com a engenharia (`T13.22`) foi paga.** `B2` ganhou **RF-69 a RF-76** (funcionário,
tipos de tarefa, agenda semanal, recorrência, fechamento, conclusão pelo colaborador, valor-hora,
mão de obra no custo) e o conflito de §5 foi reescrito para turno de 4h × valor-hora médio da
equipe. Em cascata: `B3` ganhou **RN-48 a RN-55**, `C1` os **UC-41 a UC-44**, `C6`/`C8` as quatro
entidades da agenda, `D4` a regra **§3.11** (a tarefa é a primeira permissão que depende do
registro, não do perfil) e `B5` as linhas correspondentes.

**Ficaram de fora, com motivo declarado:** `C2`, que detalha oito casos escolhidos e não os 44; e
indicadores novos no `G2`, porque os três que o P13 sugeria eram *possíveis*, não pedidos, e cada
ficha do G2 exige meta e responsável, que teriam de ser inventados junto.

**Contagens acertadas.** Várias estavam erradas e se repetiam por até sete arquivos: as entidades
eram declaradas como 39 e passaram a 45 (a tabela-resumo do `C6` contava 10 no Financeiro, que
tinha 12), hoje 46;
os requisitos passaram de 68 para 76; os casos de uso, de 40 para 44; as regras de negócio, de 47
para 55.

### Quarta passada: o modelo de dados contra o banco e contra os requisitos (24/08/2026)

Conferência de `C6` e `C8` contra as 33 migrations, contra `B2`, `B3`, `B5` e `D4`, e contra
`src/`. Conferiu certo o essencial: as 28 tabelas reais estão todas documentadas, sem tabela órfã;
as 37 chaves estrangeiras reais batem uma a uma com o `C8`; todas as listas fechadas coincidem com
os `CHECK` e `ENUM` do banco, inclusive o `funcionario` → `colaborador`; os 8 estados de pedido e os
4 de disponibilidade batem com `src/lib/orders.ts`; nenhuma entidade citada em `B5` ou `D4` falta no
`C8`; e `src/` não referencia tabela inexistente. Seis correções:

1. **O preço praticado não tinha onde ser gravado.** `order_items` não tinha atributo de preço em
   lugar nenhum, embora a nota de `sale_prices` no `C8` afirmasse que o valor acordado fica no item,
   RN-59 o admita diferente do sugerido e RF-33, RF-35 e RF-44 tratem de preço praticado. Era a
   metade que faltava da correção registrada em `B5 §5.1`. `order_items` recebeu `unit_price` e
   `sale_price_id`; `orders` recebeu `price_approved_by` e `price_approved_at`. Em cascata: `C6`
   §3.4 e §5, `C8` e as linhas de RF-33, RF-35 e RF-44 no `B5`.
2. **`users.party_id` aparecia como coluna existente.** Passou a trazer a marca de especificado e
   não implementado, e a declarar o alvo `cadastro.parties`.
3. **O esquema `financeiro` não estava qualificado no `C8`**, embora o `C6 §3.5` e
   `rotinas/4-financeiro/02-schema-financeiro.md` o exijam, e embora o `C8` já qualificasse
   `cadastro.*`. As nove entidades do extrato passaram a `financeiro.*`. O `C6 §3.5` também
   passou a dizer quais são as nove: custeio e preço ficam em `public`, e a frase anterior dava a
   entender que o módulo inteiro estava no esquema separado.
4. **Sete chaves estrangeiras sem alvo declarado** (`users.party_id`, `week_plans.published_by` e as
   cinco de `assignments`) ganharam o `→ tabela`, como todas as demais do dicionário.
5. **`task_types` estava sob o título do Módulo 2** no `C8`, enquanto o `C6` e a própria tabela-resumo
   do `C8` o contam em Cadastros. Foi movido.
6. **A nota de `production_activities` omitia a rustificação** da lista de manejo que RN-57 nomeia.

Duas contagens erradas junto: o `C6 §2` dizia "quarenta e cinco do modelo completo" e o `D1` falava
em 45 entidades, quando são 46 desde que a precificação entrou.

**Recorte implementado, agora declarado.** Nem `C6` nem `C8` diziam quais das 46 entidades existem
no banco, e a distinção é a primeira pergunta de quem lê o modelo ao lado do sistema. O `C6` ganhou
a seção §2.1 e o `C8` a seção "Recorte implementado", ambas com a mesma conta (28 no banco, 18 só
especificadas), e o `C8` marca a condição entidade por entidade.

---

## L: "Lote" excluído em três documentos e assumido num plano (24/08/2026)

🔴 **Divergência de escopo, não de redação.** Quatro documentos diziam coisas incompatíveis sobre a
mesma palavra:

| Documento | O que dizia |
|---|---|
| `A1` §7 | "Controle de lotes de produção rastreáveis individualmente" **fora de escopo** |
| `A2`, termos não adotados | "Lote" **fora da especificação**, por ambiguidade |
| `C2` UC-17 | registrar o **local da perda** dentro do viveiro **descartado** |
| `plans/P2` T2.1-T2.7 | especifica `batches`, `batch_counts`, `mortality_thresholds` e as telas `/producao/lotes/*` |

O `CLAUDE.md` §Banco de dados ainda cita `batches` como exemplo de nomenclatura de tabela, e
`rotinas/2-producao/00-visao-geral.md` lista "Acompanhamento de lotes" como a terceira subrotina,
com o documento marcado "(a fazer)". Ou seja: metade dos artefatos trabalhava com lote e a outra
metade o proibia, e ninguém tinha percebido porque **nenhum dos dois lados chegou ao código**.

Passou pelas três primeiras passadas sem ser vista porque cada passada conferiu **documento contra
banco**, e lote não existe nem num nem noutro. A divergência era **entre documentos**, e só
apareceu quando o levantamento da rotina de produção pediu a entidade.

### Resolução: o escopo abriu

Decisão do dia 24/08/2026, com a justificativa gravada no próprio `A1` §7 e não como apagamento
silencioso da linha. Os dois termos da justificativa original caíram:

1. **"Disciplina de registro incompatível"**: o viveiro já planta por leva e já sabe dizer de
   cabeça o que está em cada canteiro. O que falta é o registro escrito. E o lote é **escolhido**
   de uma lista de canteiros ocupados, não digitado, então não acrescenta digitação ao campo.
2. **"Agregado por espécie e recipiente basta"**: não basta. Sem lote não se diz onde a muda está,
   a mortalidade só se mede sobre a espécie inteira (esvaziando RN-17) e a repicagem vira uma soma
   que entra e outra que sai, sem ligação entre as duas.

O limite não sumiu, subiu de altura: **o rastreamento vai até o lote, nunca até a muda**. O `A1`
§7 passou a excluir "rastreamento individual da muda".

**UC-17 não foi revertido, foi resolvido.** O caso rejeitava pedir o *local* da perda porque
acrescentaria um quinto campo a um formulário de campo de quatro. Com lote, o local **vem do
lote**: o formulário continua com quatro campos, e um deles troca de "espécie + recipiente" para
"lote", que já carrega os dois.

`plans/P2` deixa de estar à frente dos documentos: as tabelas que ele previa entram no modelo com
nomes reconciliados (`batches` + `batch_movements`, no lugar de `batches` + `batch_counts`), e a
contagem física de lote passa a ser `stock_counts` com `batch_id`, sem entidade paralela.

---

## Quinta passada: a rotina de produção contra o que ela deixou para trás (24/08/2026, depois das migrations)

A quarta passada conferiu o modelo **antes** de as migrations existirem, e por isso fala em "28
tabelas reais": as sete migrations `20260824000001` a `20260824000007` vieram depois dela, no mesmo
dia. Esta passada confere o estado resultante, com o banco local migrado e consultado pelo
`information_schema`.

**Conferiu certo o essencial.** As 7 migrations estão aplicadas, sem colisão de nome com tabela
existente e sem guarda condicional; as regras viraram restrição onde deviam (RN-76 por índice único
parcial no canteiro, RN-78 por `CHECK`, RN-79 pelo par `closed_at`/`bed_id`, RN-83 por índice único
parcial na pessoa); `B3` fecha em 82 regras com os tipos batendo; TA e UC não têm buraco de
numeração; os 686 testes passam e `permissions.ts` confere os 7 recursos novos contra o `D4`.

Nove correções:

1. **O recorte implementado ficou mentindo.** `C6` §2.1 e `C8` seguiam em "28 no banco, 27 só
   especificadas", e as dezesseis tabelas novas traziam a marca *Especificada, não implementada no
   protótipo*, embora existissem no banco. A conta passou a **44 no banco e 11 só especificadas**,
   todas do Financeiro, e as duas visões passaram a implementadas. Em cascata: o achado I acima e
   `word/`.
2. **`labor_rates` não batia em nenhuma coluna.** O `C8` declarava `year`, `month`,
   `payroll_total`, `hours_total` e `hourly_rate`; o banco tem `reference_month`, `total_payroll`,
   `total_hours` e `rate_per_hour`. O dicionário passou a seguir o banco, com a justificativa do mês
   como data e da coluna gerada.
3. **Três colunas existiam no banco e faltavam nos documentos**: `loss_events.client_id` (a
   idempotência offline da perda, RNF-05), `stock_counts.notes` e `batch_movements.recorded_by`.
   As duas primeiras faltavam no `C8` e no `C6`; a terceira, só no diagrama do `C6`.
4. **`input_stock_entries.transaction_id` estava no `C8` e não no banco.** É especificação à frente
   do código, como `task_expenses.cost_center_id`: passou a trazer a marca **Especificado, não
   implementado** e a aparecer no diagrama do `C6`, com a caixa de `transactions`.
5. **A entrada de insumo não tinha requisito que a originasse.** `input_stock_entries` existia no
   banco, a RN-88 a pressupunha ("entradas menos consumo") e o recurso `Estoque de insumo` do `D4`
   já a autorizava, mas nenhum RF mandava registrá-la: RF-101 é consumo, RF-102 saldo, RF-103
   alerta, RF-104 gasto e RF-105 negativo. Sem ela o saldo nasceria negativo em todo insumo. Entrou
   **RF-106**, com **UC-56** e **TA-85**, e a linha correspondente no `B5`.
6. **O saldo do lote dizia-se mantido pelo banco.** Não há gatilho: a migration cria a restrição de
   não negativo e a atualização fica com a aplicação, na mesma transação do movimento. `C6` e `C8`
   passaram a dizer isso.
7. **O conceitual tinha 21 entidades e o texto dizia vinte**, e as figuras em português tinham
   perdido `ESPECIE → PRODUCAO` e `ESPECIE → PERDA` na divisão da figura 6, o que desmentia a
   leitura "a espécie participa de sete relacionamentos". As duas voltaram à `fig06`.
8. **Contagens desatualizadas em quatro documentos**: o guia de elicitação dizia "RN-01 a RN-73"
   com o catálogo já em RN-90, e a sua tabela de áreas não trazia as dezessete regras novas; a
   tabela de técnicas de elicitação do mesmo guia vinha de quando havia 79 RF; o `B5` §4 contava 45
   casos de uso, 45 entidades, 32 recursos e 58 casos de aceite; e a `E2` §13 dava "80 dos 87 deve
   ter", contra 84 reais, e listava como descobertos seis requisitos que a própria `B5` dá por
   cobertos indiretamente.
9. **Os mapas de rotina atualizaram a Produção e esqueceram os Cadastros.** A tabela do
   `00-mapa-de-rotinas` ganhou área e canteiro e período de trabalho, mas `mapa-1-cadastros`,
   `mapa-4-areas` e `mapa-sistema-v2` seguiam em "4 de 6 etapas".

**A lição, para a próxima rodada:** as duas passadas do mesmo dia conferiram documento contra
documento e documento contra banco, e o que escapou às duas foi a **ordem**. A migration escrita
depois da conferência do modelo deixa o modelo desatualizado no mesmo dia em que foi conferido.
Quando a rodada inclui migration, a conferência é a última etapa, nunca a penúltima.

---

## M: um lote por canteiro, que o viveiro nunca praticou (26/08/2026)

🔴 **Divergência entre o modelo e a operação, e não entre documentos.** A RN-76 dizia "um lote ocupa
um canteiro" e o banco garantia isso com o índice único parcial
`batches_um_lote_aberto_por_canteiro`. O viveiro **nunca operou assim**: um canteiro recebe seis,
oito, nove levas ao mesmo tempo, e é assim que o espaço é usado.

| Onde estava | O que dizia |
|---|---|
| `B3` RN-76 | "Um lote ocupa um canteiro. Leva que não cabe é outro lote" |
| `C6` §3.2 e §3.3 | cardinalidade `beds ||--o| batches`, no máximo um |
| `C8` `batches` | "a pergunta da operação é 'o que tem neste canteiro', que um lote por canteiro responde sem junção" |
| `migrations/20260824000004` | `CREATE UNIQUE INDEX batches_um_lote_aberto_por_canteiro` |
| `plans/P14` decisão 2 | "Garantido por índice único parcial, não por validação de tela" |
| `C2` UC-47 FA-1 | a leva que não cabe vira dois lotes |

Os seis diziam a mesma coisa, coerentes entre si, e a coerência foi o que escondeu o erro: **nenhuma
conferência documento-contra-documento acharia isso**, porque não havia contradição para achar. As
cinco passadas anteriores compararam artefato com artefato e artefato com banco, e o erro não estava
em nenhum dos dois lados: estava entre o banco e o viveiro.

**Quem apontou foi um protótipo de tela.** O desenho do mapa de produção, feito no Figma antes de
qualquer código, mostra os lotes como quadrados dentro de cada canteiro, vários por canteiro. Foi ao
tentar escrever os requisitos daquele desenho que a contradição apareceu.

### Resolução: a exclusividade caiu, o resto ficou

A RN-76 tinha duas afirmações grudadas, e só uma era verdadeira:

1. **"Um lote não se espalha por dois canteiros"** — continua de pé, e é a que interessa: é ela que
   faz "o que tem neste canteiro" ter resposta direta, sem entidade de ocupação no meio.
2. **"Um canteiro tem no máximo um lote"** — caiu. Nunca foi observação, foi suposição.

O índice único foi derrubado em `20260826000001` e substituído por `batches.position`, a ordem do
lote dentro do canteiro, que é o que dá ao mapa um desenho estável. RN-79 foi emendada junto
("canteiro livre é canteiro sem **nenhum** lote aberto") e RN-92 entrou para dizer que a ocupação é
a soma dos saldos dos lotes abertos.

**A lição é sobre o que uma auditoria de documentos não alcança.** Cinco passadas conferiram
documento contra documento e documento contra banco. Nenhuma delas podia achar este erro, porque as
duas pontas concordavam entre si e discordavam **do viveiro**. O que achou foi desenhar a tela: a
figura obriga a representar o espaço, e o espaço não mente. **Protótipo de tela antes do código é
verificação de requisito, e não só de interface** — vale tratá-lo como tal na próxima rotina que for
levantada.

---

## Sexta passada: a própria entrega da tela de produção, conferida contra si mesma (26/08/2026)

A engenharia dos dois protótipos foi escrita, aplicada e commitada, e **em seguida auditada**. A
conferência achou cinco defeitos na entrega recém-feita, três deles de modelo e lógica:

1. **`task_recurrences` nascera sem turno**, e `assignments.shift_id` é `NOT NULL`. A ocorrência
   gerada por RF-115 não tinha de onde tirar o turno, e a hora não o determina: os turnos não cobrem
   o dia inteiro, e a rotina das 11h30 às 12h30 não cai em nenhum deles. Corrigido em
   `20260826000006`, com `shift_id` obrigatório.
2. **A visão `batch_health` tratava tarefa `confirmada` como pendência.** O filtro era
   `status <> 'nao_confirmada'`, escrito pensando só no fechamento da semana, e deixava passar o
   status que significa "o colaborador deu por concluída" (RF-74). O lote ficaria colorido por um
   serviço feito, sem nada na tela denunciando. Corrigido em `20260826000005`, com condição
   **positiva**: pendência é o que segue `planejada`, e nada mais.
3. **A divisão da figura 13 custou dois relacionamentos**, `especies → atribuicoes` e
   `recipientes → atribuicoes`, exatamente o que a caixa de aviso do
   [`README` do `modelo-dados-pt`](engenharia/modelo-dados-pt/README.md) manda conferir desde que a
   `fig06` cometeu a mesma falha. Segunda ocorrência do mesmo erro: a conferência virou **comando
   documentado** naquele README, e não mais uma lembrança.
4. **As chaves estrangeiras novas não ganharam relacionamento no `C6` §3.3**, nem a caixa `areas`.
   O `C8` listava os FKs corretamente e o desenho ficou atrás do texto: doze relacionamentos
   faltando entre `areas`/`beds`/`species`/`containers`/`batches`/`work_shifts` e as três entidades
   de agenda. Repostos, e o `C6` e as figuras voltaram a bater, 31 de cada lado.
5. **`word/4.4-modelagem-do-sistema.md` estava desatualizado**, gerado antes da última correção no
   `C2`. É a mesma lição da quinta passada, de novo: **a geração é a última etapa, nunca a
   penúltima**. Desta vez o que ficou entre as duas foi uma edição de documento, e não uma
   migration.

**A lição desta passada:** auditar a própria entrega, no mesmo dia, achou o que a escrita não achou.
Os defeitos 1 e 2 só apareceram ao perguntar "isto é implementável?" e "quais valores esta coluna
aceita mesmo?", que são perguntas de conferência, não de redação. O defeito 3 já tinha aviso escrito
e mesmo assim aconteceu: **aviso que depende de alguém lembrar não é controle**, e por isso virou
comando.
