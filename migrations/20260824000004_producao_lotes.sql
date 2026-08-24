-- ============================================================
-- Lotes e movimentos de lote
--
-- Especificacao: docs/rotinas/2-producao/04-lotes-e-canteiros.md
-- Requisitos: RF-84 a RF-91 · Regras: RN-75 a RN-79, RN-90
-- Entidades: C8 `batches`, `batch_movements`
--
-- O LOTE E O ENDERECO DA MUDA. Especie e recipiente dizem O QUE a muda e;
-- `bed_id` diz ONDE ela esta. Ate 24/08/2026 o modelo nao tinha resposta para
-- a segunda pergunta, e a rotina de campo nao opera sem ela: a tarefa de
-- repicagem e dada apontando um canteiro, nao uma especie.
--
-- A revisao de escopo que trouxe o lote esta justificada em A1 §7, e o
-- conflito que ela resolveu, no achado L de docs/auditoria-divergencias.md.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

CREATE TABLE batches (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE,
  species_id         UUID NOT NULL REFERENCES species(id),
  container_id       UUID NOT NULL REFERENCES containers(id),

  -- Nulo APENAS no lote encerrado. Enquanto aberto, todo lote tem canteiro:
  -- lote sem lugar e a situacao que a entidade existe para eliminar. Ao
  -- encerrar, o canteiro e liberado para o proximo (RN-79).
  bed_id             UUID REFERENCES beds(id),

  -- Reflexivo: e o que a repicagem produz (RN-77). A muda que passa do tubete
  -- para o saco mudou de recipiente, e recipiente define produto, custo e
  -- preco: comercialmente, virou outra coisa. Percorrer esta cadeia responde
  -- de cada mil sementes semeadas quantas mudas chegaram a venda.
  parent_batch_id    UUID REFERENCES batches(id),

  initial_quantity   INTEGER NOT NULL,

  -- UNICA QUANTIDADE MATERIALIZADA DO MODELO, e a excecao e declarada. O saldo
  -- poderia ser somado de `batch_movements` a cada leitura, como o estoque de
  -- especie faz. Aqui nao: a tela de ocupacao le o saldo de todos os lotes
  -- abertos de uma vez, no celular, em rede instavel. `batch_movements` e a
  -- fonte que o audita, e divergencia entre os dois e defeito detectavel.
  current_quantity   INTEGER NOT NULL,

  stage              TEXT NOT NULL DEFAULT 'semeado',
  planted_at         DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Derivado de `planted_at` + tempo de producao da especie. Fica NULO, e nao
  -- zero, quando a especie nao o tem cadastrado: previsao ausente e
  -- informacao, previsao zerada e erro disfarcado de dado.
  expected_ready_at  DATE,

  closed_at          TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT batches_initial_positivo CHECK (initial_quantity > 0),

  -- RN-78: nenhum lote tem saldo negativo. Movimento que levaria o saldo
  -- abaixo de zero significa que a contagem esta errada, e gravar o negativo
  -- propagaria o erro para o estoque.
  CONSTRAINT batches_saldo_nao_negativo CHECK (current_quantity >= 0),

  CONSTRAINT batches_stage_valido CHECK (stage IN
    ('semeado', 'germinado', 'repicado', 'crescimento', 'rustificacao', 'pronto', 'encerrado')),

  -- RN-79: lote encerrado nao ocupa canteiro, e lote aberto ocupa. Os dois
  -- lados da regra, numa restricao so.
  CONSTRAINT batches_encerrado_sem_canteiro CHECK (
    (closed_at IS NULL AND bed_id IS NOT NULL)
    OR (closed_at IS NOT NULL AND bed_id IS NULL)
  ),

  -- Um lote nao pode ser origem de si mesmo.
  CONSTRAINT batches_origem_nao_e_ele_mesmo CHECK (parent_batch_id <> id)
);

-- RN-76: UM LOTE OCUPA UM CANTEIRO. E o indice unico parcial que garante isso,
-- e nao a aplicacao: duas telas abertas ao mesmo tempo criariam dois lotes no
-- mesmo canteiro, e a tela de ocupacao passaria a mentir.
CREATE UNIQUE INDEX batches_um_lote_aberto_por_canteiro
  ON batches(bed_id) WHERE closed_at IS NULL;

CREATE INDEX batches_species_idx      ON batches(species_id);
CREATE INDEX batches_parent_idx       ON batches(parent_batch_id) WHERE parent_batch_id IS NOT NULL;
CREATE INDEX batches_abertos_idx      ON batches(planted_at) WHERE closed_at IS NULL;

CREATE TRIGGER batches_set_updated_at
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- O razao que explica o saldo
-- ------------------------------------------------------------
CREATE TABLE batch_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID NOT NULL REFERENCES batches(id),
  movement_type     TEXT NOT NULL,

  -- Com sinal: positiva na entrada, negativa na saida. Zero apenas em
  -- `transferencia`, em que o que muda e o canteiro, nao a quantidade.
  quantity          INTEGER NOT NULL,

  movement_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  from_bed_id       UUID REFERENCES beds(id),
  to_bed_id         UUID REFERENCES beds(id),

  -- As tres origens sao TODAS OPCIONAIS. Movimento sem origem e o ajuste
  -- manual da gerencia, que existe e precisa caber: prende-lo a uma origem
  -- obrigatoria faria a correcao de um erro de digitacao ser impossivel sem
  -- inventar uma perda que nao houve.
  -- As FKs para task_executions, loss_events e stock_counts sao adicionadas
  -- nas migrations seguintes, quando as tabelas existirem.
  task_execution_id UUID,
  loss_event_id     UUID,
  stock_count_id    UUID,

  recorded_by       UUID NOT NULL REFERENCES users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT batch_movements_type_valido CHECK (movement_type IN
    ('entrada', 'perda', 'repicagem_saida', 'repicagem_entrada',
     'venda', 'ajuste_contagem', 'transferencia')),

  -- Transferencia muda o canteiro sem mudar o saldo; todo o resto muda o saldo
  -- sem mudar o canteiro.
  CONSTRAINT batch_movements_transferencia_coerente CHECK (
    (movement_type = 'transferencia'
       AND quantity = 0 AND from_bed_id IS NOT NULL AND to_bed_id IS NOT NULL)
    OR
    (movement_type <> 'transferencia'
       AND quantity <> 0 AND from_bed_id IS NULL AND to_bed_id IS NULL)
  )
);

CREATE INDEX batch_movements_batch_idx ON batch_movements(batch_id, movement_date);

COMMENT ON TABLE batches IS
  'A leva de mudas da mesma especie, no mesmo recipiente, ocupando um canteiro. RN-75, RN-76.';
COMMENT ON COLUMN batches.current_quantity IS
  'Saldo vivo, materializado de proposito. batch_movements e a fonte que o audita.';
COMMENT ON COLUMN batches.parent_batch_id IS
  'Lote de origem. A repicagem nao move o lote: cria um novo apontando para ele (RN-77).';
COMMENT ON TABLE batch_movements IS
  'Razao do saldo do lote. Toda alteracao de current_quantity tem uma linha aqui.';
