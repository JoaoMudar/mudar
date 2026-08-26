# P6: Dashboard de Gestão

> 📊 **Os indicadores deste painel são os nove do
> [`G2: Fichas de indicadores`](../docs/engenharia/G-gestao/G2-fichas-de-indicadores.md)**, IND-01 a
> IND-09, cada um com fórmula, fonte, janela, meta, faixas e responsável. As tarefas abaixo já
> foram reescritas por eles em 26/08/2026: as listas de KPI próprias que o plano tinha, anteriores
> ao G2, foram apagadas em vez de mantidas como histórico, porque quem implementa lê a tarefa, e
> não o aviso. Ver [`docs/auditoria-divergencias.md`](../docs/auditoria-divergencias.md), achado G.

> 🗂️ **Módulo 4 · Financeiro** (reorganização de 19/08/2026). Indicadores deixaram de ser
> módulo próprio: são os painéis do Financeiro, em `/financeiro/indicadores`. **Isso não os
> fecha para a gerência**: o Financeiro restringe *por recurso*, não pela porta do módulo:
> a base bancária é de chefia/admin, e o painel operacional (IND-01, 02, 03 e 05) segue
> aberto à gerência, como o `G2 §6` já previa. Mês não fechado exibe travessão (RF-61).

## Status: NÃO INICIADO
## Prioridade: CRÍTICA
## Dependências: P1 (custeio), P2 (mortalidade), P3 (preços/orçamentos)
## Bloqueia: Nenhum (consome dados dos outros projetos)

---

## Objetivo
Criar painel visual único para Gilberto e João acompanharem o negócio em tempo real (faturamento, margem, mortalidade, estoque, pedidos) e tomarem decisões baseadas em dados.

## Contexto
Hoje ninguém tem visão consolidada do negócio. Gilberto sabe de vendas de cabeça. Débora sabe de produção de olho. Ninguém sabe mortalidade, margem real ou tendência. Decisões são intuitivas. O dashboard é onde todos os dados dos projetos P1-P5 se encontram e viram informação acionável.

## Resultado Esperado
- Dashboard web responsivo (prioridade celular)
- Os 9 indicadores do `G2` visíveis na tela inicial, filtrados pelo perfil de quem entra
- Filtros por período, espécie, canal, cliente
- Mês não fechado exibe travessão, nunca zero (RF-61)
- Projeção de receita baseada em estoque disponível (fora das fichas, ver Fase 3)

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **Metas e faixas**: João + Gilberto confirmarem a meta e as faixas de cada uma das 9 fichas do
  `G2`. **Quais** indicadores já estão decididos; o que falta da equipe é o número-alvo
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
- [ ] **T6.6** Criar a Server Action `getIndicadores` (`src/app/financeiro/indicadores/actions.ts`),
  que devolve numa chamada só os indicadores que o perfil de quem pede pode ver:

  | Ficha | Indicador | Fonte principal |
  |---|---|---|
  | IND-01 | Taxa de mortalidade por espécie | `loss_events`, `batches` (P2) |
  | IND-02 | Custo unitário por espécie e recipiente | `species_unit_cost` (P1) |
  | IND-03 | Prazo médio de produção | `batches`, `batch_movements` |
  | IND-04 | Margem por canal de venda | `sale_prices` + IND-02 (P3) |
  | IND-05 | Taxa de atendimento de pedidos | `orders`, `order_items` |
  | IND-06 | Taxa de conversão de cotações | `supplier_quotes` (P11) |
  | IND-07 | Resultado dos centros de negócio | `financeiro.transactions` (P12) |
  | IND-08 | Estrutura de custo fixo | `fixed_costs`, `financeiro.categories` |
  | IND-09 | Fila de lançamentos pendentes | `financeiro.transactions` (P12) |

  Fórmula, janela, meta, faixas e responsável de cada um estão na ficha do `G2`. **Não inventar
  indicador aqui**: o que não tem ficha não entra no painel (ver Fase 3).

### Fase 2: Interface do Dashboard

- [ ] **T6.7** Criar página `/financeiro/indicadores` (tela principal), montada pelo **painel por
  perfil** do [`G2 §6`](../docs/engenharia/G-gestao/G2-fichas-de-indicadores.md):
  - **Chefia e administrador**: IND-01 a IND-09
  - **Gerência**: IND-01, IND-02, IND-03 e IND-05. Os cinco financeiros **não são renderizados**
    para o perfil, nem em travessão
  - **Colaborador**: não acessa a tela
  - **Header**: período selecionado + filtros rápidos
  - Cada ficha vira um card com valor, faixa e seta de direção, e o detalhe abre a série do
    período. A codificação **nunca é só cor**: acompanha símbolo e rótulo (`G2`, codificação
    visual)
  - **Sem dado exibe travessão, jamais zero** (RF-61): mês não fechado não tem número
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
- [ ] **T6.11** Manter o painel atualizado com `revalidatePath` nas Server Actions que alimentam os
  indicadores, e `revalidate` na própria rota para o caso de ninguém ter escrito nada

### Fase 3: Projeção e Análise

> **Fora das nove fichas.** O que segue não tem ficha no `G2` e não é indicador: são seções de
> apoio da mesma tela. Se alguma delas virar número acompanhado com meta, ganha ficha no `G2`
> primeiro, e só depois entra no painel.

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
- [ ] Os nove indicadores calculam pela fórmula da ficha do `G2`, e não por fórmula deste plano
- [ ] Mês não fechado exibe travessão, e nunca zero (RF-61)
- [ ] A gerência vê IND-01, 02, 03 e 05, e os cinco financeiros não chegam ao navegador dela
- [ ] Filtros funcionam e atualizam todos os componentes
- [ ] Gráficos são legíveis no celular
- [ ] Projeção de receita calcula com base no estoque real
- [ ] Alertas aparecem sem necessidade de ir em outra página
- [ ] Dados atualizam automaticamente sem refresh manual

---

## Notas Técnicas
- Dashboard é consumidor, não produtor de dados. Depende de P1-P3 terem dados.
- Começar com dados mockados se P1-P3 ainda não tiverem dados reais suficientes.
- Agregar em visão do próprio Postgres: não calcular no frontend.
- Cache das consultas pesadas com `unstable_cache` ou `revalidate` de rota.
- O dashboard vai crescer progressivamente: começa com KPIs de P1-P3, depois adiciona métricas de P4-P5 quando implementados.
- Gilberto vai querer ver isso no celular durante o café da manhã, precisa ser rápido e claro.
