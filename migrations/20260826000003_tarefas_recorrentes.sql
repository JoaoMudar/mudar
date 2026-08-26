-- ============================================================
-- Tarefa recorrente: a rotina fixa que nao se lanca todo dia
--
-- Especificacao: docs/rotinas/2-producao/01-agenda-de-pessoal.md (decisao 3)
-- Requisitos: RF-72, RF-114 a RF-116
-- Regras: RN-48 (emendada), RN-95, RN-96
-- Entidades: C8 `task_recurrences`, `task_recurrence_members`, `assignments`
--
-- A MARCA VIROU REGRA. `assignments.is_recurring` era um booleano que dizia
-- "esta tarefa e fixa" sem dizer DE QUE REGRA ela vinha, em que dias ela vale
-- nem ate quando. Servia para copiar a semana; nao serve para a irrigacao das
-- 7h as 8h, de segunda a sabado, ate o fim do verao.
--
-- A RECORRENCIA E A EXCECAO DECLARADA A RN-48 (RN-95). O viveiro planeja por
-- turno, e continua planejando: e a rotina FIXA que tem hora, e e justamente
-- por ter hora que ela nao precisa ser lancada todo dia. Pedir horario no
-- planejamento comum garantiria agenda nao preenchida; nao pedir aqui
-- desenharia a barra do Gantt no lugar errado.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

CREATE TABLE task_recurrences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type_id  UUID NOT NULL REFERENCES task_types(id),

  -- ISO: 1 = segunda ... 7 = domingo, o mesmo criterio de
  -- `week_plans_comeca_na_segunda`. Array, e nao sete booleanos: a pergunta que
  -- se faz e sempre "esta regra vale na quarta?", que `3 = ANY(weekdays)`
  -- responde direto, e sete colunas obrigariam a nomear cada dia em toda
  -- consulta.
  weekdays      SMALLINT[] NOT NULL,

  -- Obrigatorias, ao contrario da atribuicao comum: recorrencia sem hora seria
  -- indistinguivel de tarefa marcada como fixa, que e o que esta tabela veio
  -- substituir.
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,

  -- Os mesmos qualificadores da atribuicao, e pelo mesmo motivo: o catalogo de
  -- tipos de tarefa e que decide quais aparecem (RF-82).
  species_id    UUID REFERENCES species(id),
  container_id  UUID REFERENCES containers(id),
  batch_id      UUID REFERENCES batches(id),
  area_id       UUID REFERENCES areas(id),
  bed_id        UUID REFERENCES beds(id),

  valid_from    DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Nula = vigente por prazo indeterminado. Encerrar a recorrencia e preencher
  -- esta data, nunca apagar a linha: as ocorrencias ja geradas apontam para ela
  -- e o passado nao se reescreve (RF-116, RN-96).
  valid_until   DATE,

  active        BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT task_recurrences_hora_coerente
    CHECK (end_time > start_time),

  -- Array vazio seria regra que nunca ocorre, e dia fora de 1..7 seria regra
  -- que nunca ocorre sem parecer que nunca ocorre.
  --
  -- `cardinality` E NAO `array_length`: para o array vazio, `array_length`
  -- devolve NULL, e `NULL BETWEEN 1 AND 7` e NULL, que o CHECK aceita. A
  -- restricao escrita do jeito obvio deixava passar exatamente o caso que ela
  -- existia para barrar. `cardinality` devolve 0, que e falso de verdade.
  --
  -- `array_position(weekdays, NULL) IS NULL` barra o elemento nulo, que
  -- `<@` sozinho nao pega: ARRAY[1,NULL] esta contido no conjunto pelas regras
  -- de logica ternaria, e viraria uma regra com um dia que nao e dia nenhum.
  CONSTRAINT task_recurrences_dias_validos CHECK (
    cardinality(weekdays) BETWEEN 1 AND 7
    AND weekdays <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]
    AND array_position(weekdays, NULL) IS NULL
  ),

  CONSTRAINT task_recurrences_vigencia_coerente
    CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE INDEX task_recurrences_vigentes_idx
  ON task_recurrences(valid_from) WHERE active;

CREATE TRIGGER task_recurrences_set_updated_at
  BEFORE UPDATE ON task_recurrences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- O grupo da recorrencia
-- ------------------------------------------------------------
-- Mesma forma de `assignment_members`, e pelo mesmo motivo (RN-84): a
-- recorrencia e escolhida para UM FUNCIONARIO OU UM GRUPO, e "a equipe inteira
-- irriga de manha" e uma regra so, nao nove regras parecidas.
CREATE TABLE task_recurrence_members (
  recurrence_id UUID NOT NULL REFERENCES task_recurrences(id) ON DELETE CASCADE,
  party_id      UUID NOT NULL REFERENCES cadastro.parties(id),
  PRIMARY KEY (recurrence_id, party_id)
);

CREATE INDEX task_recurrence_members_party_idx ON task_recurrence_members(party_id);

-- O CASCADE E DOS MEMBROS, E NUNCA DAS ATRIBUICOES. Apagar a regra apaga quem
-- estava nela; apagar o dia que ja foi trabalhado, jamais (RN-96).

-- ------------------------------------------------------------
-- A ocorrencia: atribuicao comum que sabe de onde veio
-- ------------------------------------------------------------
ALTER TABLE assignments
  ADD COLUMN recurrence_id UUID REFERENCES task_recurrences(id),
  DROP COLUMN is_recurring;

-- `is_recurring` SAI pelo mesmo motivo que `measurement_type` saiu do catalogo
-- de tarefas: o booleano respondia metade da pergunta, e `recurrence_id IS NOT
-- NULL` responde ela inteira, dizendo tambem QUAL regra a gerou. Nenhuma tela
-- le a coluna e nenhuma linha existe, entao nao ha backfill.

-- IDEMPOTENCIA DA GERACAO. A ocorrencia nasce quando se abre a agenda do dia,
-- e nao por tarefa agendada: o sistema nao tem cron, e criar um so para isto
-- seria infraestrutura nova para uma regra que a propria tela resolve. Sem
-- este indice, abrir a agenda duas vezes geraria a atribuicao duas vezes, e as
-- horas do dia sem apontamento (RF-100) dobrariam.
CREATE UNIQUE INDEX assignments_uma_ocorrencia_por_dia
  ON assignments(recurrence_id, work_date)
  WHERE recurrence_id IS NOT NULL;

COMMENT ON TABLE task_recurrences IS
  'A rotina fixa: tipo de tarefa, dias da semana, hora e vigencia. Declara hora por excecao a RN-48 (RN-95).';
COMMENT ON COLUMN task_recurrences.weekdays IS
  'Dias em que a regra vale, ISO 1=segunda a 7=domingo.';
COMMENT ON COLUMN task_recurrences.valid_until IS
  'Nula = sem prazo. Encerrar a recorrencia e preencher esta data, nunca apagar a linha (RF-116).';
COMMENT ON TABLE task_recurrence_members IS
  'Quem a recorrencia escala. Um funcionario ou um grupo, numa regra so.';
COMMENT ON COLUMN assignments.recurrence_id IS
  'Regra que gerou esta ocorrencia. Nula = atribuicao lancada a mao. Editar a ocorrencia nao altera a regra (RN-96).';
