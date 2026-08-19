# Fase 4: Verificacao de Disponibilidade (Gerencia, Mobile)

## Objetivo
Quando um pedido eh cadastrado, a gerencia (Debora) recebe uma notificacao e abre o pedido
para conferir item por item se esta disponivel no viveiro. Ela percorre a area, olha as mudas,
e vai marcando o que tem e o que nao tem. No final, envia o resultado de volta para a chefia.

**Para itens genericos**, o fluxo eh diferente: em vez de verificar disponibilidade,
a gerencia ESCOLHE quais especies irao compor aquele item, distribuindo a quantidade
total entre as especies disponiveis. Isso deve ser extremamente pratico no celular.

## Pre-requisitos
- Pedido cadastrado com status `cadastrado` (Fase 3)
- Sistema de notificacoes funcional (Fase 2)
- Tabela `order_items` com campos `is_available`, `is_generic`, `parent_item_id` (Fase 1)
- Tabela `containers` com `volume_liters` para comparacao de tamanho minimo

## Tarefas

### T4.1: Server Actions de verificacao
- [x] Adicionar em `src/app/pedidos/actions.ts`:
- [x] `startVerification(orderId, userId)`: muda status para `verificando_disponibilidade` + historico
- [x] `toggleItemAvailability(itemId, isAvailable, notes?)`, atualiza `is_available` e `availability_notes` de um item especifico
- [x] `assignSpeciesToGenericItem(parentItemId, assignments)`, para itens genericos:
  - `assignments` eh array de `{ species_id, container_id, quantity }`
  - Valida que soma das quantidades == quantidade do item pai
  - Valida que container dos filhos tem volume >= volume do container minimo do pai
  - Remove filhos anteriores (se re-atribuindo)
  - Cria itens filhos com `parent_item_id`, `is_generic=false`, `is_available=true`
  - Marca o item pai como `is_available=true` (composicao definida)
- [x] `finishVerification(orderId, userId)`, muda status para `verificado` + historico + notifica chefia
  - Valida que TODOS os itens (especificos e genericos) foram verificados/atribuidos
  - A notificacao deve informar o resumo: "Pedido #47 verificado, 5 de 7 disponiveis, 2 genericos definidos"

### T4.2: Pagina de verificacao (mobile-first)
- [x] Criar `src/app/pedidos/[id]/verificar/page.tsx`
- [x] Proteger com `requireRole('admin', 'gerencia')`
- [x] Carregar pedido com itens via `getOrderById(id)`
- [x] Se status nao eh `cadastrado` nem `verificando_disponibilidade` nem `pendente_alteracao`, redirecionar
- [x] Carregar lista de especies ativas e recipientes para o seletor de genericos

### T4.3: Componente de checklist de verificacao (itens especificos)
- [x] Criar `src/app/pedidos/[id]/verificar/VerificationChecklist.tsx` (client component)
- [x] Layout mobile-first: cards empilhados, um por item
- [x] **Card de item ESPECIFICO:**
  ```
  +----------------------------------------+
  |  [FOTO]  Ipe Amarelo                   |
  |          Tubete — 500 un               |
  |                                        |
  |  [Campo: observacao]                   |
  |                                        |
  |  [ X Indisponivel ]  [ V Disponivel ]  |
  +----------------------------------------+
  ```
- [x] Foto da especie (se houver `photo_url`) como thumbnail pequena
- [x] Nome da especie em destaque (fonte grande)
- [x] Recipiente e quantidade abaixo
- [x] Dois botoes grandes lado a lado:
  - "Indisponivel" (vermelho): marca `is_available = false`
  - "Disponivel" (verde): marca `is_available = true`
- [x] Campo de observacao opcional (ex: "so tem 300 dessa", "pode substituir por Ipe Rosa")
- [x] Cada marcacao salva imediatamente no banco (sem botao de salvar geral)
- [x] Feedback visual: card muda de cor/borda apos marcar
  - Verde claro = disponivel
  - Vermelho claro = indisponivel
  - Cinza/branco = nao verificado
- [x] Ao iniciar, chamar `startVerification` automaticamente se status for `cadastrado`

### T4.4: Componente de atribuicao de especies (itens genericos)
- [x] Criar `src/app/pedidos/[id]/verificar/GenericItemAssigner.tsx` (client component)
- [x] **Card de item GENERICO** (visual diferente, destaque especial):
  ```
  +--------------------------------------------+
  |  [*]  GENERICO — Gerencia escolhe          |
  |       Min: Saco 10x18 — 1000 un           |
  |       Restante: 400 un                     |
  +--------------------------------------------+
  |                                            |
  |  Especies atribuidas:                      |
  |  +--------------------------------------+  |
  |  | Ipe Amarelo    Saco 10x18    300  [x]|  |
  |  | Araucaria      Saco 17x22    300  [x]|  |
  |  +--------------------------------------+  |
  |                                            |
  |  [+ Adicionar especie]                     |
  |                                            |
  |  [ V  COMPOSICAO DEFINIDA ]                |
  +--------------------------------------------+
  ```
