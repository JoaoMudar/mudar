# Contexto do Projeto — Viveiro Mudar

> Conteúdo de referência movido do `CLAUDE.md` para não pesar no contexto de toda sessão.
> Consultar quando precisar de visão geral de arquitetura, histórico ou princípios de UX de campo.

## Histórico / contexto crítico
- A empresa opera há anos **sem dados estruturados** — tudo feito de cabeça.
- O sistema de NF atual é do Sebrae — dados de notas em Excel com campos genéricos.
- Não existe controle de lotes, perdas, margem por espécie nem estoque estruturado.

## Arquitetura dos Projetos
Os projetos são interdependentes. A ordem de implementação importa:

```
P1 (Custeio) ──┐
P2 (Perdas)  ──┤──→ P6 (Dashboard) ──→ P7 (Catálogo)
P3 (Preço)   ──┘                         ↓
                                     P9 (Site) → P10 (E-commerce)
P4 (WhatsApp) ← depende de P1+P3
P5 (Automação n8n) ← depende de P4
P8 (Instagram) ← independente (campo)
```

## Formulários de campo (princípios de UX)
- Máximo 5 campos por tela.
- Dropdowns com opções pré-definidas (nunca campo aberto para categorias).
- Botões grandes para dedos sujos de terra.
- Funcionar com conexão lenta ou offline (queue de sync).
- Feedback visual imediato (toast de confirmação).
