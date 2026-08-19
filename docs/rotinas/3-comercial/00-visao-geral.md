# Comercial: visão geral

> Módulo 3 de 4. O que acontece entre o cliente pedir e a muda sair do viveiro.
> Mapa dos quatro módulos em [`../00-mapa-de-rotinas.md`](../00-mapa-de-rotinas.md).

## O que este módulo é

Tudo aqui é **movimento**: acontece uma vez e vira histórico. O que é estável, cliente,
espécie, fornecedor: é Cadastros, e o Comercial só consome.

A negociação continua sendo por WhatsApp, conduzida por pessoa. O sistema não substitui a
conversa; ele registra o que ficou combinado e encadeia as etapas seguintes com notificação,
para que nada dependa de alguém lembrar de avisar.

## As três rotinas

| # | Rotina | Pergunta que responde | Documento |
|---|---|---|---|
| 1 | **Pedidos** | O que o cliente quer, tem, e por quanto? | [`pedidos.md`](pedidos.md) → [`pedidos/`](pedidos/) |
| 2 | **Cotação com fornecedor** | Quando falta muda nossa, quem tem e a que preço? | plano [`P11`](../../../plans/P11-fornecedores-cotacao.md) |
| 3 | **Entregas** | Quando cada carga vira viagem? | [`entregas.md`](entregas.md) |

O ciclo do pedido tem quatro etapas, cada uma com um dono:

```
cadastro (chefia)  →  verificação (gerência)  →  aprovação (chefia)  →  cargas e separação (gerência)
                                    │                                              │
                              falta muda                                    cada carga
                                    ↓                                              ↓
                            cotação (chefia)                                   entrega
```

**Entrega não é a 5ª etapa do pedido.** Uma carga é uma viagem, e viagem tem calendário
próprio: por isso entregas é rotina irmã, e não o último estado do pedido.

## Relação com os outros módulos

| Módulo | Relação |
|---|---|
| **1 · Cadastros** | cliente e espécie no pedido; fornecedor na cotação |
| **2 · Produção** | o estoque disponível é o que a verificação consulta |
| **4 · Financeiro** | a venda e a compra de fornecedor viram lançamento; o preço por canal volta de lá para a aprovação |

## Onde estão as telas

Área `/comercial`. As telas seguem nas URLs de origem (`/pedidos/*` e `/fornecedores/*`)
porque a rotina de pedidos aponta para elas e `notifications.link` guarda caminho já gravado
no banco. O agrupamento é de navegação, não de rota.
