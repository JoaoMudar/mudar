# 🗺️ Mapa da Documentação — Viveiro Mudar

> Ponto de entrada único da documentação. Comece por aqui para se situar.
> O `CLAUDE.md` (na raiz) é o contexto carregado em toda sessão e aponta para cá.

## Onde fica cada coisa

| Local | O que é | Quando ler |
|-------|---------|------------|
| `CLAUDE.md` (raiz) | Regras, stack, convenções, workflow. Carregado sempre. | Sempre — é a fonte das regras. |
| `docs/` | Documentação de referência (este diretório). | Para entender contexto, domínio e fluxo de trabalho. |
| `plans/` (raiz) | Roadmaps de implementação P1–P10 (trabalho ativo). | Antes de implementar uma feature. |
| `migrations/` (raiz) | Migrações SQL (`psql` puro), em ordem cronológica. | Ao mexer no schema do banco. |
| `data/seeds/` (raiz) | Fontes de carga inicial (seed) — ex.: export das 142 espécies. Ver `data/seeds/README.md`. | Ao gerar/re-importar dados de catálogo. |
| `src/` (raiz) | Código da aplicação (Next.js App Router). | Ao implementar. |

## Por onde começar (ordem de leitura para pegar contexto)

1. **`CLAUDE.md`** (raiz) — regras e convenções inegociáveis.
2. **`docs/contexto-projeto.md`** — visão geral, arquitetura dos projetos, histórico, princípios de UX de campo.
3. **`docs/funcionarios-viveiro-mudar.md`** — quem é quem (perfis: chefia, gerência, colaborador).
4. **`docs/rotinas/00-mapa-de-rotinas.md`** — as 7 rotinas de negócio e quais perfis tocam cada etapa.
5. **`plans/`** — o plano da feature que você vai implementar.

## Conteúdo de `docs/`

### Referência geral
| Arquivo | Conteúdo |
|---------|----------|
| [`contexto-projeto.md`](contexto-projeto.md) | Histórico, arquitetura P1→P10, princípios de formulário de campo. |
| [`funcionarios-viveiro-mudar.md`](funcionarios-viveiro-mudar.md) | A equipe e os perfis de acesso. |

### Como trabalhar no projeto (workflow)
| Arquivo | Conteúdo |
|---------|----------|
| [`fluxo-claude-code-git.md`](fluxo-claude-code-git.md) | Fluxo de branches/commits com Claude Code (referenciado pelo `CLAUDE.md`). |
| [`banco-local-espelho.md`](banco-local-espelho.md) | Espelhar o Neon para um Postgres local descartável (`npm run db:refresh-local`) para testes seguros. |
| [`EXECUTION-GUIDE.md`](EXECUTION-GUIDE.md) | Como conduzir as sessões de desenvolvimento e a ordem dos sprints. |
| [`plano-seguranca-commits.md`](plano-seguranca-commits.md) | Plano histórico de segurança de commits (hooks, gitignore). |
| [`postmortem-financeiro-bi.md`](postmortem-financeiro-bi.md) | Por que o BI sobre a planilha `DESPESAS AAAA.xls` foi abandonado (ago/2026). Ler antes de mexer em financeiro. |

> **Financeiro:** a abordagem nova (extrato bancário como fonte da verdade) está em
> [`rotinas/rotina-financeiro/`](rotinas/rotina-financeiro/) e em
> [`plans/P12-conciliacao-bancaria.md`](../plans/P12-conciliacao-bancaria.md).
> Leia o post-mortem acima **antes** de qualquer linha de código financeiro.

### Engenharia de software (`docs/engenharia/`)

Documentação **formal de engenharia**, produzida como base do **Capítulo 4 (Resultados)** do TCC.
Distinta de `docs/rotinas/`, que é documentação de domínio em linguagem de negócio.

Comece por [`engenharia/README.md`](engenharia/README.md) — explica a estrutura de pastas.
Índice completo, com status de cada artefato, em [`engenharia/00-indice.md`](engenharia/00-indice.md).

