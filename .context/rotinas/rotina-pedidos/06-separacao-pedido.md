# Fase 6: Separacao de Pedido com Cargas (Gerencia — Mobile)

## Objetivo
Apos aprovacao, a gerencia (Debora) organiza o pedido em cargas (viagens) e separa
fisicamente as mudas carga por carga. A lista de pedidos exibe um calendario visual
dos dias de entrega para a gerencia saber quando carregar.

Uma carga = uma viagem do caminhao/van. Pedidos que cabem em uma viagem tem 1 carga.
Pedidos grandes sao divididos pela gerencia em N cargas.

## Pre-requisitos
- Pedido com status `aprovado` (Fase 5 concluida)
- Todos os itens do pedido tem `is_available = true`
- Itens genericos tem filhos definidos (Fase 4)
- Tabelas `order_loads` e `order_load_items` criadas (Fase 1)
- Notificacao de aprovacao recebida pela gerencia (Fase 2)

## Tarefas

### T6.1 — Server Actions de cargas e separacao
- [ ] Adicionar em `src/app/pedidos/actions.ts`:
- [ ] `createDefaultLoad(orderId, userId)`:
  1. Criar 1 carga (load_number=1) com TODOS os itens do pedido (quantidade total)
  2. Para itens genericos: usar os itens filhos (nao o pai)
  3. Mudar status do pedido para `separando`
  4. Registrar historico
- [ ] `createMultipleLoads(orderId, userId, loadsData)`:
  - `loadsData` eh array de `{ items: [{ order_item_id, quantity }] }`
  - Cria N cargas com itens distribuidos
  - Valida que soma de quantidades por item across loads == quantidade original
  - Mudar status do pedido para `separando`
  - Registrar historico
- [ ] `toggleLoadItemSeparated(loadItemId, isSeparated)`:
  1. Atualizar `is_separated` do item da carga
  2. Sem mudanca de status da carga nem do pedido (parcial)
- [ ] `finishLoad(loadId, userId)`:
  1. Validar que TODOS os `order_load_items` da carga tem `is_separated = true`
  2. Mudar status da carga para `pronto`
  3. Verificar se TODAS as cargas do pedido estao `pronto`:
     - Se sim: mudar status do pedido para `pronto_envio` + notificar chefia
     - Se nao: nao muda status do pedido (ainda tem cargas pendentes)
- [ ] `getOrderLoads(orderId)` — retorna cargas com itens, status e progresso
- [ ] `getDeliveryCalendarData(startDate, endDate)` — retorna pedidos com delivery_date no periodo
  - Para cada pedido: order_number, customer name, delivery_date, status, qtd cargas, cargas prontas

### T6.2 — Tela de organizacao de cargas
- [ ] Criar `src/app/pedidos/[id]/separar/page.tsx`
- [ ] Proteger com `requireRole('admin', 'gerencia')`
- [ ] Carregar pedido com itens via `getOrderById(id)` e cargas via `getOrderLoads(orderId)`
- [ ] Se status eh `aprovado` (sem cargas ainda): mostrar tela de ORGANIZACAO
- [ ] Se status eh `separando` (cargas ja existem): mostrar tela de SEPARACAO

**Tela de organizacao (primeira vez):**
- [ ] Mostrar todos os itens do pedido (para genericos, mostrar os filhos)
- [ ] Dois botoes grandes:
  - "Cabe em 1 viagem" — chama `createDefaultLoad`, vai para separacao
  - "Dividir em cargas" — abre modo de divisao
- [ ] **Modo de divisao em cargas (mobile-friendly):**
  ```
  +------------------------------------------+
  | Dividir Pedido #47 em Cargas             |
  +------------------------------------------+
  |                                          |
  | Carga 1                                  |
  | +--------------------------------------+ |
  | | Ipe Amarelo  Tubete    [__300__]/500  | |
  | | Araucaria    17x22     [__200__]/200  | |
  | | Cedro Rosa   Tubete    [__400__]/400  | |
  | +--------------------------------------+ |
  |                                          |
  | Carga 2                                  |
  | +--------------------------------------+ |
  | | Ipe Amarelo  Tubete    [__200__]/500  | |
  | +--------------------------------------+ |
  |                                          |
  | [+ Adicionar Carga]                      |
  |                                          |
  | Validacao:                               |
  | V Ipe Amarelo: 300+200 = 500 OK          |
  | V Araucaria: 200 = 200 OK                |
  | V Cedro Rosa: 400 = 400 OK               |
  |                                          |
  | [Confirmar Divisao]                      |
  +------------------------------------------+
  ```
  - Comecar com 2 cargas
  - Cada carga mostra todos os itens com campo de quantidade editavel
  - Quantidade 0 = item nao vai nessa carga (ocultar ou cinza)
  - Validacao em tempo real: mostrar se a soma de cada item bate com o total
  - Botao "+ Adicionar Carga" para adicionar mais viagens
  - Botao "Confirmar Divisao" ativo quando todas as quantidades batem

