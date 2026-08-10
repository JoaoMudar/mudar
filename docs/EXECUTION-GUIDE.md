# Guia de Execução

> Reescrito em **10/08/2026**. A versão anterior descrevia um cronograma de 4 meses (P1→P10,
> sessão por sessão) que a realidade não seguiu — o que se construiu primeiro foi
> Pedidos/Clientes/Fornecedores, que nem constava do roadmap. Este guia parte de onde o projeto
> **está**, não de onde se planejou que estivesse.
>
> O planejamento original está preservado no histórico do git, caso sirva ao TCC como material
> sobre a diferença entre planejado e executado.

## Estrutura real do repositório

```
viveiro-mudar/
├── CLAUDE.md                  ← regras, carregado em toda sessão
├── docs/
│   ├── README.md              ← mapa da documentação (entrada)
│   ├── auditoria-divergencias.md  ← divergências conhecidas (ler antes de implementar)
│   ├── contexto-projeto.md    ← roadmap e estado de cada projeto
│   ├── rotinas/               ← domínio, em linguagem de negócio
│   └── engenharia/            ← artefatos formais (base do Cap. 4 do TCC)
├── plans/                     ← P1…P13, roadmaps de implementação
├── migrations/                ← SQL puro, ordem cronológica
├── data/seeds/                ← cargas iniciais
├── scripts/                   ← migrate, seeds, refresh do banco local, build do TCC
└── src/                       ← Next.js App Router
```

## Onde o projeto está

| | Projeto | Estado |
|---|---|---|
| ✅ | **P11** Fornecedores e cotação | concluído, em produção |
| ✅ | Pedidos, Clientes, Acesso | concluídos (fora do roadmap original) |
| 🟡 | **P1** Custeio | cadastros e view prontos; falta o motor de cálculo |
| 🟡 | **P12** Financeiro sobre extratos | Fase 0 (decisões) fechada |
| 📐 | **P13** Cadastro único + agenda de pessoal | desenhado, não implementado |
| ⬜ | P2, P3, P4, P5, P6, P7, P8, P9, P10 | não iniciados |

## Ordem recomendada a partir daqui

A ordem mudou por um motivo concreto: **o custo unitário depende da mão de obra, e a mão de
obra só existe quando a agenda de pessoal estiver registrando horas.** P1 deixou de ser o
primeiro da fila.

```
1. P13 Fase 1  ─ schema cadastro + parties        ← compartilhada com P12; fazer uma vez só
2. P13 Fases 2-4  ─ /cadastros, agenda, execução
3. P13 Fase 5  ─ custo de mão de obra
4. P1  T1.18-T1.20  ─ motor de cálculo de custo   ← agora tem todos os insumos do cálculo
5. P12 Fases 1-6  ─ financeiro sobre extratos
6. P3  ─ precificação                              ← só faz sentido com custo real
7. P2  ─ perdas          |  8. P6 ─ dashboard (pelas fichas do G2)
```

P4, P5, P7, P8, P9 e P10 seguem depois, na ordem do
[`contexto-projeto.md`](contexto-projeto.md).

## Como conduzir uma sessão

1. **Confirmar a branch.** `git branch --show-current`. Se estiver em `main`, parar e criar
   `git checkout -b feat/nome-da-tarefa`. Nunca editar direto na main.
2. **Ler o plan file da fase** e a rotina de domínio correspondente em `docs/rotinas/`.
3. **Conferir a auditoria.** Vários planos foram escritos para Supabase — traduzir antes de
   implementar. Ver [`auditoria-divergencias.md`](auditoria-divergencias.md).
4. **Uma task por vez**, marcando `[x]` no plan file ao concluir. O plan file é o checkpoint
   entre sessões.
5. **Testes junto com o código.** Vitest em `__tests__/` ao lado do arquivo. Server Action que
   depende do banco: mockar com `vi.mock`.
6. **`npm test` antes de commitar** — o hook de pre-commit roda lint + testes e bloqueia se falhar.
7. **Fechar com resumo**: o que foi feito, arquivos alterados, decisões técnicas e pendências.

## Comandos

| Comando | Para quê |
|---|---|
| `npm run dev` | sobe a aplicação |
| `npm test` | roda os testes (obrigatório antes do commit) |
| `npm run db:migrate` | aplica as migrations pendentes |
| `npm run db:migrate:status` | mostra o que está pendente |
| `npm run db:refresh-local` | espelha o Neon num Postgres local descartável |
| `npm run db:seed-admin` | cria o usuário administrador |
| `npm run docs:tcc` | regenera `docs/engenharia/word/` com os diagramas em PNG |

## Bancos

**São dois, e o driver é escolhido pelo host da `DATABASE_URL`** — não pelo `NODE_ENV`:

| Ambiente | Banco | Driver |
|---|---|---|
| Desenvolvimento | Postgres local (`localhost:5432`) | `pg`, pool TCP |
| Produção (Vercel) | Neon, `sa-east-1` | `@neondatabase/serverless` |

> **Neon é só o banco.** Não tem Edge Functions, Storage, Realtime nem RLS ligado a
> autenticação — nada da plataforma Supabase, que o projeto chegou a considerar e abandonou.
> Controle de acesso é checagem de perfil dentro da Server Action, conforme a
> [Matriz RBAC (D4)](engenharia/D-arquitetura/D4-matriz-rbac.md).

Toda migration aplicada no local precisa ser aplicada também no Neon antes do deploy.

## Trabalho de campo em paralelo

Parte de cada plano não depende de código — é levantamento que a equipe faz no viveiro, na
seção "Dados que a Equipe de Campo Precisa Levantar" de cada plan file. O levantamento de
custos do P1 é o mais crítico de todos: é a dependência-raiz do indicador IND-02 e, por
tabela, de toda a análise de margem
([`E3`, risco R-01](engenharia/E-qualidade/E3-analise-de-riscos.md)).
