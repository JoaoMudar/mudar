# Auditoria de divergências — docs × planos × código

> Feita em **10/08/2026**, antes de retomar o desenvolvimento. Objetivo: colocar toda a
> documentação na mesma linha, para que nenhum plano mande construir algo que o sistema
> real não comporta.
>
> Método: leitura dos 13 planos, das 9 rotinas, dos 17 artefatos de engenharia e conferência
> contra `migrations/`, `src/` e `package.json`.

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
| [H](#h--pendências-já-registradas-do-p13) | Agenda de pessoal e cadastro único ainda não estão na engenharia | 🟡 conhecida |
| [I](#i--o-que-não-é-divergência) | 39 entidades especificadas × 25 tabelas reais | ⚪ não é erro |

---

## A — Stack fantasma (Supabase em 6 planos)

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

## B — Tarefa marcada como feita que foi desfeita

`plans/P1-custeio-por-especie.md` linha 76:

```
- [x] **T1.8** Criar RLS policies: apenas usuários autenticados leem/escrevem. Admin full access.
```

A migration correspondente não cria política nenhuma — remove o conceito. O `[x]` afirma uma
proteção que não existe. É o tipo de marca que, mantida, faz alguém assumir que o banco tem
defesa própria e escrever uma Server Action sem checar perfil.

## C — Cabeçalho de status mentindo

| Plano | Cabeçalho diz | Caixas marcadas | Realidade |
|---|---|---|---|
| **P1** | `## Status: NÃO INICIADO` | 16 de 32 | tabelas, view e todos os CRUDs prontos; falta o motor de cálculo |
| **P11** | *(sem cabeçalho de status)* | 25 de 25 | concluído e em produção |
| **P12** | Fase 0 concluída | 1 de 7 | correto |
| P2…P10 | NÃO INICIADO | 0 | correto |

## D — `colaborador` nos docs × `funcionario` no banco

```sql
-- migrations/20260521000001_auth_users_sessions.sql
CREATE TYPE user_role AS ENUM ('admin', 'chefia', 'gerencia', 'funcionario');
```

Toda a documentação — `00-mapa-de-rotinas`, `D4 Matriz RBAC`, `C1 Casos de uso`,
`G2 Indicadores`, `B2 Requisitos` — chama esse perfil de **Colaborador**. A palavra
`colaborador` não aparece em uma linha de código.

O problema piora com o [cadastro único](rotinas/rotina-cadastros.md): lá, `funcionario` é um
**papel de cadastro** (`cadastro.party_roles`), que significa "é nosso empregado" — e existe
para gente que não tem login nenhum. Passa a haver dois `funcionario` com sentidos diferentes:

| Termo | Onde | Significa |
|---|---|---|
| `user_role = 'funcionario'` | `users` | nível de acesso mais baixo do app |
| `party_roles.role = 'funcionario'` | `cadastro.party_roles` | esta pessoa trabalha aqui |

Gilberto é chefia no primeiro sentido e funcionário no segundo. Sem desambiguar, a matriz RBAC
e o cadastro vão brigar na primeira consulta que juntar os dois.

## E — Roadmap desatualizado em três lugares

O diagrama `P1 → P10` está copiado em `CLAUDE.md`, `docs/contexto-projeto.md` e
`docs/README.md`. Nenhuma das três cópias inclui **P11** (concluído), **P12** (em curso) ou
**P13** (novo). O `docs/README.md` já ganhou uma tabela complementar nesta rodada; as outras duas
continuam mostrando só o encadeamento original.

A ordem real de execução também não foi a planejada: o que se construiu primeiro foi
Pedidos/Clientes/Fornecedores — que sequer existiam no roadmap original.

## F — `EXECUTION-GUIDE` fossilizado

`docs/EXECUTION-GUIDE.md` descreve um cronograma de 4 meses, sessão por sessão, de P1 a P10.
Três problemas:

1. **A realidade não seguiu.** "Sprint 1 Sessão 2: P2 Fase 1" nunca aconteceu; P2 está zerado
   e o que se construiu foi P11.
2. **A árvore de arquivos está errada** — não mostra `migrations/`, `docs/rotinas/`,
   `docs/engenharia/`, `data/seeds/`.
3. **Não menciona** os testes obrigatórios nem o hook de pre-commit, que hoje são regra do
   `CLAUDE.md` e bloqueiam commit.

## G — Dois documentos definindo os mesmos indicadores

| | `G2 — Fichas de indicadores` | `P6 — Dashboard` |
|---|---|---|
| Quantos | 9 (IND-01 a IND-09) | "5-7, a definir" |
| Especificação | fórmula, fonte, janela, meta, faixas, responsável | lista de nomes |
| Painel por perfil | definido (chefia 9, gerência 4, colaborador nenhum) | não trata |
| Regra de mês aberto | travessão, nunca zero (RF-61) | não trata |

São a mesma tela especificada duas vezes, e `P6` é a versão mais fraca e mais antiga. Quem
implementar o dashboard lendo só o plano vai construir a coisa errada.

## H — Pendências já registradas do P13

Cadastro único e agenda de pessoal ainda não constam da engenharia: faltam ~8 RF em `B2`, o
subsistema Cadastros em `C1`, quatro entidades em `C6`/`C8`, a regra do colaborador em `D4` e
as linhas novas em `B5`. Lista completa em
[`plans/P13-producao-agenda-cadastros.md`](../plans/P13-producao-agenda-cadastros.md).

## I — O que **não** é divergência

`C6`/`C8` especificam **39 entidades**; o banco tem **25 tabelas**. Isso é intencional e está
declarado em `docs/engenharia/00-indice.md`:

> Os artefatos são redigidos em tempo de projeto, como especificação da solução a ser
> construída. São documentos de projeto, não relatórios de código.

As 14 entidades ainda não criadas (`production_activities`, `loss_events`, `stock_counts`,
`accounts`, `cost_centers`, `categories`, `parties`, `transactions`, `transaction_splits`,
`classification_rules`, `periods`, `statement_imports`, `sale_channels`, `sale_prices`)
correspondem a P2, P3, P12 e P13 — projetos especificados e não implementados.

**Também conferido e consistente:**

- Os 8 estados de pedido (`cadastrado` → `pronto_envio`) batem entre código, `rotinas/rotina-pedidos/`,
  `C2`, `C8`, `D4` e `E2`. É a área mais bem mantida do projeto.
- Os 5 canais de venda batem entre `CLAUDE.md`, `orders.ts` e o banco.
- O limite de mortalidade de 20% bate entre `CLAUDE.md`, `RF-29` e `IND-01`.
- Contagens declaradas conferem: 68 RF, 26 RNF, 40 casos de uso.
- Financeiro: as 9 contas e os 5 centros de custo batem entre `P12`, `rotina-financeiro/` e `C8`.

---

## Ordem de correção sugerida

1. **B e C** — um minuto cada, e são afirmações falsas dentro dos planos.
2. **A** — reescrever as tarefas de infraestrutura dos 6 planos para a stack real.
3. **D** — decidir o nome do perfil e aplicar em toda a linha.
4. **G** — `P6` passa a apontar para `G2` em vez de redefinir os indicadores.
5. **E e F** — roadmap único e guia de execução refeito ou aposentado.
6. **H** — junto da implementação do P13.
