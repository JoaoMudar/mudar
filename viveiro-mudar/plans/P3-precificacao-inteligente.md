# P3 — Modelo de Precificação Inteligente

## Status: NÃO INICIADO
## Prioridade: CRÍTICA
## Dependências: P1 (custo unitário calculado), P2 (mortalidade para custo real)
## Bloqueia: P4 (WhatsApp — orçamento automático), P6 (Dashboard — margem), P10 (E-commerce — preço)

---

## Objetivo
Substituir a precificação de cabeça do Gilberto por um modelo baseado em dados: custo real + margem por canal + regras de volume. Gerar tabela de preços dinâmica e simulador de orçamento.

## Contexto
Gilberto define preços de memória. Não existe tabela formal. Diferentes clientes pagam preços diferentes sem lógica clara. Sem saber o custo real, impossível saber se a margem é 50% ou -10%. Concorrentes não são monitorados. Frete é calculado à parte e às vezes absorvido sem contabilizar.

## Resultado Esperado
- Tabela de preços por espécie × recipiente × canal com margem mínima garantida
- Simulador de orçamento (seleciona espécies/qtd → preço final com frete)
- Relatório de rentabilidade: ranking de espécies por margem real
- Regras de desconto por volume configuráveis

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **Preços atuais praticados**: Gilberto registrar preços que cobra hoje por espécie e recipiente, mesmo que aproximado
- [ ] **Pesquisa de concorrentes**: João levantar preços de 3-5 concorrentes para as 10 espécies mais vendidas
- [ ] **Classificação de clientes**: Gilberto classificar clientes atuais por perfil — prefeitura, construtora, compensação ambiental, paisagismo, revenda, pessoa física
- [ ] **Top espécies**: João extrair das notas Excel as 10 mais vendidas e 10 menos vendidas dos últimos 2 anos
- [ ] **Margem mínima por canal**: Gilberto + João definirem piso de margem — ex: atacado 30%, compensação 50%, varejo 80%
- [ ] **Tabela de frete**: João documentar custo de frete por faixa de km (atual R$/km)

---

## Tarefas de Desenvolvimento

### Fase 1: Schema de Precificação

- [ ] **T3.1** Criar tabela `sales_channels`
  ```
  id, name (atacado, compensação_ambiental, paisagismo, prefeitura, varejo, revenda),
  min_margin_percent, default_margin_percent, description, created_at
  ```
- [ ] **T3.2** Criar tabela `price_table`
  ```
  id, species_id (FK), container_id (FK), channel_id (FK),
  base_cost (de P1), mortality_adjusted_cost (de P2), margin_percent,
  unit_price, min_price (piso), max_price (teto, opcional),
  valid_from, valid_until (nullable), created_at, updated_at
  ```
- [ ] **T3.3** Criar tabela `volume_discounts`
  ```
  id, channel_id (FK, nullable — se null, vale pra todos),
  min_quantity, max_quantity, discount_percent, created_at
  ```
- [ ] **T3.4** Criar tabela `freight_rules`
  ```
  id, min_distance_km, max_distance_km, cost_per_km,
  min_freight_value, vehicle (enum: van, caminhão), created_at
  ```
- [ ] **T3.5** Criar tabela `competitor_prices` (inteligência de mercado)
  ```
  id, competitor_name, species_id (FK), container_id (FK),
  price, source (site, telefone, indicação), collected_date, collected_by, created_at
  ```
- [ ] **T3.6** Criar tabela `quotes` (orçamentos)
  ```
  id, customer_name, customer_phone, customer_email (nullable),
  channel_id (FK), status (enum: rascunho, enviado, aprovado, recusado, expirado),
  subtotal, freight_cost, total, delivery_distance_km,
  notes, valid_until, created_at, updated_at
  ```
- [ ] **T3.7** Criar tabela `quote_items`
  ```
  id, quote_id (FK), species_id (FK), container_id (FK),
  quantity, unit_price, discount_percent, line_total, created_at
  ```

### Fase 2: Motor de Precificação

