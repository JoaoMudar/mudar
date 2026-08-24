-- ============================================================
-- Agenda da semana e apontamento de tarefas
--
-- Especificacao: docs/rotinas/2-producao/01-agenda-de-pessoal.md
--                docs/rotinas/2-producao/05-apontamento-de-tarefas.md
-- Requisitos: RF-71 a RF-76, RF-92 a RF-100
-- Regras: RN-48, RN-50, RN-51, RN-52, RN-83 a RN-86
-- Entidades: C8 `week_plans`, `assignments`, `assignment_members`,
--            `task_executions`, `labor_rates`
--
-- O PLANEJADO E O REALIZADO SAO DUAS TABELAS, e nao uma com colunas de
-- previsto e realizado: a comparacao entre eles e justamente o que se quer
-- enxergar no fim do mes, e uma linha so obrigaria a sobrescrever o plano.
--
-- `task_executions` SUBSTITUI a `production_activities` da especificacao
-- anterior. Aquela registrava um fato consumado e o classificava por
-- `activity_type`, uma segunda lista fechada que duplicava `task_types`. Esta
-- registra um INTERVALO DE TRABALHO de uma pessoa, classificado pelo proprio
-- catalogo. A entidade antiga nunca chegou ao banco: a troca nao custou
-- migracao de dado.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

CREATE TABLE week_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start   DATE NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'rascunho',
  published_by UUID REFERENCES users(id),
  closed_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT week_plans_status_valido CHECK (status IN ('rascunho', 'publicada', 'fechada')),

  -- RN-50: semana fechada nao muda. `closed_at` e `status` nao podem discordar.
  CONSTRAINT week_plans_fechamento_coerente CHECK (
    (status = 'fechada' AND closed_at IS NOT NULL)
    OR (status <> 'fechada' AND closed_at IS NULL)
  ),

  -- A semana comeca na segunda. ISO: 1 = segunda-feira.
  CONSTRAINT week_plans_comeca_na_segunda CHECK (EXTRACT(ISODOW FROM week_start) = 1)
);

CREATE TRIGGER week_plans_set_updated_at
  BEFORE UPDATE ON week_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- A celula da grade: um dia, um turno, um tipo de tarefa e um GRUPO
-- ------------------------------------------------------------
CREATE TABLE assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id     UUID NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
  work_date        DATE NOT NULL,

  -- Deixou de ser o texto 'manha'/'tarde': a hora de inicio e de fim mora em
  -- `work_shifts`, e e de la que sai a duracao do turno (RN-85). O valor de
  -- quatro horas saiu do enunciado da RN-48 e virou parametro.
  shift_id         UUID NOT NULL REFERENCES work_shifts(id),

  task_type_id     UUID NOT NULL REFERENCES task_types(id),
  species_id       UUID REFERENCES species(id),
  container_id     UUID REFERENCES containers(id),
  batch_id         UUID REFERENCES batches(id),
  planned_quantity INTEGER,
  is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'planejada',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT assignments_status_valido CHECK (status IN
    ('planejada', 'confirmada', 'nao_confirmada')),
  CONSTRAINT assignments_quantidade_positiva
    CHECK (planned_quantity IS NULL OR planned_quantity > 0)
);

CREATE INDEX assignments_dia_idx    ON assignments(work_date);
CREATE INDEX assignments_semana_idx ON assignments(week_plan_id);

CREATE TRIGGER assignments_set_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RN-84: uma tarefa admite varios executores. Com `party_id` dentro da propria
-- atribuicao, escalar quatro pessoas na mesma tarefa criaria quatro
-- atribuicoes identicas, e a tarefa deixaria de ser uma coisa so para virar
-- quatro coisas parecidas. Metade da equipe enchendo saquinho enquanto a outra
-- repica e a norma do viveiro, nao a excecao.
CREATE TABLE assignment_members (
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  party_id      UUID NOT NULL REFERENCES cadastro.parties(id),
  PRIMARY KEY (assignment_id, party_id)
);

CREATE INDEX assignment_members_party_idx ON assignment_members(party_id);

