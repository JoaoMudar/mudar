# 🗺️ Mapa da Documentação: Viveiro Mudar

> Ponto de entrada único da documentação. Comece por aqui para se situar.
> O `CLAUDE.md` (na raiz) é o contexto carregado em toda sessão e aponta para cá.

## Onde fica cada coisa

| Local | O que é | Quando ler |
|-------|---------|------------|
| `CLAUDE.md` (raiz) | Regras, stack, convenções, workflow. Carregado sempre. | Sempre: é a fonte das regras. |
| `docs/` | Documentação de referência (este diretório). | Para entender contexto, domínio e fluxo de trabalho. |
| `plans/` (raiz) | Roadmaps de implementação P1–P10 (trabalho ativo). | Antes de implementar uma feature. |
| `migrations/` (raiz) | Migrações SQL (`psql` puro), em ordem cronológica. | Ao mexer no schema do banco. |
| `data/seeds/` (raiz) | Fontes de carga inicial (seed): ex.: export das 142 espécies. Ver `data/seeds/README.md`. | Ao gerar/re-importar dados de catálogo. |
| `src/` (raiz) | Código da aplicação (Next.js App Router). | Ao implementar. |

## Por onde começar (ordem de leitura para pegar contexto)

1. **`CLAUDE.md`** (raiz): regras e convenções inegociáveis.
2. **`docs/contexto-projeto.md`**: visão geral, arquitetura dos projetos, histórico, princípios de UX de campo.
3. **`docs/funcionarios-viveiro-mudar.md`**: quem é quem (perfis: chefia, gerência, colaborador).
4. **`docs/rotinas/00-mapa-de-rotinas.md`**: os **quatro módulos** (Cadastros, Produção, Comercial, Financeiro), as rotinas de cada um e quais perfis tocam cada etapa.
5. **`plans/`**: o plano da feature que você vai implementar.

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
| [`auditoria-divergencias.md`](auditoria-divergencias.md) | **Auditoria 10/08/2026**: divergências entre docs, planos e código, com ordem de correção. Ler antes de retomar o desenvolvimento. |
| [`divida-tecnica.md`](divida-tecnica.md) | **Trabalho futuro (11/08/2026)**: o que falta para a produção ser segura de operar: backup, teste contra banco real, drift de schema. Prontidão medida: ~85%. |
| [`postmortem-financeiro-bi.md`](postmortem-financeiro-bi.md) | Por que o BI sobre a planilha `DESPESAS AAAA.xls` foi abandonado (ago/2026). Ler antes de mexer em financeiro. |

> **Financeiro:** a abordagem nova (extrato bancário como fonte da verdade) está em
> [`rotinas/4-financeiro/`](rotinas/4-financeiro/) e em
> [`plans/P12-conciliacao-bancaria.md`](../plans/P12-conciliacao-bancaria.md).
> Leia o post-mortem acima **antes** de qualquer linha de código financeiro.

### Engenharia de software (`docs/engenharia/`)

Documentação **formal de engenharia**, produzida como base do **Capítulo 4 (Resultados)** do TCC.
Distinta de `docs/rotinas/`, que é documentação de domínio em linguagem de negócio.

Comece por [`engenharia/README.md`](engenharia/README.md), explica a estrutura de pastas.
Índice completo, com status de cada artefato, em [`engenharia/00-indice.md`](engenharia/00-indice.md).

| Bloco | Artefatos |
|-------|-----------|
| A: Fundação | Documento de Visão, Glossário do domínio |
| B: Requisitos | Especificação de Requisitos (105 RF, 26 RNF), Regras de negócio (82 RN), Quadros do TCC, Matriz de rastreabilidade |
| C: Modelagem | Casos de uso (55 UC), Especificação de casos de uso, MER/DER (55 entidades), Dicionário de dados |
| D: Arquitetura | Arquitetura C4, Diagrama de implantação, Matriz RBAC |
| E: Qualidade | Casos de teste de aceite, Riscos, Modelagem de ameaças, LGPD, Backup |
| F: Usabilidade | Plano de avaliação (5 atributos de Nielsen) |
| G: Gestão | Fichas de indicadores (KPI) |

> **Entrega para o TCC:** `npm run docs:tcc` regenera [`engenharia/word/`](engenharia/word/), os
> arquivos na ordem do Capítulo 4, com os diagramas exportados em PNG. A pasta é **gerada**: editar
> lá não adianta, edite o artefato de origem.

### Domínio: rotinas de negócio (`docs/rotinas/`)
Cada rotina descreve um processo do viveiro e quais perfis executam cada etapa.
Mapa em [`rotinas/00-mapa-de-rotinas.md`](rotinas/00-mapa-de-rotinas.md).

O mapa traz também o **diagrama de como os quatro módulos se relacionam** e um diagrama por módulo.

