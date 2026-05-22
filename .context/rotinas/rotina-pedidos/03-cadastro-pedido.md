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
- [ ] Criar `src/app/pedidos/actions.ts` com `'use server'`
- [ ] `getCustomers()` — retorna todos os clientes ativos, ordenados por nome
- [ ] `createCustomer(data)` — cria cliente rapido (nome obrigatorio, resto opcional)
- [ ] `searchCustomers(query)` — busca por nome (ILIKE '%query%'), limite 10

### T3.2 — Server Actions de pedidos
- [ ] No mesmo arquivo `src/app/pedidos/actions.ts`:
- [ ] `createOrder(data)` — cria pedido + itens em transacao:
  1. INSERT em `orders` (customer_id, sale_channel, delivery_date, notes, created_by)
  2. INSERT em `order_items` para cada item:
     - Especifico: species_id, container_id, quantity, is_generic=false
     - Generico: species_id=NULL, container_id (minimo), quantity, is_generic=true
  3. INSERT em `order_status_history` (to_status='cadastrado', changed_by)
  4. Chamar `notifyRole('gerencia', 'novo_pedido', ...)` para avisar gerencia
  5. Retornar o pedido criado com order_number
- [ ] `getOrders(filters?)` — lista pedidos com joins (customer name, item count, status)
  - Filtros opcionais: status, customer_id, periodo
  - Ordenar por created_at DESC
- [ ] `getOrderById(id)` — pedido completo com itens (species name, container name), cliente e historico
  - Incluir itens filhos de genericos (via parent_item_id)
- [ ] `updateOrderItems(orderId, items)` — atualizar itens do pedido (para edicao)
- [ ] `cancelOrder(orderId, userId)` — muda status para cancelado + historico
- [ ] `getSpeciesForSelect()` — retorna especies ativas (id, common_name) ordenadas por nome
- [ ] `getContainersForSelect()` — retorna recipientes ativos (id, name, volume_liters) ordenados por volume

### T3.3 — Pagina de listagem de pedidos
- [ ] Criar `src/app/pedidos/page.tsx` (server component, protegida por auth)
- [ ] Acessivel para roles: admin, chefia, gerencia
- [ ] Exibir tabela/lista com colunas:
  - # (order_number)
  - Cliente
  - Qtd itens (total, indicando se ha genericos: "5 itens (2 a definir)")
  - Canal de venda
  - Data entrega
  - Status (com badge colorido)
  - Data criacao
- [ ] Badges de status com cores:
  - cadastrado: azul
  - verificando_disponibilidade: laranja
  - verificado: amarelo
  - pendente_alteracao: vermelho
  - aprovado: verde
  - separando: roxo
  - pronto_envio: verde escuro
  - cancelado: cinza
- [ ] Botao "Novo Pedido" (visivel apenas para chefia/admin)
- [ ] Clicar em um pedido abre a pagina de detalhes

### T3.4 — Formulario de cadastro de pedido (componente principal)
- [ ] Criar `src/app/pedidos/novo/page.tsx` — pagina de novo pedido
- [ ] Criar `src/app/pedidos/novo/OrderForm.tsx` (client component)
- [ ] Proteger com `requireRole('admin', 'chefia')`
- [ ] Layout desktop-first com secoes claras:

**Secao 1: Cliente**
- [ ] Campo de busca com autocomplete (digita nome, sugere clientes existentes)
- [ ] Se cliente nao existe: botao "Novo cliente" abre mini-formulario inline (apenas nome + telefone)
- [ ] Cliente selecionado exibe nome + telefone ao lado

**Secao 2: Canal de Venda**
- [ ] Radio buttons ou segmented control: Atacado | Compensacao Ambiental | Paisagismo | Prefeitura | Varejo
- [ ] Default: Atacado (pre-selecionado)

**Secao 3: Data de Entrega**
- [ ] Date picker nativo
- [ ] Opcional (pode cadastrar sem data e definir depois)

**Secao 4: Itens do Pedido (tabela dinamica com 2 modos)**
- [ ] Toggle no topo de cada linha: [Especie especifica] | [Generico - gerencia escolhe]
- [ ] **Modo Especifico** (padrao):
  - Especie: dropdown com busca (autocomplete), mostra nome popular
  - Recipiente: dropdown simples (tubete, saco 10x18, etc)
  - Quantidade: input numerico
- [ ] **Modo Generico**:
  - Especie: campo desabilitado, mostra "Gerencia escolhe"
  - Recipiente: dropdown com label "Recipiente minimo" (a partir de qual tamanho)
  - Quantidade: input numerico
- [ ] Botao "-" para remover linha
- [ ] Botao "+ Adicionar item" no final da tabela (adiciona nova linha vazia)
- [ ] Ao selecionar especie, focar automaticamente no recipiente, depois quantidade (tab flow)
- [ ] Atalho: Enter na quantidade adiciona nova linha automaticamente

**Secao 5: Observacoes**
- [ ] Textarea livre (opcional)

**Acoes:**
- [ ] Botao "Cadastrar Pedido" — salva e redireciona para lista com toast de sucesso
- [ ] Botao "Cancelar" — volta para lista

### T3.5 — Componente de autocomplete reutilizavel
- [ ] Criar `src/components/Autocomplete.tsx` (client component)
- [ ] Props: items, onSelect, placeholder, allowCreate, onCreateNew
- [ ] Input com debounce (300ms)
- [ ] Dropdown com resultados filtrados
- [ ] Keyboard navigation (seta cima/baixo + enter)
- [ ] Fechar ao clicar fora
- [ ] Usado para: busca de cliente e busca de especie

### T3.6 — Navegacao e rotas
- [ ] Adicionar link "Pedidos" no menu de navegacao (AdminNav ou nav principal)
- [ ] Rota `/pedidos` — lista de pedidos
- [ ] Rota `/pedidos/novo` — formulario de novo pedido
- [ ] Rota `/pedidos/[id]` — detalhes do pedido (usado nas fases seguintes)

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
