# P2 — Controle de Mortalidade e Perdas

## Status: NÃO INICIADO
## Prioridade: CRÍTICA
## Dependências: P1 (tabelas species, containers)
## Bloqueia: P6 (Dashboard — KPI de mortalidade)

---

## Objetivo
Rastrear a mortalidade de mudas por lote, espécie e causa, transformando perdas invisíveis em dados acionáveis. Identificar quais espécies perdem mais e por quê.

## Contexto
Hoje ninguém sabe a taxa de mortalidade. Pode ser 10%, pode ser 40%. Sem esse dado, o custeio (P1) é impreciso porque o custo real por muda vendida é: `custo_produção / taxa_sobrevivência`. Se planta 1000 e sobrevivem 700, cada muda custou 43% mais do que o calculado.

## Resultado Esperado
- Sistema de lotes identificados no campo (plaquinha + registro digital)
- Formulário mobile para contagem periódica de sobrevivência
- Taxa de mortalidade calculada automaticamente por espécie, lote e período
- Alertas quando mortalidade ultrapassa threshold configurável

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **Sistema de plaquinhas**: comprar placas de PVC e caneta permanente, identificar cada canteiro com código do lote (Débora + João)
- [ ] **Padrão de código de lote**: definir formato, ex: `ESP-REC-AAMMDD-SEQ` → `IPE-T-250415-01` (João)
- [ ] **Contagem inicial**: contar todas as mudas existentes por canteiro/espécie/recipiente e registrar como lote ativo (Débora + funcionários)
- [ ] **Lista de causas de perda**: validar e ajustar a lista padrão — praga, fungo, seca, alagamento, manuseio, geada, sol excessivo, outro (Gilberto)
- [ ] **Rotina de contagem**: definir dia do mês para contagem de sobrevivência (Débora)

---

## Tarefas de Desenvolvimento

### Fase 1: Schema de Lotes e Perdas

- [ ] **T2.1** Criar tabela `batches` (lotes)
  ```
  id, batch_code (único, gerado), species_id (FK), container_id (FK),
  initial_quantity, current_quantity, planting_date, expected_ready_date,
  location_description (texto livre — "canteiro 3, fileira B"),
  status (enum: germinando, crescendo, pronto, vendido, descartado),
  notes, created_at, updated_at
  ```
- [ ] **T2.2** Criar tabela `batch_counts` (contagens periódicas)
  ```
  id, batch_id (FK), count_date, quantity_alive, quantity_dead_since_last,
  counted_by (user_id), notes, created_at
  ```
- [ ] **T2.3** Criar tabela `loss_events` (eventos de perda)
  ```
  id, batch_id (FK), event_date, quantity_lost,
  cause (enum: praga, fungo, seca, alagamento, manuseio, geada, sol_excessivo, desconhecida, outro),
  cause_detail (texto livre), photo_url, reported_by (user_id), created_at
  ```
- [ ] **T2.4** Criar tabela `mortality_thresholds` (configuração de alertas)
  ```
  id, species_id (FK, nullable — se null, vale para todas),
  max_mortality_percent, alert_enabled, created_at
  ```
- [ ] **T2.5** Criar view `batch_mortality_summary`:
  ```sql
  SELECT b.id, b.batch_code, s.common_name, c.name as container,
    b.initial_quantity, b.current_quantity,
    ROUND((1 - b.current_quantity::decimal / b.initial_quantity) * 100, 1) as mortality_percent,
    b.planting_date,
    AGE(NOW(), b.planting_date) as age
  FROM batches b
  JOIN species s ON ...
  JOIN containers c ON ...
  ```
- [ ] **T2.6** Criar view `species_mortality_avg`:
  ```sql
  -- Média de mortalidade por espécie (todos os lotes)
  -- Usado no P1 para corrigir custo real
  ```
- [ ] **T2.7** Criar trigger: quando `batch_counts` é inserido, atualizar `batches.current_quantity`
- [ ] **T2.8** Criar RLS policies consistentes com P1

### Fase 2: Formulário Mobile — Registro de Lote

- [ ] **T2.9** Criar página `/app/lotes/novo`
  - Dropdown de espécie (da tabela `species` de P1)
  - Dropdown de recipiente
  - Campo numérico: quantidade inicial
  - Campo de data de plantio (default: hoje)
  - Campo texto: localização no viveiro
  - Gerar `batch_code` automaticamente no formato definido
  - Botão "Criar Lote" → salva e mostra plaquinha para imprimir/anotar
- [ ] **T2.10** Criar página `/app/lotes` (lista de lotes ativos)
  - Cards com: código, espécie, recipiente, quantidade atual, % mortalidade, idade
  - Filtros: espécie, status, recipiente
  - Ordenar por mortalidade (piores primeiro)
  - Busca por código do lote

### Fase 3: Formulário Mobile — Contagem e Registro de Perda

- [ ] **T2.11** Criar página `/app/lotes/[id]/contagem`
  - Exibe dados do lote (espécie, quantidade anterior, idade)
  - Campo numérico: "Quantas mudas vivas?" (foco principal)
  - Cálculo automático de perdas desde última contagem
  - Se houve perda > 0: abrir seção de causa
    - Dropdown de causa (lista padrão)
    - Campo texto opcional: detalhe
    - Botão de foto (câmera do celular)
  - Botão "Salvar Contagem"
- [ ] **T2.12** Implementar queue offline para contagens (mesmo padrão do P1)
- [ ] **T2.13** Criar notificação push/toast quando contagem é salva

### Fase 4: Alertas e Motor de Mortalidade

- [ ] **T2.14** Criar Edge Function `check-mortality-alerts`:
  - Roda diariamente (cron)
  - Compara mortalidade de cada lote com threshold da espécie
  - Se ultrapassou: cria notificação no sistema + envia mensagem WhatsApp para João/Débora
- [ ] **T2.15** Criar página `/app/admin/alertas-mortalidade`
  - Configurar threshold por espécie (default: 20%)
  - Ligar/desligar alertas
  - Histórico de alertas disparados

### Fase 5: Integração com Custeio (P1)

- [ ] **T2.16** Atualizar cálculo de custo unitário (P1 T1.18) para usar taxa de mortalidade real:
  ```
  custo_real = custo_produção / (1 - taxa_mortalidade)
  ```
  Exemplo: se custo é R$2,00 e mortalidade é 30%, custo real = R$2,00 / 0,7 = R$2,86
- [ ] **T2.17** Criar relatório `/app/relatorios/mortalidade`:
  - Ranking de espécies por taxa de mortalidade
  - Distribuição de causas de perda (gráfico pizza)
  - Evolução temporal da mortalidade (gráfico linha)
  - Impacto financeiro das perdas (quantidade perdida × custo unitário)

---

## Critérios de Aceite
- [ ] Pelo menos 5 lotes cadastrados com contagens registradas
- [ ] Mortalidade calculada automaticamente e visível na lista de lotes
- [ ] Alerta disparado quando mortalidade ultrapassa threshold
- [ ] Relatório mostra ranking de mortalidade por espécie
- [ ] Custo unitário do P1 é atualizado com taxa de mortalidade real
- [ ] Formulário mobile funciona offline e sincroniza depois

---

## Notas Técnicas
- A `batch_mortality_summary` view será consumida pelo Dashboard (P6) como KPI central.
- Quando P4 (WhatsApp) estiver pronto, alertas de mortalidade serão enviados por WhatsApp.
- A foto de perda pode ser armazenada no Supabase Storage (bucket `loss-photos`).
- O código de lote na plaquinha física DEVE ser idêntico ao digital — é o elo de ligação.