- [x] Mostrar badge "GENERICO" em destaque
- [x] Mostrar recipiente minimo e quantidade total
- [x] Mostrar contador "Restante: X un" que diminui conforme atribui especies
- [x] Botao "+ Adicionar especie" abre seletor:
  - Lista de especies com busca (campo de texto no topo filtra por nome)
  - Ao selecionar especie, adiciona linha com: especie, dropdown recipiente (filtrado >= minimo), campo quantidade
  - Focar no campo de quantidade apos selecionar especie (fluxo rapido)
- [x] Cada especie atribuida pode ser removida (botao X)
- [x] Quantidade do campo eh livre, mas o total deve bater:
  - Se total atribuido < total do pai: exibe "Restante: X un" em laranja
  - Se total atribuido == total do pai: exibe "Completo!" em verde
  - Se total atribuido > total do pai: exibe "Excedeu X un" em vermelho (bloqueia)
- [x] Botao "Composicao Definida" aparece quando total atribuido == total do pai
  - Ao clicar: chama `assignSpeciesToGenericItem` e salva
  - Card fica verde

### T4.5: Barra de progresso e finalizacao
- [x] Barra de progresso no topo: "3 de 7 verificados"
  - Conta tanto especificos marcados quanto genericos com composicao definida
- [x] Separar visualmente: "Especificos: 3/5 | Genericos: 1/2"
- [x] Botao "Enviar para Chefia" aparece quando TODOS os itens estiverem resolvidos
- [x] Botao desabilitado/oculto se ainda falta marcar/atribuir algum
- [x] Ao clicar, chama `finishVerification` e redireciona para lista de pedidos
- [x] Toast: "Verificacao enviada para chefia"

### T4.6: Indicador na lista de pedidos para gerencia
- [x] Na pagina `/pedidos`, para usuarios com role `gerencia`:
- [x] Destacar pedidos com status `cadastrado` (tag "VERIFICAR")
- [x] Destacar pedidos com status `pendente_alteracao` (tag "RE-VERIFICAR")
- [x] Se pedido tem itens genericos, mostrar indicador adicional: "2 a definir"
- [x] Ordenar esses pedidos no topo da lista

## Design Mobile: Item Generico (fluxo de atribuicao)

```
+----------------------------------+
| < Voltar    Pedido #47           |
+----------------------------------+
| Verificados: 3 de 5             |
| Especificos: 2/3 | Genericos: 1/2|
+----------------------------------+
|                                  |
| +------------------------------+|  <- item especifico (normal)
| | [IMG] Ipe Amarelo        [V] ||
| |       Tubete — 500 un       ||
| | [Indisponivel] [Disponivel] ||
| +------------------------------+|
|                                  |
| +------------------------------+|  <- item GENERICO
| | [*] GENERICO                 ||
| |     Min: Saco 10x18         ||
| |     Total: 1000 un          ||
| |     Restante: 400 un        ||
| |                              ||
| |  Ipe Amarelo  10x18  300 [x]||
| |  Araucaria    17x22  300 [x]||
| |                              ||
| |  [+ Adicionar especie]      ||
| |                              ||
| +------------------------------+|
|                                  |
+----------------------------------+
|     [ Enviar para Chefia ]       |
+----------------------------------+
```

**Fluxo de adicionar especie no generico (mobile):**
```
+----------------------------------+
|  Selecionar Especie              |
+----------------------------------+
|  [_Buscar..._________________]   |
+----------------------------------+
|  > Ipe Amarelo                   |
|  > Ipe Rosa                      |
|  > Araucaria                     |
|  > Canafistula                   |
|  > Cedro Rosa                    |
|  > Jacaranda Mimoso              |
|  > Palmito Jussara               |
|  ...                             |
+----------------------------------+
```

Ao tocar numa especie:
```
+----------------------------------+
|  Araucaria                       |
+----------------------------------+
|  Recipiente: [Saco 17x22    v]  |  <- dropdown filtrado >= minimo
|  Quantidade: [____300____]       |
|                                  |
|  [Cancelar]  [Adicionar]         |
+----------------------------------+
```

## Notas Tecnicas
- Cada toggle de disponibilidade (especifico) salva imediatamente (chamada server action individual)
- A atribuicao de especies (generico) salva ao clicar "Composicao Definida" (uma chamada com todas as atribuicoes)
- Usar `useTransition` para nao bloquear a UI durante save
- Se a conexao cair, os botoes devem ficar desabilitados e mostrar toast offline
- Nao usar swipe gestures: botoes explicitos sao mais confiaveis com maos sujas
- Ordem dos itens: especificos primeiro, genericos depois (ou mesma ordem de cadastro)
- O seletor de especies para genericos deve filtrar recipientes com volume >= volume minimo
  - Ex: se minimo eh Saco 10x18 (X litros), mostra: Saco 10x18, 17x22, 20x26, 28x32, Balde
- Quando vem de `pendente_alteracao`, itens ja marcados manteem seu estado
  - Itens genericos ja atribuidos manteem seus filhos (editaveis se necessario)
  - Apenas itens novos ou alterados precisam ser re-verificados
- A lista de especies no seletor deve ser LONGA (~150 especies), busca por texto eh essencial