| Módulo | Rotina | Arquivo |
|--------|--------|---------|
| **1 · Cadastros** | Cadastro único (agrupador) | [`rotinas/1-cadastros/00-visao-geral.md`](rotinas/1-cadastros/00-visao-geral.md) |
| **1 · Cadastros** | Clientes (visão geral + detalhamento) | [`rotinas/1-cadastros/clientes.md`](rotinas/1-cadastros/clientes.md) e a pasta [`rotinas/1-cadastros/clientes/`](rotinas/1-cadastros/clientes/) |
| **1 · Cadastros** | Centros de custo (cadastro aqui, tabela no schema `financeiro`) | [`rotinas/1-cadastros/centros-de-custo.md`](rotinas/1-cadastros/centros-de-custo.md) |
| **2 · Produção** | Produção (visão geral + subrotinas) | [`rotinas/2-producao/00-visao-geral.md`](rotinas/2-producao/00-visao-geral.md) e a pasta [`rotinas/2-producao/`](rotinas/2-producao/) |
| **2 · Produção** | Estoque | [`rotinas/2-producao/02-estoque.md`](rotinas/2-producao/02-estoque.md) |
| **2 · Produção** | Perdas | [`rotinas/2-producao/03-perdas.md`](rotinas/2-producao/03-perdas.md) |
| **2 · Produção** | Lotes e canteiros | [`rotinas/2-producao/04-lotes-e-canteiros.md`](rotinas/2-producao/04-lotes-e-canteiros.md) |
| **2 · Produção** | Apontamento de tarefas | [`rotinas/2-producao/05-apontamento-de-tarefas.md`](rotinas/2-producao/05-apontamento-de-tarefas.md) |
| **3 · Comercial** | Comercial (visão geral do módulo) | [`rotinas/3-comercial/00-visao-geral.md`](rotinas/3-comercial/00-visao-geral.md) |
| **3 · Comercial** | Pedidos (visão geral + detalhamento) | [`rotinas/3-comercial/pedidos.md`](rotinas/3-comercial/pedidos.md) e a pasta [`rotinas/3-comercial/pedidos/`](rotinas/3-comercial/pedidos/) |
| **3 · Comercial** | Cotação com fornecedores | sem rotina própria: está no plano [`P11`](../plans/P11-fornecedores-cotacao.md) |
| **3 · Comercial** | Entregas | [`rotinas/3-comercial/entregas.md`](rotinas/3-comercial/entregas.md) |
| **4 · Financeiro** | Financeiro (visão geral + detalhamento) | [`rotinas/4-financeiro/00-visao-geral.md`](rotinas/4-financeiro/00-visao-geral.md) e a pasta [`rotinas/4-financeiro/`](rotinas/4-financeiro/) |
| - | ~~Tarefas diárias~~ | absorvida pela Produção; [`rotinas/2-producao/99-tarefas-diarias-historico.md`](rotinas/2-producao/99-tarefas-diarias-historico.md) fica como histórico |

A rotina de **Produção** tem detalhamento em [`rotinas/2-producao/`](rotinas/2-producao/): visão
geral e três subrotinas, a **agenda de pessoal** (grade semanal de quem faz o quê), o
**apontamento de tarefas** (início e fim por funcionário, base do custo de mão de obra) e
**lotes e canteiros** (onde a muda está e de que leva veio).

A rotina de **Pedidos** tem detalhamento por etapa em [`rotinas/3-comercial/pedidos/`](rotinas/3-comercial/pedidos/):
banco de dados, notificações, cadastro, verificação de disponibilidade, análise/fechamento e separação.

A rotina de **Clientes** tem detalhamento por fase em [`rotinas/1-cadastros/clientes/`](rotinas/1-cadastros/clientes/):
banco de dados (campos fiscais), validações, área `/clientes`, integração com NF no fechamento de pedido,
testes e o futuro de emissão de nota fiscal via API.

A rotina de **Financeiro** tem detalhamento por fase em [`rotinas/4-financeiro/`](rotinas/4-financeiro/):
visão geral do modelo (extrato como fonte da verdade), o cadastro único (`cadastro.parties`), o schema
`financeiro` com suas listas fechadas e regras invioláveis, e a relação com pedidos, fornecedores e custeio.

## Roadmap de implementação (`plans/`)

Projetos interdependentes: a ordem importa (detalhe em `docs/contexto-projeto.md`):

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

Fora do encadeamento original:

| Plano | Assunto | Status |
|---|---|---|
| [`P11-fornecedores-cotacao.md`](../plans/P11-fornecedores-cotacao.md) | Rede de fornecedores e cotação | ✅ concluído |
| [`P12-conciliacao-bancaria.md`](../plans/P12-conciliacao-bancaria.md) | Financeiro sobre extratos | Fase 0 concluída |
| [`P13-producao-agenda-cadastros.md`](../plans/P13-producao-agenda-cadastros.md) | Cadastro único + agenda de pessoal (destrava o custo de mão de obra do P1) | desenho fechado |

> **P13 e P12 compartilham a Fase 1** (schema `cadastro`, tabela `parties`). Implementar uma vez.
> O P13 lista também as **incongruências encontradas nos documentos de engenharia** que
> precisam de revisão antes da entrega do Cap. 4.