- [ ] **T3.8** Criar Edge Function `generate-price-table`:
  - Para cada espécie × recipiente × canal:
    1. Buscar custo unitário de P1 (ajustado por mortalidade de P2)
    2. Aplicar margem do canal
    3. Calcular preço unitário = custo_real × (1 + margem)
    4. Verificar se preço >= piso mínimo
    5. Salvar na `price_table`
  - Deve rodar sob demanda e via cron (diário)
- [ ] **T3.9** Criar Edge Function `calculate-quote`:
  - Input: lista de {species_id, container_id, quantity}, channel_id, distância_km
  - Para cada item: buscar preço na `price_table`, aplicar desconto por volume
  - Calcular frete com base nas `freight_rules`
  - Retornar: subtotal, frete, total, margem estimada
- [ ] **T3.10** Criar Edge Function `check-price-competitiveness`:
  - Comparar preço da tabela com preços de concorrentes
  - Retornar flag: abaixo_mercado, no_mercado, acima_mercado

### Fase 3: Interface — Tabela de Preços

- [ ] **T3.11** Criar página `/app/precos/tabela`
  - Grid: espécie × recipiente com preço por canal
  - Células editáveis para ajuste manual (override do cálculo)
  - Indicador visual de margem: verde (>40%), amarelo (20-40%), vermelho (<20%)
  - Botão "Recalcular Todos" que roda o motor de precificação
  - Filtros: categoria de espécie, canal
  - Export para Excel (Gilberto vai querer imprimir)

### Fase 4: Simulador de Orçamento

- [ ] **T3.12** Criar página `/app/orcamento/novo`
  - Campo: nome do cliente, telefone, canal de venda
  - Buscador de espécies com autocomplete
  - Para cada espécie adicionada: selecionar recipiente + quantidade
  - Preview em tempo real: subtotal parcial
  - Campo: distância de entrega (km) → calcula frete automático
  - Total final = subtotal + frete
  - Botão "Salvar Orçamento" → salva como `quote` status rascunho
  - Botão "Enviar por WhatsApp" → abre link wa.me com texto formatado
- [ ] **T3.13** Criar página `/app/orcamento` (lista de orçamentos)
  - Cards com: cliente, data, total, status
  - Filtros: status, canal, período
  - Ação: duplicar, editar, marcar como aprovado/recusado
- [ ] **T3.14** Criar template de orçamento em PDF (para enviar por email/WhatsApp)

### Fase 5: Relatórios de Rentabilidade

- [ ] **T3.15** Criar página `/app/relatorios/rentabilidade`
  - Ranking de espécies por margem real (% e R$ absoluto)
  - Ranking de espécies por volume vendido
  - Matriz: margem × volume (quadrante estratégico — estrelas, vacas leiteiras, abacaxis)
  - Evolução de preço médio praticado vs custo ao longo do tempo
- [ ] **T3.16** Criar página `/app/relatorios/concorrencia`
  - Comparativo: nosso preço vs concorrentes por espécie
  - Indicador de competitividade

---

## Critérios de Aceite
- [ ] Tabela de preços gerada automaticamente para pelo menos 10 espécies × 3 recipientes × 2 canais
- [ ] Simulador de orçamento calcula preço final com frete em tempo real
- [ ] Margem nunca fica abaixo do piso configurado por canal
- [ ] Desconto por volume é aplicado corretamente
- [ ] Orçamento pode ser enviado por WhatsApp com texto formatado
- [ ] Relatório de rentabilidade identifica espécies mais e menos lucrativas

---

## Notas Técnicas
- A `price_table` é a fonte de verdade para preços. P4 (WhatsApp) e P10 (E-commerce) consomem dela.
- O simulador de orçamento é o protótipo do que o agente WhatsApp fará automaticamente.
- Manter histórico de preços: não deletar registros antigos, usar `valid_from/valid_until`.
- O PDF de orçamento deve incluir: logo, dados do viveiro, lista de mudas, preço unitário, total, frete, validade, condições de pagamento.
