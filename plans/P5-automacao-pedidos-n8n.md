# P5: Automação de Pedidos (n8n)

> 🗂️ **Módulo 3 · Comercial** (reorganização de 19/08/2026). As telas de pedido já existem em
> `/pedidos/*` (cadastro, verificação, aprovação e separação) construídas pela
> [rotina de pedidos](../docs/rotinas/3-comercial/pedidos.md), não por este plano. O que o P5
> acrescenta é a automação em volta delas. **Entrega não é o 5º estado do pedido:** cada carga
> vira uma viagem, com calendário próprio ([`3-comercial/entregas.md`](../docs/rotinas/3-comercial/entregas.md)).

## Status: NÃO INICIADO
## Prioridade: ALTA
## Dependências: P3 (orçamentos/quotes), P4 (WhatsApp, canal de entrada)
## Bloqueia: Nenhum diretamente (melhoria operacional)

---

## Objetivo
Automatizar o fluxo do pedido (do orçamento aprovado até a entrega) eliminando retrabalho manual, esquecimentos e comunicação verbal entre setores.

## Contexto
Hoje o fluxo é 100% verbal: Gilberto fecha a venda pelo WhatsApp, avisa a Débora de boca, Débora organiza a separação sem documento, João carrega e entrega. Não há rastreio de status. Pedidos se perdem, prazos furam, e ninguém sabe quantos pedidos estão em cada etapa.

## Resultado Esperado
- Fluxo automatizado: orçamento aprovado → ordem de separação → notificação da equipe → expedição → entrega → cobrança
- Status do pedido rastreável em tempo real
- Notificações automáticas para cada etapa (WhatsApp para equipe e cliente)
- Redução de pedidos esquecidos ou atrasados

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **Mapa do fluxo atual**: João documentar cada etapa do pedido, quem faz o quê, quanto tempo leva
- [ ] **Status do pedido**: João + Gilberto validarem a lista, orçamento → aprovado → separando → carregado → em_trânsito → entregue → pago
- [ ] **Dados obrigatórios do pedido**: Gilberto definir checklist, cliente, endereço completo, espécies/qtd, prazo, forma de pagamento
- [ ] **SLA por etapa**: definir tempo máximo aceitável entre etapas (ex: aprovado → separação em 24h)

---

## Tarefas de Desenvolvimento

### Fase 1: Schema de Pedidos

- [ ] **T5.1** Criar tabela `orders`
  ```
  id, quote_id (FK, nullable — pode criar pedido direto), customer_name, customer_phone,
  customer_address, delivery_distance_km, channel_id (FK),
  status (enum: aprovado, separando, carregado, em_transito, entregue, pago, cancelado),
  subtotal, freight_cost, total, payment_method (enum: pix, boleto, dinheiro, cheque, cartão),
  payment_status (enum: pendente, parcial, pago),
  estimated_delivery_date, actual_delivery_date,
  notes, created_by (user_id), created_at, updated_at
  ```
- [ ] **T5.2** Criar tabela `order_items`
  ```
  id, order_id (FK), species_id (FK), container_id (FK), batch_id (FK, nullable),
  quantity, unit_price, line_total, created_at
  ```
- [ ] **T5.3** Criar tabela `order_status_history`
  ```
  id, order_id (FK), old_status, new_status, changed_by (user_id),
  notes, changed_at
  ```
- [ ] **T5.4** Criar trigger: quando `orders.status` muda, inserir em `order_status_history`
- [ ] **T5.5** Criar trigger: quando status = 'entregue', baixar `batches.current_quantity` dos itens

### Fase 2: Interface de Pedidos

- [ ] **T5.6** Criar página `/pedidos` (kanban ou lista)
  - Visualização kanban: colunas por status
  - Cada card: cliente, total, data, prazo
  - Drag and drop para mudar status (ou botão "Avançar Etapa")
  - Filtros: status, período, cliente
  - Badge de alerta se pedido está atrasado (passou do SLA)