-- ------------------------------------------------------------
-- O apontamento: uma linha por pessoa, com inicio e fim
-- ------------------------------------------------------------
CREATE TABLE task_executions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Opcional de proposito: apontamento avulso nao nasce da agenda, e e o caso
  -- de quem faz algo que nao estava planejado. Tornar obrigatorio proibiria
  -- exatamente o que a agenda nao consegue prever.
  assignment_id UUID REFERENCES assignments(id),

  task_type_id  UUID NOT NULL REFERENCES task_types(id),

  -- Quem EXECUTOU: pessoa com papel `funcionario`, com ou sem usuario. E
  -- distinto de `recorded_by`, que e quem clicou: uma pessoa so coordena a
  -- equipe inteira de um aparelho.
  party_id      UUID NOT NULL REFERENCES cadastro.parties(id),

  work_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- NULO SIGNIFICA TAREFA EM CURSO. E o que sustenta o cartao do funcionario
  -- na agenda do dia.
  ended_at      TIMESTAMPTZ,

  batch_id      UUID REFERENCES batches(id),
  species_id    UUID REFERENCES species(id),
  container_id  UUID REFERENCES containers(id),

  -- Pedida apenas quando a medicao for `saco` ou `tubete` (RN-81). E mesmo
  -- nessas, deixar em branco e aceito: hora sem contagem vale mais do que
  -- nenhum registro.
  quantity      INTEGER,

  status        TEXT NOT NULL DEFAULT 'em_andamento',
  recorded_by   UUID NOT NULL REFERENCES users(id),
  notes         TEXT,

  -- Idempotencia offline, mesmo padrao de `input_usages` (RNF-05). Apontamento
  -- duplicado infla horas, que e o numero que o custeio existe para apurar.
  client_id     UUID UNIQUE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT task_executions_status_valido CHECK (status IN
    ('em_andamento', 'concluida', 'interrompida')),
  CONSTRAINT task_executions_quantidade_nao_negativa
    CHECK (quantity IS NULL OR quantity >= 0),
  CONSTRAINT task_executions_fim_depois_do_inicio
    CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT task_executions_em_andamento_sem_fim CHECK (
    (status = 'em_andamento' AND ended_at IS NULL)
    OR (status <> 'em_andamento' AND ended_at IS NOT NULL)
  )
);

-- RN-83: UMA PESSOA FAZ UMA TAREFA POR VEZ.
--
-- E indice do banco, e nao validacao de aplicacao, de proposito: duas telas
-- abertas ao mesmo tempo burlariam a validacao, e dois apontamentos abertos
-- contariam a mesma hora duas vezes, inflando o custo de mao de obra.
CREATE UNIQUE INDEX task_executions_um_aberto_por_pessoa
  ON task_executions(party_id) WHERE ended_at IS NULL;

CREATE INDEX task_executions_dia_idx        ON task_executions(work_date);
CREATE INDEX task_executions_assignment_idx ON task_executions(assignment_id)
  WHERE assignment_id IS NOT NULL;
CREATE INDEX task_executions_batch_idx      ON task_executions(batch_id)
  WHERE batch_id IS NOT NULL;

CREATE TRIGGER task_executions_set_updated_at
  BEFORE UPDATE ON task_executions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A FK que ficou pendente na migration dos lotes, agora que a tabela existe.
ALTER TABLE batch_movements
  ADD CONSTRAINT batch_movements_task_execution_fk
  FOREIGN KEY (task_execution_id) REFERENCES task_executions(id);

-- ------------------------------------------------------------
-- Valor-hora do periodo
-- ------------------------------------------------------------
CREATE TABLE labor_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_month DATE NOT NULL UNIQUE,
  total_payroll   NUMERIC(12,2) NOT NULL,
  total_hours     NUMERIC(10,2) NOT NULL,
  rate_per_hour   NUMERIC(12,4) GENERATED ALWAYS AS (total_payroll / NULLIF(total_hours, 0)) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT labor_rates_folha_positiva CHECK (total_payroll > 0),
  CONSTRAINT labor_rates_horas_positivas CHECK (total_hours > 0)
);

-- O VALOR-HORA E MEDIO DA EQUIPE, nao individual, e o apontamento nao muda
-- isso. Ele diz QUANTO TEMPO a tarefa levou, que e o que varia entre especies.
-- Guardar valor-hora por pessoa transformaria a agenda num instrumento de
-- avaliacao de desempenho, o que muda a relacao da equipe com o app e derruba
-- o preenchimento (B2 §4).

COMMENT ON TABLE week_plans IS 'A semana de trabalho. Fechada, nao se altera (RN-50).';
COMMENT ON TABLE assignments IS 'O planejado: dia, turno, tipo de tarefa. O grupo esta em assignment_members.';
COMMENT ON TABLE assignment_members IS 'Quem foi escalado na atribuicao (RN-84).';
COMMENT ON TABLE task_executions IS 'O apontamento: intervalo de trabalho de uma pessoa numa tarefa.';
COMMENT ON COLUMN task_executions.ended_at IS 'Nulo = tarefa em curso. Indice unico parcial garante uma por pessoa (RN-83).';
COMMENT ON TABLE labor_rates IS 'Valor-hora medio da equipe por mes. Medio de proposito, nunca individual.';
