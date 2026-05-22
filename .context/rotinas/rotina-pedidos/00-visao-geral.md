# Rotina de Pedidos — Visao Geral

## Contexto de Negocio

O Viveiro Mudar opera venda atacado via WhatsApp. O fluxo atual eh:
Cliente envia msg WhatsApp -> Gilberto (chefia) recebe -> Debora (gerencia) verifica disponibilidade -> Gilberto confirma venda -> Debora organiza separacao -> equipe separa -> Gilberto entrega.

Este sistema digitaliza esse fluxo em 4 etapas com notificacoes internas que conectam chefia e gerencia.

## Perfis e Dispositivos

| Perfil | Quem | Dispositivo | Prioridade UX |
|--------|------|-------------|---------------|
| Chefia | Gilberto | Computador (desktop) | Velocidade de cadastro, poucos cliques |
| Gerencia | Debora | Celular (campo) | Praticidade, botoes grandes, checklists |

## Dois Tipos de Item no Pedido

### Item Especifico
Cliente pede especie exata: "500 Ipe Amarelo em tubete"
-> Chefia cadastra com especie + recipiente + quantidade
-> Gerencia verifica se tem

### Item Generico
Cliente pede apenas quantidade com tamanho minimo: "500 mudas nativas em saco 17x22 ou maior"
-> Chefia cadastra SEM especie, apenas recipiente minimo + quantidade
-> Gerencia ESCOLHE quais especies irao compor o pedido (ela conhece o estoque)
-> Gerencia cria a distribuicao: 200 Ipe + 150 Araucaria + 150 Cedro Rosa = 500

Isso eh muito comum em vendas de compensacao ambiental e prefeitura, onde o cliente
quer "mudas nativas" sem se importar com a especie exata.

## Sistema de Cargas (multi-viagem)

Um pedido pode precisar de mais de uma viagem para ser entregue (ex: 5.000 mudas em sacos grandes).
O sistema usa o conceito de **Cargas**:

```
Pedido #47 (o que o cliente quer)
  └── Carga 1 (o que cabe na 1a viagem)
  |     └── Ipe Amarelo tubete: 300 de 500
  |     └── Araucaria saco 17x22: 200 de 200 (completo)
  └── Carga 2 (o resto)
        └── Ipe Amarelo tubete: 200 de 500 (restante)
```

- Pedidos simples: 1 carga criada automaticamente com todos os itens
- Pedidos grandes: gerencia divide em N cargas manualmente
- Cada carga tem seu proprio checklist de separacao
- Cada carga vira uma entrega independente na rotina de entregas
- A separacao trabalha com CARGAS, nao diretamente com o pedido

## Fluxo Completo do Pedido

```
[1. CADASTRO]          Chefia cadastra pedido (desktop, rapido)
      |                Itens especificos e/ou genericos
      |                Status: "cadastrado"
      v
  Notificacao -> Gerencia
      |
[2. VERIFICACAO]       Gerencia confere disponibilidade (mobile, checklist)
      |                Itens especificos: marca disponivel/indisponivel
      |                Itens genericos: ESCOLHE especies e distribui quantidades
      |                Status: "verificando_disponibilidade" -> "verificado"
      v
  Notificacao -> Chefia
      |
[3. ANALISE]           Chefia analisa checklist
      |                Se tudo OK -> Status: "aprovado"
      |                Se falta algo -> Status: "pendente_alteracao"
      |                   (chefia ajusta itens conforme acordo com cliente)
      |                   -> volta para verificacao OU aprova parcial
      v
  Notificacao -> Gerencia
      |
[4. SEPARACAO]         Gerencia organiza cargas e separa (mobile)
      |                Divide itens em cargas (se necessario)
      |                Separa carga por carga (checklist)
      |                Status: "separando" -> "pronto_envio"
      v
  (Futuro: Rotina de Entregas — trabalha com cargas)
```

## Statuses do Pedido

| Status | Significado | Quem atua |
|--------|-------------|-----------|
| `cadastrado` | Pedido recem-criado, aguardando verificacao | Chefia criou |
| `verificando_disponibilidade` | Gerencia esta conferindo | Gerencia |
| `verificado` | Checklist preenchido, aguardando analise da chefia | Gerencia finalizou |
| `pendente_alteracao` | Chefia viu que faltam itens, precisa ajustar | Chefia |
| `aprovado` | Venda confirmada, pronto para separacao | Chefia aprovou |
| `separando` | Gerencia esta separando fisicamente | Gerencia |
| `pronto_envio` | Tudo separado, aguardando entrega | Gerencia finalizou |
| `cancelado` | Pedido cancelado | Chefia |

## Arquivos de Implementacao (ordem de execucao)

1. `01-banco-de-dados.md` — Migracoes SQL (clientes, pedidos, itens, cargas, notificacoes)
2. `02-notificacoes.md` — Sistema de notificacoes in-app
3. `03-cadastro-pedido.md` — Tela de cadastro (chefia, desktop) — itens especificos e genericos
4. `04-verificacao-disponibilidade.md` — Checklist + atribuicao de especies (gerencia, mobile)
5. `05-analise-fechamento.md` — Analise e aprovacao (chefia, desktop)
6. `06-separacao-pedido.md` — Divisao em cargas + separacao com calendario (gerencia, mobile)

## Integracoes Futuras

- **Rotina de Entregas**: CARGAS com status `pronto_envio` alimentam a agenda de entregas (cada carga = 1 viagem)
- **WhatsApp (P4)**: notificacao automatica ao cliente sobre status do pedido
- **Precificacao (P3)**: calculo automatico de preco por canal de venda
- **Estoque (rotina-estoque)**: baixa automatica ao aprovar pedido + sugestao automatica de especies para itens genericos
