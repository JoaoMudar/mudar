-- ============================================================
-- Estoque de insumo e gastos de tarefa
--
-- Especificacao: docs/rotinas/2-producao/05-apontamento-de-tarefas.md
-- Requisitos: RF-101 a RF-105 · Regras: RN-87, RN-88, RN-89
-- Entidades: C8 `input_stock_entries`, `task_expenses`, visao `input_stock_balance`
--
-- SO ENTRADAS, e a razao e evitar duplicacao. Um razao unico com entradas e
-- saidas obrigaria cada `input_usages` a gerar uma segunda linha dizendo o
-- mesmo, e as duas divergiriam ao primeiro registro que falhasse pela metade.
-- Aqui `input_usages` E a saida, e nao ha espelho.
--
-- O SALDO E A VISAO, e nao coluna em `inputs`: guardar o numero cria duas
-- verdades sobre ele (RN-88), pelo mesmo motivo que nao ha campo de saldo de
-- muda.
--
-- ADITIVA: `input_usages` ganha duas colunas e afrouxa duas. Nenhuma tela,
-- Server Action ou teste atual quebra.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

CREATE TABLE input_stock_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id       UUID NOT NULL REFERENCES inputs(id),
  entry_type     TEXT NOT NULL,

  -- Com sinal: negativa em `perda` e em ajuste para baixo.
  quantity       NUMERIC(12,3) NOT NULL,

  unit_cost      NUMERIC(12,4),
  entry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by    UUID NOT NULL REFERENCES users(id),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT input_stock_entries_type_valido CHECK (entry_type IN ('compra', 'ajuste', 'perda')),
  CONSTRAINT input_stock_entries_quantidade_nao_zero CHECK (quantity <> 0),
  CONSTRAINT input_stock_entries_compra_positiva
    CHECK (entry_type <> 'compra' OR quantity > 0),
  CONSTRAINT input_stock_entries_perda_negativa
    CHECK (entry_type <> 'perda' OR quantity < 0),
  CONSTRAINT input_stock_entries_custo_positivo
    CHECK (unit_cost IS NULL OR unit_cost > 0)
);

CREATE INDEX input_stock_entries_input_idx ON input_stock_entries(input_id, entry_date);

-- ------------------------------------------------------------
-- `input_usages` passa a nascer dentro do encerramento da tarefa
--
-- `species_id` e `container_id` afrouxam para opcionais: eram obrigatorios
-- porque nao havia outro jeito de saber onde o insumo foi aplicado. Com lote,
-- os dois vem dele, e pedi-los de novo seria pedir duas vezes o mesmo dado.
-- Continuam existindo para o registro avulso, que e como a tela de campo
-- funciona hoje e continua funcionando.
-- ------------------------------------------------------------
ALTER TABLE input_usages
  ADD COLUMN task_execution_id UUID REFERENCES task_executions(id),
  ADD COLUMN batch_id          UUID REFERENCES batches(id);

ALTER TABLE input_usages
  ALTER COLUMN species_id   DROP NOT NULL,
  ALTER COLUMN container_id DROP NOT NULL;

-- UM DOS DOIS LADOS TEM DE EXISTIR: ou o lote, ou o par especie e recipiente.
-- Consumo sem destino nao entra no custeio, e e o custeio que a entidade
-- existe para alimentar.
ALTER TABLE input_usages
  ADD CONSTRAINT input_usages_tem_destino CHECK (
    batch_id IS NOT NULL
    OR (species_id IS NOT NULL AND container_id IS NOT NULL)
  );

CREATE INDEX input_usages_task_execution_idx ON input_usages(task_execution_id)
  WHERE task_execution_id IS NOT NULL;
CREATE INDEX input_usages_batch_idx ON input_usages(batch_id)
  WHERE batch_id IS NOT NULL;

-- ------------------------------------------------------------
-- O saldo, derivado
--
-- SALDO NEGATIVO E PERMITIDO E SINALIZADO, NAO RECUSADO (RF-105). O saldo
-- depende de toda compra ter sido lancada, e o historico do viveiro diz que
-- nem toda foi: recusar o consumo real por causa de uma compra nao lancada
-- faria o campo parar de registrar consumo, que e o dado mais caro de obter.
-- O negativo aqui E O ALERTA de que falta lancar compra.
--
-- E por isso que a regra e diferente da do lote, onde o negativo E recusado: o
-- saldo do lote e apurado pelo proprio sistema desde a entrada, e negativo ali
-- e contradicao interna.
-- ------------------------------------------------------------
CREATE VIEW input_stock_balance AS
SELECT
  i.id                                             AS input_id,
  i.name                                           AS input_name,
  i.unit_of_measure,
  COALESCE(e.total_in, 0)                          AS total_in,
  COALESCE(u.total_used, 0)                        AS total_used,
  COALESCE(e.total_in, 0) - COALESCE(u.total_used, 0) AS balance,
  e.last_entry_date
FROM inputs i
LEFT JOIN (
  SELECT input_id, SUM(quantity) AS total_in, MAX(entry_date) AS last_entry_date
  FROM input_stock_entries GROUP BY input_id
) e ON e.input_id = i.id
LEFT JOIN (
  SELECT input_id, SUM(quantity) AS total_used
  FROM input_usages GROUP BY input_id
) u ON u.input_id = i.id;

-- ------------------------------------------------------------
-- Gasto extra da tarefa
-- ------------------------------------------------------------
CREATE TABLE task_expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Um dos dois vinculos tem de existir. Gasto sem tarefa nao e gasto de
  -- tarefa: e lancamento do Financeiro, e o lugar dele e outro.
  task_execution_id UUID REFERENCES task_executions(id),
  assignment_id     UUID REFERENCES assignments(id),

  description       TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,

  -- FK para financeiro.cost_centers quando o schema existir (P12/P13 T13.24).
  cost_center_id    UUID,

  recorded_by       UUID NOT NULL REFERENCES users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT task_expenses_valor_positivo CHECK (amount > 0),
  CONSTRAINT task_expenses_tem_vinculo CHECK (
    task_execution_id IS NOT NULL OR assignment_id IS NOT NULL
  )
);

CREATE INDEX task_expenses_execution_idx ON task_expenses(task_execution_id)
  WHERE task_execution_id IS NOT NULL;

-- E CUSTO DIRETO DO LOTE, nao custo fixo rateado (RN-89): quem pagou por ele
-- foi aquela leva, e dilui-lo no rateio geral esconderia justamente a leva
-- cara. O lote vem por `task_execution_id`, e nao por coluna propria, para que
-- nao existam dois caminhos ate ele.

COMMENT ON TABLE input_stock_entries IS
  'O que ENTRA no estoque de insumo. A saida e o proprio input_usages (RN-88).';
COMMENT ON VIEW input_stock_balance IS
  'Saldo derivado: entradas menos consumo. Negativo e sinalizado, nao recusado (RF-105).';
COMMENT ON TABLE task_expenses IS
  'Gasto extra da tarefa. Custo direto do lote trabalhado (RN-89).';
