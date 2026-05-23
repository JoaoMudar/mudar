# Rotina: Pedidos

## Fluxo atual (analogico)
Cliente envia mensagem no WhatsApp -> Gilberto recebe -> passa para Debora verificar -> Gilberto confirma venda -> Debora organiza separacao -> equipe separa -> Gilberto entrega.

## Fluxo digital (implementacao)
Ver detalhes completos em `rotina-pedidos/00-visao-geral.md`

```
Cadastro (Chefia/Desktop) -> Notificacao -> Verificacao (Gerencia/Mobile)
    -> Notificacao -> Analise (Chefia/Desktop) -> Notificacao
    -> Organizacao de Cargas + Separacao (Gerencia/Mobile)
    -> Notificacao -> [Rotina Entregas por Carga]
```

## Conceitos Importantes

### Itens Genericos
Cliente pede "500 mudas nativas, minimo saco 10x18" sem especificar especie.
A gerencia escolhe quais especies vao no pedido durante a verificacao.
Muito comum em compensacao ambiental e prefeitura.

### Cargas (multi-viagem)
Pedido grande que nao cabe em 1 viagem eh dividido em cargas.
Cada carga = 1 viagem do caminhao/van. Separacao eh por carga.
Cada carga vira uma entrega independente na rotina de entregas.

## Planos de Implementacao

| # | Arquivo | Fase | Tarefas |
|---|---------|------|---------|
| 0 | `rotina-pedidos/00-visao-geral.md` | Visao geral, statuses, fluxo, conceitos | — |
| 1 | `rotina-pedidos/01-banco-de-dados.md` | Migracoes SQL (clientes, pedidos, itens, cargas, notificacoes) | 8 tarefas |
| 2 | `rotina-pedidos/02-notificacoes.md` | Sistema de notificacoes in-app | 5 tarefas |
| 3 | `rotina-pedidos/03-cadastro-pedido.md` | Cadastro de pedido (chefia, desktop) — especificos e genericos | 6 tarefas |
| 4 | `rotina-pedidos/04-verificacao-disponibilidade.md` | Checklist + atribuicao de especies (gerencia, mobile) | 6 tarefas |
| 5 | `rotina-pedidos/05-analise-fechamento.md` | Analise e aprovacao (chefia, desktop) | 5 tarefas |
| 6 | `rotina-pedidos/06-separacao-pedido.md` | Divisao em cargas + separacao com calendario (gerencia, mobile) | 7 tarefas |

**Total: 37 tarefas**

## Telas por perfil

### Chefia (Gilberto — Desktop)
- **Cadastro de pedido**: formulario rapido com autocomplete, itens especificos e genericos
- **Lista de pedidos**: tabela com filtros por status, cliente, periodo
- **Detalhes do pedido**: visualizacao completa com composicao de genericos e cargas
- **Analise pos-verificacao**: aprovar, aprovar parcial, solicitar alteracao
- **Edicao de pedido**: ajustar itens apos feedback da gerencia

### Gerencia (Debora — Mobile)
- **Notificacao de novo pedido**: sino com badge no header
- **Verificacao de disponibilidade**: checklist mobile com botoes grandes
- **Atribuicao de especies**: para itens genericos, escolher especie e quantidade
- **Organizacao de cargas**: decidir se cabe em 1 viagem ou dividir
- **Separacao por carga**: checklist de separacao com urgencia visual
- **Calendario de entregas**: visao mensal com dias de carregamento/entrega

## Dependencias com outras rotinas
- **Entregas**: CARGAS com status `pronto` alimentam agenda de entregas (cada carga = 1 viagem)
- **Estoque**: verificacao de disponibilidade sera automatizada quando estoque existir
- **Precificacao**: precos por canal podem ser exibidos nos itens (futuro)