- [ ] **T5.7** Criar página `/pedidos/[id]`
  - Dados do cliente e entrega
  - Lista de itens (espécie, recipiente, qtd, preço)
  - Timeline de status (histórico visual)
  - Ações: avançar status, cancelar, editar, imprimir ordem de separação
- [ ] **T5.8** Criar ação "Converter Orçamento em Pedido" na página de orçamentos (P3)
  - Copia dados do quote para order
  - Muda status do quote para "aprovado"
  - Cria order com status "aprovado"

### Fase 3: Automações n8n

- [ ] **T5.9** Instalar n8n na VPS (Docker compose)
- [ ] **T5.10** Workflow: **Pedido Aprovado → Separação**
  ```
  Trigger: a Server Action que grava order.status = 'aprovado' chama o n8n por HTTP
  → Gerar ordem de separação (lista de espécies/qtd por lote)
  → Enviar WhatsApp para Débora: "Novo pedido #123 — separar: [lista]"
  → Enviar WhatsApp para cliente: "Seu pedido foi confirmado! Previsão de entrega: [data]"
  ```
- [ ] **T5.11** Workflow: **Separação Concluída → Carregamento**
  ```
  Trigger: webhook quando order.status = 'carregado'
  → Enviar WhatsApp para João: "Pedido #123 pronto para entrega em [endereço]"
  → Enviar WhatsApp para cliente: "Suas mudas estão a caminho!"
  ```
- [ ] **T5.12** Workflow: **Entregue → Cobrança**
  ```
  Trigger: webhook quando order.status = 'entregue'
  → Se pagamento pendente: enviar lembrete de pagamento ao cliente
  → Gerar registro financeiro (se integração contábil existir)
  → Atualizar estoque (trigger no banco já faz)
  ```
- [ ] **T5.13** Workflow: **Alerta de Atraso**
  ```
  Trigger: cron a cada 6h
  → Query pedidos onde tempo_na_etapa > SLA
  → Enviar WhatsApp para João/Gilberto: "Pedido #123 está há 48h em 'separando' — SLA é 24h"
  ```
- [ ] **T5.14** Guardar a URL de cada workflow do n8n em variável de ambiente e disparar a chamada
  HTTP de dentro da própria Server Action que muda o estado do pedido

### Fase 4: Ordem de Separação

- [ ] **T5.15** Criar template de ordem de separação (imprimível):
  - Número do pedido
  - Cliente + endereço
  - Lista: espécie | recipiente | quantidade | lote sugerido (baseado em FIFO, primeiro a plantar, primeiro a sair)
  - Campo para Débora marcar "separado" à mão
  - QR code que linka para o pedido no sistema
- [ ] **T5.16** Criar página `/pedidos/[id]/separar` (versão digital da ordem)

---

## Critérios de Aceite
- [ ] Orçamento aprovado se transforma em pedido com um clique
- [ ] Cada mudança de status dispara notificação WhatsApp para equipe e cliente
- [ ] Pedidos atrasados geram alerta automático
- [ ] Estoque é baixado automaticamente na entrega
- [ ] Kanban de pedidos mostra visão clara do pipeline
- [ ] Ordem de separação lista espécies e sugere lotes
- [ ] n8n workflows rodam sem intervenção manual

---

## Notas Técnicas
- n8n self-hosted é gratuito e ilimitado. Requer VPS com Node.js + Docker.
- O disparo para o n8n é uma chamada HTTP da Server Action, na mesma operação que muda o estado.
  Postgres puro não tem webhook de banco, e não faz falta: quem sabe que o pedido mudou é o código
  que o mudou.
- A ordem de separação com sugestão de lote (FIFO) ajuda a vender mudas mais antigas primeiro.
- Não integrar emissão de NF nesta fase: verificar API do sistema Sebrae como fase futura.
- O kanban é visual para João/Gilberto. Débora e funcionários interagem via WhatsApp.
