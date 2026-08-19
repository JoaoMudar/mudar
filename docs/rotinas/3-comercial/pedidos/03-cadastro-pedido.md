# Fase 3: Cadastro de Pedido (Chefia — Desktop)

## Objetivo
Tela onde Gilberto (chefia) cadastra rapidamente um pedido recebido via WhatsApp.
Otimizada para desktop. Prioridade: velocidade e poucos cliques.
Suporta dois tipos de item: especifico (especie definida) e generico (gerencia escolhe).

## Pre-requisitos
- Tabelas `customers`, `orders`, `order_items` criadas (Fase 1)
- Sistema de notificacoes funcional (Fase 2)
- Tabelas `species` e `containers` populadas
- Auth com `requireRole('admin', 'chefia')`

## Tarefas

### T3.1 — Server Actions de clientes
- [x] Criar `src/app/pedidos/actions.ts` com `'use server'`
- [x] `getCustomers()` — retorna todos os clientes ativos, ordenados por nome
- [x] `createCustomer(data)` — cria cliente rapido (nome obrigatorio, resto opcional)
- [x] `searchCustomers(query)` — busca por nome (ILIKE '%query%'), limite 10

### T3.2 — Server Actions de pedidos
- [x] No mesmo arquivo `src/app/pedidos/actions.ts`:
- [x] `createOrder(data)` — cria pedido + itens em transacao:
  1. INSERT em `orders` (customer_id, sale_channel, delivery_date, notes, created_by)
  2. INSERT em `order_items` para cada item:
     - Especifico: species_id, container_id, quantity, is_generic=false
     - Generico: species_id=NULL, container_id (minimo), quantity, is_generic=true
  3. INSERT em `order_status_history` (to_status='cadastrado', changed_by)
  4. Chamar `notifyRole('gerencia', 'novo_pedido', ...)` para avisar gerencia
  5. Retornar o pedido criado com order_number
- [x] `getOrders(filters?)` — lista pedidos com joins (customer name, item count, status)
  - Filtros opcionais: status, customer_id, periodo
  - Ordenar por created_at DESC
- [x] `getOrderById(id)` — pedido completo com itens (species name, container name), cliente e historico
  - Incluir itens filhos de genericos (via parent_item_id)
- [x] `updateOrderItems(orderId, items)` — atualizar itens do pedido (para edicao)
- [x] `cancelOrder(orderId, userId)` — muda status para cancelado + historico
- [x] `getSpeciesForSelect()` — retorna especies ativas (id, common_name) ordenadas por nome
- [x] `getContainersForSelect()` — retorna recipientes ativos (id, name, volume_liters) ordenados por volume

### T3.3 — Pagina de listagem de pedidos
- [x] Criar `src/app/pedidos/page.tsx` (server component, protegida por auth)
- [x] Acessivel para roles: admin, chefia, gerencia
- [x] Exibir tabela/lista com colunas:
  - # (order_number)
  - Cliente
  - Qtd itens (total, indicando se ha genericos: "5 itens (2 a definir)")
  - Canal de venda
  - Data entrega
  - Status (com badge colorido)
  - Data criacao
- [x] Badges de status com cores:
  - cadastrado: azul
  - verificando_disponibilidade: laranja
  - verificado: amarelo
  - pendente_alteracao: vermelho
  - aprovado: verde
  - separando: roxo
  - pronto_envio: verde escuro
  - cancelado: cinza
- [x] Botao "Novo Pedido" (visivel apenas para chefia/admin)
- [x] Clicar em um pedido abre a pagina de detalhes

### T3.4 — Formulario de cadastro de pedido (componente principal)
- [x] Criar `src/app/pedidos/novo/page.tsx` — pagina de novo pedido
- [x] Criar `src/app/pedidos/novo/OrderForm.tsx` (client component)
- [x] Proteger com `requireRole('admin', 'chefia')`
- [x] Layout desktop-first com secoes claras:

**Secao 1: Cliente**
- [x] Campo de busca com autocomplete (digita nome, sugere clientes existentes)
- [x] Se cliente nao existe: botao "Novo cliente" abre mini-formulario inline (apenas nome + telefone)
- [x] Cliente selecionado exibe nome + telefone ao lado

**Secao 2: Canal de Venda**
- [x] Radio buttons ou segmented control: Atacado | Compensacao Ambiental | Paisagismo | Prefeitura | Varejo
- [x] Default: Atacado (pre-selecionado)

**Secao 3: Data de Entrega**
- [x] Date picker nativo
- [x] Opcional (pode cadastrar sem data e definir depois)