| Bloco | Artefatos |
|-------|-----------|
| A — Fundação | Documento de Visão, Glossário do domínio |
| B — Requisitos | Especificação de Requisitos (68 RF, 26 RNF), Matriz de rastreabilidade |
| C — Modelagem | Casos de uso, Especificação de casos de uso, MER/DER (39 entidades), Dicionário de dados |
| D — Arquitetura | Arquitetura C4, Diagrama de implantação, Matriz RBAC |
| E — Qualidade | Casos de teste de aceite, Riscos, Modelagem de ameaças, LGPD, Backup |
| F — Usabilidade | Plano de avaliação (5 atributos de Nielsen) |
| G — Gestão | Fichas de indicadores (KPI) |

> **Entrega para o TCC:** `npm run docs:tcc` regenera [`engenharia/word/`](engenharia/word/) — os
> arquivos na ordem do Capítulo 4, com os diagramas exportados em PNG. A pasta é **gerada**: editar
> lá não adianta, edite o artefato de origem.

### Domínio — rotinas de negócio (`docs/rotinas/`)
Cada rotina descreve um processo do viveiro e quais perfis executam cada etapa.
Mapa em [`rotinas/00-mapa-de-rotinas.md`](rotinas/00-mapa-de-rotinas.md).

| Rotina | Arquivo |
|--------|---------|
| Pedidos (visão geral + detalhamento) | [`rotinas/rotina-pedidos.md`](rotinas/rotina-pedidos.md) e a pasta [`rotinas/rotina-pedidos/`](rotinas/rotina-pedidos/) |
| Clientes (visão geral + detalhamento) | [`rotinas/rotina-clientes.md`](rotinas/rotina-clientes.md) e a pasta [`rotinas/rotina-clientes/`](rotinas/rotina-clientes/) |
| Estoque | [`rotinas/rotina-estoque.md`](rotinas/rotina-estoque.md) |
| Tarefas diárias | [`rotinas/rotina-tarefas.md`](rotinas/rotina-tarefas.md) |
| Perdas | [`rotinas/rotina-perdas.md`](rotinas/rotina-perdas.md) |
| Entregas | [`rotinas/rotina-entregas.md`](rotinas/rotina-entregas.md) |
| Financeiro (visão geral + detalhamento) | [`rotinas/rotina-financeiro.md`](rotinas/rotina-financeiro.md) e a pasta [`rotinas/rotina-financeiro/`](rotinas/rotina-financeiro/) |
| Produção | [`rotinas/rotina-producao.md`](rotinas/rotina-producao.md) |

A rotina de **Pedidos** tem detalhamento por etapa em [`rotinas/rotina-pedidos/`](rotinas/rotina-pedidos/):
banco de dados, notificações, cadastro, verificação de disponibilidade, análise/fechamento e separação.

A rotina de **Clientes** tem detalhamento por fase em [`rotinas/rotina-clientes/`](rotinas/rotina-clientes/):
banco de dados (campos fiscais), validações, área `/clientes`, integração com NF no fechamento de pedido,
testes e o futuro de emissão de nota fiscal via API.

A rotina de **Financeiro** tem detalhamento por fase em [`rotinas/rotina-financeiro/`](rotinas/rotina-financeiro/):
visão geral do modelo (extrato como fonte da verdade), o cadastro único (`cadastro.parties`), o schema
`financeiro` com suas listas fechadas e regras invioláveis, e a relação com pedidos, fornecedores e custeio.

## Roadmap de implementação (`plans/`)

Projetos interdependentes — a ordem importa (detalhe em `docs/contexto-projeto.md`):

```
P1 (Custeio) ──┐
P2 (Perdas)  ──┤──→ P6 (Dashboard) ──→ P7 (Catálogo)
P3 (Preço)   ──┘                         ↓
                                     P9 (Site) → P10 (E-commerce)
P4 (WhatsApp) ← depende de P1+P3
P5 (Automação n8n) ← depende de P4
P8 (Instagram) ← independente
```

Planos: `plans/P1-custeio-por-especie.md` … `plans/P10-ecommerce-kits-tematicos.md`.
