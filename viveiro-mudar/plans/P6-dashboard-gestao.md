# P6 — Dashboard de Gestão

## Status: NÃO INICIADO
## Prioridade: CRÍTICA
## Dependências: P1 (custeio), P2 (mortalidade), P3 (preços/orçamentos)
## Bloqueia: Nenhum (consome dados dos outros projetos)

---

## Objetivo
Criar painel visual único para Gilberto e João acompanharem o negócio em tempo real — faturamento, margem, mortalidade, estoque, pedidos — e tomarem decisões baseadas em dados.

## Contexto
Hoje ninguém tem visão consolidada do negócio. Gilberto sabe de vendas de cabeça. Débora sabe de produção de olho. Ninguém sabe mortalidade, margem real ou tendência. Decisões são intuitivas. O dashboard é onde todos os dados dos projetos P1-P5 se encontram e viram informação acionável.

## Resultado Esperado
- Dashboard web responsivo (prioridade celular)
- KPIs principais visíveis na tela inicial
- Filtros por período, espécie, canal, cliente
- Rankings de rentabilidade e mortalidade
- Projeção de receita baseada em estoque disponível

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **KPIs prioritários**: João + Gilberto escolherem os 5-7 indicadores mais importantes — sugestão: faturamento mensal, margem média, mortalidade média, estoque total, pedidos em aberto, ticket médio, mix de canais
- [ ] **Frequência de consulta**: definir se vão olhar diariamente, semanalmente ou sob demanda
- [ ] **Auditoria de dados**: Débora validar nas primeiras 4 semanas se os dados dos P1-P3 estão sendo preenchidos corretamente

---

## Tarefas de Desenvolvimento

### Fase 1: Views e Funções de Agregação

- [ ] **T6.1** Criar view `dashboard_revenue`
  ```sql
  -- Faturamento por período, canal, espécie
  SELECT DATE_TRUNC('month', o.created_at) as month,
    sc.name as channel, SUM(o.total) as revenue,
    COUNT(o.id) as order_count,
    AVG(o.total) as avg_ticket
  FROM orders o JOIN sales_channels sc ON ...
  WHERE o.status IN ('entregue', 'pago')
  GROUP BY 1, 2
  ```
- [ ] **T6.2** Criar view `dashboard_margin`
  ```sql
  -- Margem real por espécie
  SELECT s.common_name, c.name as container,
    AVG(pt.unit_price) as avg_price,
    AVG(pt.mortality_adjusted_cost) as avg_cost,
    AVG(pt.margin_percent) as avg_margin
  FROM price_table pt
  JOIN species s ON ...
  JOIN containers c ON ...
  GROUP BY 1, 2
  ORDER BY avg_margin ASC
  ```
- [ ] **T6.3** Criar view `dashboard_mortality`
  ```sql
  -- Mortalidade consolidada
  SELECT s.common_name,
    COUNT(b.id) as total_batches,
    SUM(b.initial_quantity) as total_planted,
    SUM(b.current_quantity) as total_alive,
    ROUND((1 - SUM(b.current_quantity)::decimal / NULLIF(SUM(b.initial_quantity), 0)) * 100, 1) as mortality_pct
  FROM batches b JOIN species s ON ...
  WHERE b.status NOT IN ('descartado')
  GROUP BY 1
  ```
- [ ] **T6.4** Criar view `dashboard_stock`
  ```sql
  -- Estoque disponível para venda (lotes prontos)
  SELECT s.common_name, c.name as container,
    SUM(b.current_quantity) as available,
    SUM(b.current_quantity * pt.unit_price) as stock_value
  FROM batches b
  JOIN species s ON ...
  JOIN containers c ON ...
  LEFT JOIN price_table pt ON ...
  WHERE b.status = 'pronto'
  GROUP BY 1, 2
  ```
