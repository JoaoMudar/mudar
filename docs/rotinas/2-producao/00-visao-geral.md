# Rotina: Produção — visão geral

> Substitui e absorve a antiga `rotina-tarefas.md` (hoje [`99-tarefas-diarias-historico.md`](99-tarefas-diarias-historico.md)). Tarefa diária **não é uma rotina
> separada** — é como a produção é executada. Os documentos de engenharia já tratavam assim
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
| 2 | **Registro de atividade** | O que foi feito de fato, e quanto? | (a fazer) |
| 3 | **Acompanhamento de lotes** | Onde está cada lote e quando fica pronto? | (a fazer) |

O encadeamento é um ciclo simples:

```
agenda (planejado)  →  registro (realizado)  →  lote avança  →  estoque muda
        ↑                       │
        └───────────────────────┘
             replaneja a próxima semana com o que sobrou
```

**A agenda é a porta de entrada.** Sem ela, o registro de atividade é um formulário solto
que ninguém lembra de preencher. Com ela, o colaborador abre o app e já vê o que fazer —
registrar vira confirmar, não digitar.

## Telas por perfil

### Chefia
- **Visão de produção**: o que está sendo produzido, previsão de disponibilidade, gargalos
- **Decisão de produção**: quais espécies produzir em maior volume (com base em vendas e estoque)
- **Custo de mão de obra do período**: horas planejadas × realizadas, valor total

### Gerência
- **Agenda da semana**: preencher o que cada funcionário faz (subrotina 1)
- **Acompanhamento**: quem está atrasado, o que não foi feito
- **Acompanhamento de lotes**: semeado → germinando → repicado → pronto

### Colaborador
- **Minhas tarefas de hoje**: lista curta, vinda da agenda; marcar como feito
- **Registro de atividade**: espécie, recipiente, quantidade — pré-preenchido pela tarefa

## Relação com as outras rotinas

| Rotina | Relação |
|---|---|
| **Cadastros** | consome espécie, recipiente, funcionário e tipo de tarefa |
| **Estoque** | produção registrada é a entrada do saldo (estoque = produção − perdas − vendas) |
| **Perdas** | perda é registrada no mesmo gesto da atividade, quando ocorre |
| **Custeio (P1)** | horas da agenda × valor-hora médio = custo de mão de obra por espécie |
| **Pedidos** | separação de pedido também é tarefa e entra na agenda |
