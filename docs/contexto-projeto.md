# Contexto do Projeto — Viveiro Mudar

> Conteúdo de referência movido do `CLAUDE.md` para não pesar no contexto de toda sessão.
> Consultar quando precisar de visão geral de arquitetura, histórico ou princípios de UX de campo.

## Histórico / contexto crítico
- A empresa opera há anos **sem dados estruturados** — tudo feito de cabeça.
- O sistema de NF atual é do Sebrae — dados de notas em Excel com campos genéricos.
- Não existe controle de lotes, perdas, margem por espécie nem estoque estruturado.

## Arquitetura dos Projetos

Os projetos são interdependentes. A ordem de implementação importa.

**Estado real (10/08/2026):**

```
✅ P11 Fornecedores/Cotação      concluído
🟡 P1  Custeio                   parcial — cadastros ok, falta o motor de cálculo
🟡 P12 Financeiro (extratos)     Fase 0 fechada
📐 P13 Cadastro único + Agenda   desenhado, não implementado
⬜ P2 P3 P4 P5 P6 P7 P8 P9 P10   não iniciados
```

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

## Formulários de campo (princípios de UX)
- Máximo 5 campos por tela.
- Dropdowns com opções pré-definidas (nunca campo aberto para categorias).
- Botões grandes para dedos sujos de terra.
- Funcionar com conexão lenta ou offline (queue de sync).
- Feedback visual imediato (toast de confirmação).