- [ ] **T6.5** Criar view `dashboard_pipeline`
  ```sql
  -- Pipeline de pedidos por status
  SELECT status, COUNT(*) as count, SUM(total) as total_value
  FROM orders
  WHERE status NOT IN ('cancelado', 'pago')
  GROUP BY status
  ```
- [ ] **T6.6** Criar Edge Function `dashboard-summary` que retorna todos os KPIs em uma chamada:
  - Faturamento do mês atual vs mês anterior (% variação)
  - Margem média ponderada
  - Mortalidade média geral
  - Estoque total (unidades) e valor estimado
  - Pedidos em aberto (qtd e valor)
  - Ticket médio
  - Top 5 espécies por faturamento
  - Top 5 espécies por mortalidade (piores)

### Fase 2: Interface do Dashboard

- [ ] **T6.7** Criar página `/app/dashboard` (tela principal)
  - **Header**: período selecionado + filtros rápidos
  - **Linha 1 — KPI Cards** (6 cards):
    - Faturamento (R$ + % vs mês anterior)
    - Margem Média (% + indicador cor)
    - Estoque Disponível (unidades)
    - Valor em Estoque (R$)
    - Pedidos em Aberto (qtd)
    - Mortalidade Média (%)
  - **Linha 2 — Gráficos**:
    - Faturamento mensal (barras, últimos 12 meses)
    - Distribuição por canal (pizza/donut)
  - **Linha 3 — Rankings**:
    - Top espécies por faturamento (barra horizontal)
    - Piores espécies por mortalidade (barra horizontal vermelha)
  - **Linha 4 — Tabela resumo**:
    - Espécie | Estoque | Custo | Preço | Margem | Mortalidade
    - Ordenável por qualquer coluna
- [ ] **T6.8** Implementar filtros globais:
  - Período: 7d, 30d, 90d, 12m, custom
  - Espécie (multi-select)
  - Canal de venda
  - Recipiente
- [ ] **T6.9** Implementar responsividade mobile:
  - KPI cards em 2 colunas no celular
  - Gráficos em stack vertical
  - Tabela com scroll horizontal
  - Touch-friendly (botões grandes)
- [ ] **T6.10** Usar Recharts ou Chart.js para gráficos
- [ ] **T6.11** Implementar refresh automático dos dados (polling a cada 5min ou Supabase Realtime)

### Fase 3: Projeção e Análise

- [ ] **T6.12** Criar seção "Projeção de Receita":
  - Estoque atual × preço médio por canal = receita potencial
  - Lotes em crescimento × data prevista = receita futura estimada
  - Gráfico de pipeline de receita por mês
- [ ] **T6.13** Criar seção "Alertas Ativos":
  - Lista de alertas de mortalidade pendentes
  - Pedidos atrasados
  - Espécies com estoque zerado
  - Espécies com margem negativa
- [ ] **T6.14** Criar export dos dados para Excel (botão "Exportar")

---

## Critérios de Aceite
- [ ] Dashboard carrega em menos de 3 segundos no celular
- [ ] KPIs refletem dados reais dos P1-P3
- [ ] Filtros funcionam e atualizam todos os componentes
- [ ] Gráficos são legíveis no celular
- [ ] Projeção de receita calcula com base no estoque real
- [ ] Alertas aparecem sem necessidade de ir em outra página
- [ ] Dados atualizam automaticamente sem refresh manual

---

## Notas Técnicas
- Dashboard é consumidor, não produtor de dados. Depende de P1-P3 terem dados.
- Começar com dados mockados se P1-P3 ainda não tiverem dados reais suficientes.
- Usar Supabase views para agregar dados — não calcular no frontend.
- Cache de 5 minutos para queries pesadas (via Edge Function ou React Query staleTime).
- O dashboard vai crescer progressivamente: começa com KPIs de P1-P3, depois adiciona métricas de P4-P5 quando implementados.
- Gilberto vai querer ver isso no celular durante o café da manhã — precisa ser rápido e claro.
