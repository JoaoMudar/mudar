-- ============================================================
-- Perdas e contagens de estoque, ligadas ao lote
--
-- Especificacao: docs/rotinas/2-producao/03-perdas.md
--                docs/rotinas/2-producao/04-lotes-e-canteiros.md
-- Requisitos: RF-23, RF-25, RF-26 a RF-29, RF-91
-- Regras: RN-14, RN-16, RN-17, RN-78, RN-90
-- Entidades: C8 `loss_events`, `stock_counts`
--
-- O FORMULARIO DE PERDA CONTINUA COM QUATRO CAMPOS, e agora sao lote,
-- quantidade, causa e observacao. E a RESOLUCAO da nota de projeto de C2
-- UC-17, e nao a reversao dela: aquele caso rejeitava pedir o LOCAL da perda
-- por ser o quinto campo que faria o colaborador deixar de registrar. Com
-- lote, o local vem de graca, porque um campo deixou de ser "especie" e
-- "recipiente" para ser "lote", que carrega os dois E MAIS o canteiro. O
-- colaborador passou a informar menos, e o sistema a saber mais.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

CREATE TABLE loss_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Determina especie, recipiente e canteiro de uma vez.
  batch_id     UUID REFERENCES batches(id),

  -- Dispensaveis quando ha lote. Continuam existindo para o registro avulso.
  species_id   UUID REFERENCES species(id),
  container_id UUID REFERENCES containers(id),

  quantity     INTEGER NOT NULL,
  cause        TEXT NOT NULL,
  loss_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reported_by  UUID NOT NULL REFERENCES users(id),
  notes        TEXT,

  -- Idempotencia offline, mesmo padrao de `input_usages` (RNF-05). Perda
  -- duplicada infla a mortalidade, que dispara alerta a 20%.
  client_id    UUID UNIQUE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT loss_events_quantidade_positiva CHECK (quantity > 0),

  -- Lista fechada de proposito: causa digitada a mao inviabiliza a analise por
  -- causa, que e justamente o que o indicador de mortalidade precisa produzir.
  CONSTRAINT loss_events_causa_valida CHECK (cause IN
    ('seca', 'praga', 'geada', 'manuseio', 'outro')),

  CONSTRAINT loss_events_tem_destino CHECK (
    batch_id IS NOT NULL
    OR (species_id IS NOT NULL AND container_id IS NOT NULL)
  )
);

CREATE INDEX loss_events_batch_idx ON loss_events(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX loss_events_data_idx  ON loss_events(loss_date);

-- ------------------------------------------------------------
-- Contagem fisica
--
-- NAO ARMAZENA O ESTOQUE: armazena o EVENTO de contagem. O estoque permanece
-- derivado; quando a contagem diverge do calculado, prevalece a contagem, e a
-- divergencia e ela propria informacao: indica registro de producao ou de
-- perda que nao foi feito.
--
-- `batch_id` entrou porque SE CONTA UM CANTEIRO, nao uma especie. Ninguem
-- percorre o viveiro somando ipes espalhados por seis canteiros: conta-se
-- canteiro por canteiro, que e a leva.
-- ------------------------------------------------------------
CREATE TABLE stock_counts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         UUID REFERENCES batches(id),
  species_id       UUID REFERENCES species(id),
  container_id     UUID REFERENCES containers(id),
  counted_quantity INTEGER NOT NULL,
  counted_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  counted_by       UUID NOT NULL REFERENCES users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT stock_counts_quantidade_nao_negativa CHECK (counted_quantity >= 0),
  CONSTRAINT stock_counts_tem_destino CHECK (
    batch_id IS NOT NULL
    OR (species_id IS NOT NULL AND container_id IS NOT NULL)
  )
);

CREATE INDEX stock_counts_batch_idx ON stock_counts(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX stock_counts_data_idx  ON stock_counts(counted_at);

-- As FKs que ficaram pendentes na migration dos lotes, agora que as tabelas
-- existem. A divergencia de contagem gera um `ajuste_contagem`, e e assim que
-- a contagem prevalece sem que exista um segundo lugar guardando estoque.
ALTER TABLE batch_movements
  ADD CONSTRAINT batch_movements_loss_event_fk
  FOREIGN KEY (loss_event_id) REFERENCES loss_events(id);

ALTER TABLE batch_movements
  ADD CONSTRAINT batch_movements_stock_count_fk
  FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id);

-- Uma origem por movimento, no maximo. Movimento sem origem continua valendo:
-- e o ajuste manual da gerencia.
ALTER TABLE batch_movements
  ADD CONSTRAINT batch_movements_origem_unica CHECK (
    (CASE WHEN task_execution_id IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN loss_event_id     IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN stock_count_id    IS NOT NULL THEN 1 ELSE 0 END) <= 1
  );

COMMENT ON TABLE loss_events IS
  'Perda de mudas. Com lote, o local vem de graca e o formulario segue com quatro campos.';
COMMENT ON TABLE stock_counts IS
  'Evento de contagem fisica, nao o estoque. Divergencia vira ajuste_contagem no lote (RN-14).';
