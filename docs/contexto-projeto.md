# Contexto do Projeto — Viveiro Mudar

> Conteúdo de referência movido do `CLAUDE.md` para não pesar no contexto de toda sessão.
> Consultar quando precisar de visão geral de arquitetura, histórico ou princípios de UX de campo.

## Histórico / contexto crítico
- A empresa opera há anos **sem dados estruturados** — tudo feito de cabeça.
- O sistema de NF atual é do Sebrae — dados de notas em Excel com campos genéricos.
- Não existe controle de lotes, perdas, margem por espécie nem estoque estruturado.

## Os quatro módulos

O sistema tem **quatro módulos** — Cadastros, Produção, Comercial, Financeiro — com Acesso
transversal (login, senha, aparelhos, usuários, notificações). Essa é a taxonomia única do
projeto: organiza a navegação (`src/lib/modules.ts`), a matriz de permissões
(`src/lib/permissions.ts`), as pastas de [`docs/rotinas/`](rotinas/) e os artefatos de
engenharia. O desenho e a justificativa de cada corte estão em
[`docs/rotinas/00-mapa-de-rotinas.md`](rotinas/00-mapa-de-rotinas.md).

**Módulo ≠ projeto.** O módulo diz *onde a tela mora*; o projeto (`P1`…`P13`) diz *em que
ordem se constrói*. Um projeto pode atravessar módulos — o P1 põe cadastro em Cadastros,
formulário em Produção e o motor de custo no Financeiro.

| Módulo | O que reúne | Projetos que o constroem |
|---|---|---|
| **1 · Cadastros** | espécies, recipientes, insumos, pessoas (cliente/fornecedor/funcionário), tipos de tarefa | P1 (T1.13–T1.15), P11, P13 |
| **2 · Produção** | consumo de insumo, coleta de sementes, agenda de pessoal, atividade, lotes, perdas, estoque | P1 (T1.10–T1.12, T1.17), P2, P13 |
| **3 · Comercial** | pedidos, cotação com fornecedores, entregas | rotina de pedidos, P11, P4, P5 |
| **4 · Financeiro** *(restrito)* | extratos, lançamentos, compras, custos fixos, custeio, precificação, indicadores | P12, P1 (T1.16, T1.18–T1.20), P3, P6 |
| *(transversal)* **Acesso** | login, senha, sessões, usuários, permissões, notificações | feito, sem plano próprio |
| *(fora dos módulos)* **Superfície pública** | catálogo, site, loja, Instagram | P7, P8, P9, P10 |

**Por que o Financeiro é o módulo restrito:** a base bancária mistura gasto do viveiro com
gasto pessoal da família e da clínica. Extrato, lançamento, compra, custo fixo e fechamento
são de chefia/admin. O que é **derivado** — custo unitário, margem, preço, indicadores
operacionais — continua em leitura para a gerência: a restrição é por recurso, não pela porta
do módulo (`D4 §3.2`).

## Arquitetura dos Projetos

Os projetos são interdependentes. A ordem de implementação importa.

**Estado real (19/08/2026):**

| Projeto | Módulo principal | Situação |
|---|---|---|
| **P11** Fornecedores / Cotação | 3 · Comercial | ✅ concluído (5 fases) |
| **P13** Cadastro único + Agenda | 1 · Cadastros → 2 · Produção | 🟡 Fases 1–2 em curso — `parties` e a área `/cadastros` feitas; agenda não |
| **P1** Custeio | 4 · Financeiro | 🟡 parcial — 16/32; cadastros e formulário ok, falta o motor de cálculo |
| **P12** Financeiro (extratos) | 4 · Financeiro | 🟡 Fases 0–1 fechadas; Fase 2 (schema `financeiro`) é a próxima |
| **P2** Perdas / mortalidade | 2 · Produção | ⬜ não iniciado |
| **P3** Precificação | 4 · Financeiro | ⬜ não iniciado |
| **P6** Dashboard / indicadores | 4 · Financeiro | ⬜ não iniciado |
| **P4** WhatsApp · **P5** n8n | 3 · Comercial | ⬜ não iniciados |
| **P7** Catálogo · **P8** Instagram · **P9** Site · **P10** E-commerce | público | ⬜ não iniciados |

**Encadeamento:**

```
P13 (Cadastro único + Agenda) ──┬──→ P1 (Custeio) ──→ P3 (Preço) ──┐
                                │                                   ├──→ P6 (Dashboard)
P12 (Financeiro) ───────────────┘         P2 (Perdas) ──────────────┘
                                                          ↓
                                                     P7 (Catálogo)
                                                          ↓
                                              P9 (Site) → P10 (E-commerce)
P4 (WhatsApp) ← depende de P1+P3        P5 (n8n) ← depende de P4
P8 (Instagram) ← independente (campo)   P11 (Fornecedores) ✅ feito
```

**O que mudou em relação ao plano original:** P1 deixou de ser o primeiro. O custo unitário
precisa da mão de obra, e a mão de obra só existe quando a agenda de pessoal (P13) estiver
registrando horas. P13 e P12 compartilham a mesma Fase 1 — o schema `cadastro` com `parties`.

Fora do encadeamento original: **P11** (concluído), **P12** e **P13**. Divergências
conhecidas entre planos e código em [`auditoria-divergencias.md`](auditoria-divergencias.md).

## O ciclo que fecha (e o elo que falta)

O fluxo entre os módulos **não é uma fila, é um anel**: a compra nasce no Financeiro e volta
para a Produção; consumo e horas voltam para o custeio; o preço volta para o Comercial na
aprovação; a venda volta para o Financeiro. Quebrar qualquer elo faz o preço voltar a ser
chute.

O elo quebrado hoje é a **agenda de pessoal** (P13 Fase 3) — única fonte possível de horas.
Enquanto ela não existir, o custeio soma insumo e custo fixo, e devolve um custo
sistematicamente subestimado: exatamente o erro que o projeto existe para corrigir.

## Formulários de campo (princípios de UX)
- Máximo 5 campos por tela.
- Dropdowns com opções pré-definidas (nunca campo aberto para categorias).
- Botões grandes para dedos sujos de terra.
- Funcionar com conexão lenta ou offline (queue de sync).
- Feedback visual imediato (toast de confirmação).