### T6.3 — Componente de checklist de separacao por carga
- [ ] Criar `src/app/pedidos/[id]/separar/LoadSeparation.tsx` (client component)
- [ ] Exibir cargas como abas ou cards expansiveis:
  ```
  +------------------------------------------+
  | Pedido #47 — Joao da Silva               |
  | Entrega: 15/06/2026                      |
  | ! CARREGAR HOJE                          |
  +------------------------------------------+
  | [Carga 1 (3/5)]  [Carga 2 (0/2)]        |
  +------------------------------------------+
  |                                          |
  | +--------------------------------------+ |
  | | [IMG] Ipe Amarelo                    | |
  | |       Tubete — 300 un               | |
  | |     [  V  SEPARADO  ]               | |
  | +--------------------------------------+ |
  |                                          |
  | +--------------------------------------+ |
  | | [IMG] Araucaria                      | |
  | |       Saco 17x22 — 200 un           | |
  | |     [     SEPARAR    ]               | |
  | +--------------------------------------+ |
  |                                          |
  | Separados: 3 de 5         [========   ] |
  | [ Carga 1 Pronta ]                      |
  +------------------------------------------+
  ```
- [ ] Abas/tabs para alternar entre cargas (se houver mais de 1)
- [ ] Badge em cada aba: progresso (ex: "3/5")
- [ ] Aba com cor: verde se carga pronta, normal se em andamento
- [ ] Cada item: botao toggle grande "Separado" / "Separar"
  - Nao separado: botao cinza com outline
  - Separado: botao verde preenchido com check
- [ ] Cada toggle salva imediatamente (`toggleLoadItemSeparated`)
- [ ] Botao "Carga X Pronta" ao final de cada carga (quando todos separados)
  - Chama `finishLoad`
  - Se era a ultima carga: toast "Pedido #47 pronto para envio!"
  - Se ainda tem cargas: toast "Carga 1 pronta! Falta(m) carga(s) 2"

### T6.4 — Calendario de entregas na lista de pedidos
- [ ] Criar `src/app/pedidos/DeliveryCalendar.tsx` (client component)
- [ ] Exibir na pagina `/pedidos` para gerencia (acima da lista)
- [ ] Visualizacao de calendario mensal simples (grade de dias)
- [ ] Cada dia que tem entrega: marcador com quantidade de pedidos
- [ ] Codigo de cores nos dias:
  - **Verde** (dia util antes da entrega): dia de CARREGAMENTO — precisa separar/carregar
  - **Amarelo** (dia da entrega): SAIDA do caminhao
  - **Vermelho**: entregas atrasadas (delivery_date < hoje e status != pronto_envio)
- [ ] Clicar em um dia mostra os pedidos daquele dia (lista abaixo do calendario)
- [ ] Dia atual destacado com borda
- [ ] Navegacao entre meses (< Junho 2026 >)

### T6.5 — Logica de dia util anterior
- [ ] Criar funcao `getPreviousBusinessDay(date)` em `src/lib/date-utils.ts`
- [ ] Considerar dias uteis = segunda a sexta
- [ ] Se entrega eh segunda -> carregamento eh sexta anterior
- [ ] Se entrega eh terca a sabado -> carregamento eh dia anterior
- [ ] Nao considerar feriados por enquanto (simplicidade)

### T6.6 — Barra de progresso geral e urgencia
- [ ] Se pedido tem 1 carga: progresso = "4 de 7 separados"
- [ ] Se pedido tem N cargas: progresso = "Carga 1: 5/5 V | Carga 2: 2/3"
- [ ] Informacoes do pedido no cabecalho: cliente, data de entrega, order_number
- [ ] Destaque se a entrega eh urgente (amanha ou hoje): banner vermelho "ENTREGA AMANHA"
- [ ] Banner de carregamento: "CARREGAR HOJE" se hoje == dia util antes da delivery_date

