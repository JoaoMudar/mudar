# P1 — Custeio por Espécie

## Status: NÃO INICIADO
## Prioridade: CRÍTICA
## Dependências: Nenhuma (projeto fundacional)
## Bloqueia: P3 (Precificação), P4 (WhatsApp), P6 (Dashboard)

---

## Objetivo
Calcular o custo real unitário de cada muda por espécie e recipiente, eliminando a precificação intuitiva e revelando espécies com margem negativa.

## Contexto
Hoje o Gilberto precifica de cabeça. Não existe custo por espécie. Frete não é incorporado corretamente. Risco real de vender no prejuízo sem saber. Os dados de insumos estão em notas de compra soltas dos últimos 6 meses. Custos fixos estão nos registros contábeis.

## Resultado Esperado
- Custo unitário calculado para cada combinação espécie × recipiente
- Formulário mobile para registro contínuo de consumo de insumos
- Relatório comparativo mostrando custo vs preço atual (revela margens reais)

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)
> Essas tarefas NÃO dependem de código. Devem ser iniciadas ANTES do desenvolvimento.
> João: distribua formulários em papel ou Google Forms simples para coletar isso.

- [ ] **Catálogo de espécies**: lista completa com nome popular + científico (Gilberto + Débora)
- [ ] **Mapa de recipientes**: para cada espécie, quais recipientes são usados (Débora)
- [ ] **Consumo de substrato**: volume de substrato por tipo de recipiente, medido com unidade padrão (Débora)
- [ ] **Tempo de produção**: meses médios da semente à muda pronta, por espécie (Débora — estimativa inicial)
- [ ] **Custo de insumos**: levantar notas de compra dos últimos 6 meses — substrato, adubo, defensivos, sacos, tubetes (Gilberto)
- [ ] **Custos fixos mensais**: salários, energia, água, manutenção, combustível, depreciação (Gilberto)
- [ ] **Custo de coleta de sementes**: deslocamento + horas por espécie/região de coleta (Gilberto + João)

---

## Tarefas de Desenvolvimento

### Fase 1: Schema do Banco de Dados
> Esta fase define a estrutura de dados que será usada por P1, P2, P3 e P6.

- [x] **T1.1** Criar tabela `species`
  ```
  id, common_name, scientific_name, category (enum: frutífera, ornamental, madeira, restauração, pioneira, clímax),
  germination_time_days, growth_time_months, notes, photo_url, created_at, updated_at
  ```
- [x] **T1.2** Criar tabela `containers`
  ```
  id, name (tubete, 10x18, 17x22, 20x26, 28x32, balde), volume_liters, substrate_per_unit_liters,
  unit_cost (custo do recipiente vazio), created_at
  ```
- [x] **T1.3** Criar tabela `inputs` (insumos)
  ```
  id, name, category (enum: substrato, adubo, defensivo, recipiente, outros),
  unit_of_measure, cost_per_unit, supplier, last_purchase_date, created_at, updated_at
  ```
- [x] **T1.4** Criar tabela `fixed_costs`
  ```
  id, category (enum: salários, energia, água, manutenção, combustível, depreciação, outros),
  monthly_amount, reference_month, notes, created_at
  ```
- [x] **T1.5** Criar tabela `seed_collection_costs`
  ```
  id, species_id (FK), collection_region, distance_km, fuel_cost, labor_hours,
  labor_cost_per_hour, total_cost, seeds_collected_qty, cost_per_seed, collection_date, created_at
  ```
- [x] **T1.6** Criar tabela `production_costs` (custo variável por espécie × recipiente)
  ```
  id, species_id (FK), container_id (FK), substrate_cost, seed_cost, input_costs_json,
  labor_minutes, labor_cost, total_variable_cost, calculated_at, created_at
  ```
- [x] **T1.7** Criar view `species_unit_cost` que calcula:
  ```
  custo_unitário = custo_variável + (custo_fixo_mensal_rateado / produção_mensal_estimada)
  ```
- [x] **T1.8** Criar RLS policies: apenas usuários autenticados leem/escrevem. Admin full access.
- [ ] **T1.9** Criar seed data com as espécies e recipientes levantados pela equipe de campo.

### Fase 2: Formulário Mobile de Registro de Insumos
> Interface para funcionários registrarem consumo de insumos no dia a dia.

- [x] **T1.10** Criar página `/app/insumos/registrar`
  - Dropdown de insumo (pré-carregado da tabela `inputs`)
  - Dropdown de espécie
  - Dropdown de recipiente
  - Campo numérico: quantidade usada
  - Botão grande "Registrar" com feedback visual
  - Máximo 5 campos na tela
- [x] **T1.11** Implementar queue offline (IndexedDB) para envio quando sem internet
- [x] **T1.12** Criar notificação toast de confirmação ao salvar

### Fase 3: Cadastros Administrativos
> Telas para João/Gilberto gerenciarem os dados mestres.

- [x] **T1.13** CRUD de espécies (`/app/admin/especies`) com upload de foto
- [x] **T1.14** CRUD de recipientes (`/app/admin/recipientes`)
- [x] **T1.15** CRUD de insumos (`/app/admin/insumos`) com histórico de preço
- [x] **T1.16** Registro de custos fixos mensais (`/app/admin/custos-fixos`)
- [x] **T1.17** Registro de coleta de sementes (`/app/admin/coleta-sementes`)

### Fase 4: Motor de Cálculo de Custo
- [ ] **T1.18** Implementar Edge Function `calculate-species-cost` que:
  1. Soma custos variáveis (substrato + semente + insumos + mão de obra)
  2. Rateia custos fixos pela produção mensal estimada
  3. Retorna custo unitário por espécie × recipiente
- [ ] **T1.19** Criar job agendado (cron) para recalcular custos diariamente
- [ ] **T1.20** Criar relatório `/app/relatorios/custeio`:
  - Tabela: espécie | recipiente | custo variável | custo fixo rateado | custo total | preço atual | margem %
  - Ordenável por qualquer coluna
  - Destaque vermelho para margens negativas
  - Filtro por categoria de espécie

---

## Critérios de Aceite
- [ ] Pelo menos 10 espécies cadastradas com custo calculado
- [ ] Formulário mobile funciona em celular Android com Chrome
- [ ] Cálculo de custo confere com validação manual em planilha
- [ ] Relatório mostra margens por espécie e destaca as negativas
- [ ] Dados sobrevivem a refresh e não se perdem offline

---

## Notas Técnicas
- O schema deste projeto é a BASE de todo o ecossistema. Modelar com cuidado.
- A tabela `species` será referenciada por P2 (perdas), P3 (preços), P7 (catálogo), P10 (e-commerce).
- Usar Supabase Realtime para que dados cadastrados apareçam imediatamente no dashboard (P6).
- Para o rateio de custos fixos, usar produção mensal estimada inicialmente. Quando P2 estiver rodando, usar produção real (descontando perdas).