**Secao 4: Itens do Pedido (tabela dinamica com 2 modos)**
- [x] Toggle no topo de cada linha: [Especie especifica] | [Generico - gerencia escolhe]
- [x] **Modo Especifico** (padrao):
  - Especie: dropdown com busca (autocomplete), mostra nome popular
  - Recipiente: dropdown simples (tubete, saco 10x18, etc)
  - Quantidade: input numerico
- [x] **Modo Generico**:
  - Especie: campo desabilitado, mostra "Gerencia escolhe"
  - Recipiente: dropdown com label "Recipiente minimo" (a partir de qual tamanho)
  - Quantidade: input numerico
- [x] Botao "-" para remover linha
- [x] Botao "+ Adicionar item" no final da tabela (adiciona nova linha vazia)
- [x] Ao selecionar especie, focar automaticamente no recipiente, depois quantidade (tab flow)
- [x] Atalho: Enter na quantidade adiciona nova linha automaticamente

**Secao 5: Observacoes**
- [x] Textarea livre (opcional)

**Acoes:**
- [x] Botao "Cadastrar Pedido" — salva e redireciona para lista com toast de sucesso
- [x] Botao "Cancelar" — volta para lista

### T3.5 — Componente de autocomplete reutilizavel
- [x] Criar `src/components/Autocomplete.tsx` (client component)
- [x] Props: items, onSelect, placeholder, allowCreate, onCreateNew
- [x] Input com debounce (300ms)
- [x] Dropdown com resultados filtrados
- [x] Keyboard navigation (seta cima/baixo + enter)
- [x] Fechar ao clicar fora
- [x] Usado para: busca de cliente e busca de especie

### T3.6 — Navegacao e rotas
- [x] Adicionar link "Pedidos" no menu de navegacao (AdminNav ou nav principal)
- [x] Rota `/pedidos` — lista de pedidos
- [x] Rota `/pedidos/novo` — formulario de novo pedido
- [x] Rota `/pedidos/[id]` — detalhes do pedido (usado nas fases seguintes)

## Wireframe do Formulario (Desktop)

```
+======================================================================+
|                           Novo Pedido                                 |
+======================================================================+
|                                                                        |
| Cliente:  [_Buscar cliente..._________] [+ Novo]                      |
|           > Joao da Silva — 47 99999-0000                             |
|                                                                        |
| Canal:    (x) Atacado  ( ) Comp. Ambiental  ( ) Paisagismo            |
|           ( ) Prefeitura  ( ) Varejo                                  |
|                                                                        |
| Entrega:  [__15/06/2026__]                                            |
|                                                                        |
+------------------------------------------------------------------------+
| Itens do Pedido                                                        |
+------+---------------------+----------------+----------+--------+      |
| Tipo | Especie             | Recipiente     | Qtd      |        |      |
+------+---------------------+----------------+----------+--------+      |
| [E]  | Ipe Amarelo         | Tubete         | 500      |  [x]   |      |
| [E]  | Araucaria           | Saco 17x22     | 200      |  [x]   |      |
| [G]  | Gerencia escolhe    | Min: Saco 10x18| 1000     |  [x]   |      |
| [E]  | [+ Buscar...]       | [Selecione]    | [___]    |        |      |
+------+---------------------+----------------+----------+--------+      |
|                                        [+ Adicionar item]              |
+------------------------------------------------------------------------+
|                                                                        |
| [E] = Especie especifica    [G] = Generico (gerencia escolhe)         |
|                                                                        |
| Observacoes: [_____________________________________]                   |
|              [_____________________________________]                   |
|                                                                        |
|                            [Cancelar]  [Cadastrar Pedido]              |
+========================================================================+
```

**Toggle E/G**: um botao pequeno no inicio de cada linha. Ao clicar, alterna entre
modo especifico (com campo de especie) e generico (campo de especie desabilitado).
Pode ser um icone ou as letras E/G com tooltip.

## Notas Tecnicas
- O formulario deve ser SPA-like (nao recarregar pagina ao adicionar itens)
- Usar `useTransition` para feedback durante o submit
- Validacao client-side: pelo menos 1 item, cliente obrigatorio, quantidades > 0
- Para itens especificos: especie obrigatoria. Para genericos: especie deve ser NULL
- A busca de especies deve ser rapida — carregar todas as ativas no mount (sao ~150) e filtrar no client
- Recipientes sao poucos (~6), carregar todos uma vez — incluir volume_liters para ordenar por tamanho
- O formulario deve ser resetavel apos sucesso (caso queira cadastrar outro pedido)
- O toggle E/G deve ser simples e intuitivo — Gilberto nao pode perder tempo pensando nele