### T6.7 — Indicadores na lista de pedidos para gerencia
- [ ] Pedidos aprovados (sem cargas): tag "ORGANIZAR" — precisa dividir em cargas
- [ ] Pedidos separando: tag "SEPARANDO" com progresso de cargas (ex: "Carga 1/2")
- [ ] Urgencia visual baseada na data de entrega:
  - Entrega em >3 dias: cor azul
  - Entrega em 2-3 dias: cor laranja "EM BREVE"
  - Entrega amanha: cor vermelho "SEPARAR HOJE"
  - Entrega hoje: cor vermelho "URGENTE"
- [ ] Ordenar por urgencia (data de entrega mais proxima primeiro)

## Design Mobile — Fluxo Completo

**1. Pedido aprovado → decisao de cargas:**
```
+----------------------------------+
| < Voltar     Pedido #47          |
+----------------------------------+
| Cliente: Joao da Silva           |
| Entrega: 15/06/2026             |
+----------------------------------+
| 7 itens para separar             |
|                                  |
| Ipe Amarelo      Tubete    500   |
| Araucaria        17x22    200   |
| Cedro Rosa       Tubete    400   |
| Palmito Jussara  10x18    300   |
| ...                              |
+----------------------------------+
|                                  |
| [ Cabe em 1 viagem ]            |
|                                  |
| [ Dividir em cargas ]            |
+----------------------------------+
```

**2. Separacao (1 carga ou aba de carga):**
```
+----------------------------------+
| < Voltar     Pedido #47          |
+----------------------------------+
| Carga 1 de 2                    |
| ! CARREGAR HOJE                  |
+----------------------------------+
| Separados: 2 de 4     [====   ] |
+----------------------------------+
|                                  |
| +------------------------------+|
| | [IMG] Ipe Amarelo        [V] ||
| |       Tubete — 300 un       ||
| |     [  V  SEPARADO  ]       ||
| +------------------------------+|
|                                  |
| +------------------------------+|
| | [IMG] Araucaria          [ ] ||
| |       Saco 17x22 — 200 un  ||
| |     [     SEPARAR    ]       ||
| +------------------------------+|
|                                  |
+----------------------------------+
| [ Carga 1 Pronta ]              |
+----------------------------------+
| [Carga 1 (2/4)] [Carga 2 (0/3)] |
+----------------------------------+
```

## Design Calendario

```
+------------------------------------------+
|  <  Junho 2026  >                        |
+------------------------------------------+
|  Seg  Ter  Qua  Qui  Sex  Sab  Dom      |
+------+-----+-----+-----+-----+----+-----+
|  1   |  2  |  3  |  4  |  5  |  6 |  7  |
+------+-----+-----+-----+-----+----+-----+
|  8   |  9  | 10  | 11  | 12  | 13 | 14  |
|      |     |     |     |[VER]|[AM]|     |
+------+-----+-----+-----+-----+----+-----+
| 15   | 16  | 17  | 18  | 19  | 20 | 21  |
|      |     |     |     |[VER]|[AM]|     |
+------+-----+-----+-----+-----+----+-----+

[VER] = dia de carregamento (verde)
[AM]  = dia de entrega (amarelo)
Numeros dentro = qtd de pedidos
```

## Notas Tecnicas
- O calendario deve ser leve — construir com CSS grid ou flexbox, sem bibliotecas
- A decisao "1 viagem ou dividir" eh o primeiro passo apos aprovacao — nao pular
- Se gerencia clica "Cabe em 1 viagem", cria 1 carga automatica e ja entra na separacao
- A divisao em cargas exige que TODAS as quantidades batam antes de confirmar
- Cargas prontas nao podem ser revertidas (se precisar, cancelar e refazer — caso raro)
- O calendario mostra apenas pedidos com status `aprovado`, `separando` ou `pronto_envio`
- Cada carga pronta alimenta independentemente a rotina de entregas futura
- Pedido so muda para `pronto_envio` quando a ultima carga ficar pronta

## Integracao com Rotina de Entregas (Futuro)
- Cada CARGA (nao pedido) vira uma entrega na rotina de entregas
- Uma carga pronta = uma viagem disponivel para agendar
- A rotina de entregas tera: montar carga no veiculo, confirmar saida, confirmar entrega
- `delivery_date` do pedido eh a referencia, mas cada carga pode sair em dias diferentes
- Ex: Pedido com 3 cargas, delivery_date 20/06:
  - Carga 1 sai dia 18/06 (pronta primeiro)
  - Carga 2 sai dia 19/06
  - Carga 3 sai dia 20/06
