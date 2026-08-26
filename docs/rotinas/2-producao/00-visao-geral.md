# Rotina: Produção, visão geral

> Substitui e absorve a antiga `rotina-tarefas.md` (hoje [`99-tarefas-diarias-historico.md`](99-tarefas-diarias-historico.md)). Tarefa diária **não é uma rotina
> separada**: é como a produção é executada. Os documentos de engenharia já tratavam assim
> (UC-40 "Consultar tarefas do dia" aponta para RF-20, de atribuição de atividade de
> produção); esta reorganização alinha o domínio ao que a engenharia já dizia.

## Situação atual

Débora distribui tarefas verbalmente de manhã. Produção é decidida conforme demanda. Não há
registro de quem fez o quê, de quando cada lote foi semeado nem de quanto tempo leva para
ficar pronto.

## As três subrotinas

| # | Subrotina | Pergunta que responde | Documento |
|---|---|---|---|
| 1 | **Agenda de pessoal** | O que cada um vai fazer nesta semana? | [`01-agenda-de-pessoal.md`](01-agenda-de-pessoal.md) |
| 2 | **Apontamento de tarefas** | O que foi feito de fato, quanto e em quanto tempo? | [`05-apontamento-de-tarefas.md`](05-apontamento-de-tarefas.md) |
| 3 | **Lotes e canteiros** | Onde está cada lote, de onde veio e quando fica pronto? | [`04-lotes-e-canteiros.md`](04-lotes-e-canteiros.md) |

> **A numeração dos arquivos não acompanha a das subrotinas**, e é deliberado: `02-estoque.md` e
> `03-perdas.md` já ocupavam os números quando estas foram escritas, e renumerá-los quebraria
> ligações em `B3`, `C6`, `C8`, no mapa de rotinas e no `P13`.

O encadeamento é um ciclo simples:

```
agenda (planejado)  →  apontamento (realizado)  →  lote avança  →  estoque muda
        ↑                          │
        └──────────────────────────┘
             replaneja a próxima semana com o que sobrou
```

**A agenda é a porta de entrada.** Sem ela, o registro de atividade é um formulário solto
que ninguém lembra de preencher. Com ela, o colaborador abre o app e já vê o que fazer.
registrar vira confirmar, não digitar.

**O lote é o que amarra as três.** A tarefa de campo pede um canteiro para ser executada, a perda
precisa de um lugar para virar mortalidade por leva, e o estoque da espécie é a soma dos lotes
abertos dela. Sem lote, as três subrotinas funcionam por espécie agregada, e nenhuma responde
*onde*. Ele entrou no escopo em 24/08/2026, com a justificativa registrada no
[`A1` §7](../../engenharia/A-fundacao/A1-documento-de-visao.md).

## Telas por perfil

### Chefia
- **Visão de produção**: o que está sendo produzido, previsão de disponibilidade, gargalos
- **Decisão de produção**: quais espécies produzir em maior volume (com base em vendas e estoque)
- **Custo de mão de obra do período**: horas planejadas × realizadas, valor total

### Gerência
- **Agenda da semana**: preencher o que cada funcionário faz (subrotina 1)
- **Agenda do dia**: linha do tempo com uma faixa por funcionário, para apontar quem trocou de serviço (subrotina 2)
- **Ocupação do viveiro**: o que há em cada canteiro, e quais estão livres (subrotina 3)
- **Ficha do lote**: semeado → germinando → repicado → pronto, com o histórico que explica o saldo

### Colaborador
- **Minhas tarefas de hoje**: lista curta, vinda da agenda; marcar como feito
- **Registro de atividade**: lote e quantidade, pré-preenchidos pela tarefa

## Relação com as outras rotinas

| Rotina | Relação |
|---|---|
| **Cadastros** | consome espécie, recipiente, funcionário, tipo de tarefa, área, canteiro e período de trabalho |
| **Estoque** | produção registrada é a entrada do saldo (estoque = produção − perdas − vendas) |
| **Perdas** | perda é registrada no mesmo gesto da atividade, quando ocorre |
| **Custeio (P1)** | horas da agenda × valor-hora médio = custo de mão de obra por espécie |
| **Pedidos** | separação de pedido também é tarefa e entra na agenda |
