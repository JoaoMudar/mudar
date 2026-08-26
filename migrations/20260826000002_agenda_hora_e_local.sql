-- ============================================================
-- Hora marcada, local da tarefa e apontamento sem sobreposicao
--
-- Especificacao: docs/rotinas/2-producao/01-agenda-de-pessoal.md
--                docs/rotinas/2-producao/05-apontamento-de-tarefas.md
-- Requisitos: RF-82, RF-100, RF-109 a RF-113
-- Regras: RN-48 (emendada), RN-83, RN-95, RN-97
-- Entidades: C8 `assignments`, `task_executions`
--
-- TRES COISAS QUE O PROTOTIPO DA AGENDA DO DIA REVELOU, e as tres sao do mesmo
-- assunto: a tela deixou de ser cartao e virou linha do tempo, e linha do tempo
-- precisa de hora.
--
-- 1. A HORA E ACRESCIMO SOBRE O TURNO, NAO SUBSTITUICAO DELE. `shift_id`
--    continua NOT NULL, e e isso que preserva a RN-48: o viveiro segue
--    planejando por turno, e a hora aparece so onde ela existe de verdade, que
--    e na tarefa recorrente (RN-95) e no apontamento.
--
-- 2. O CAMPO "AREA" DO FORMULARIO NAO TINHA ONDE SER GRAVADO. `assignments` e
--    `task_executions` tinham lote, especie e recipiente, e nada de lugar.
--    "Irrigacao" nao exige lote (`requires_batch = FALSE`), de modo que ate
--    aqui nao havia como registrar ONDE ela foi feita.
--
-- 3. "ESCOLHER HORARIO" ABRIA UM BURACO NA RN-83. O indice unico parcial so
--    impede dois apontamentos ABERTOS para a mesma pessoa. Com horario
--    informado, dois FECHADOS podem se sobrepor (07h-11h e 09h-12h) e contar a
--    mesma hora duas vezes, inflando exatamente o numero que o custeio existe
--    para apurar.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

-- ------------------------------------------------------------
-- O planejado: hora opcional e lugar opcional
-- ------------------------------------------------------------
ALTER TABLE assignments
  ADD COLUMN start_time TIME,
  ADD COLUMN end_time   TIME,
  ADD COLUMN area_id    UUID REFERENCES areas(id),
  ADD COLUMN bed_id     UUID REFERENCES beds(id),

  -- Meia hora nao existe: ou a atribuicao declara a janela inteira, ou nao
  -- declara nenhuma e vale o turno. Uma so das duas colunas preenchida seria
  -- uma barra sem fim no Gantt.
  ADD CONSTRAINT assignments_hora_completa
    CHECK ((start_time IS NULL) = (end_time IS NULL)),

  ADD CONSTRAINT assignments_hora_coerente
    CHECK (end_time IS NULL OR end_time > start_time);

-- NAO SE EXIGE QUE A JANELA CAIBA DENTRO DO TURNO. A carga de terra que chega
-- as 11h40 atravessa o almoco, e uma trava aqui faria registrar hora errada
-- para conseguir registrar alguma coisa. O turno continua sendo a rede de
-- protecao de RF-100, nao um limite fisico do dia.

COMMENT ON COLUMN assignments.start_time IS
  'Hora de inicio, quando a atribuicao a declara. Nula = vale o turno inteiro (RN-48, RN-95).';
COMMENT ON COLUMN assignments.end_time IS
  'Hora de fim, quando a atribuicao a declara. Nula = vale o turno inteiro (RN-48, RN-95).';
COMMENT ON COLUMN assignments.area_id IS
  'Area da tarefa que nao exige lote. Tarefa com lote herda o lugar dele (RF-113).';
COMMENT ON COLUMN assignments.bed_id IS
  'Canteiro da tarefa que nao exige lote. Tarefa com lote herda o lugar dele (RF-113).';

-- ------------------------------------------------------------
-- O realizado: lugar opcional
-- ------------------------------------------------------------
ALTER TABLE task_executions
  ADD COLUMN area_id UUID REFERENCES areas(id),
  ADD COLUMN bed_id  UUID REFERENCES beds(id);

-- LUGAR E LOTE NAO SAO REDUNDANTES: SAO ALTERNATIVOS. A tela apresenta area e
-- canteiro apenas quando o tipo de tarefa NAO exige lote (RF-82, RF-113).
-- Tarefa com lote ja carrega o canteiro por ele, e pedir os dois seria pedir a
-- mesma informacao duas vezes, que e como formulario de campo deixa de ser
-- preenchido.
COMMENT ON COLUMN task_executions.area_id IS
  'Area onde a tarefa foi feita, quando ela nao tem lote (RF-113).';
COMMENT ON COLUMN task_executions.bed_id IS
  'Canteiro onde a tarefa foi feita, quando ela nao tem lote (RF-113).';

-- ------------------------------------------------------------
-- RN-97: dois apontamentos da mesma pessoa nao se sobrepoem no tempo
-- ------------------------------------------------------------
-- `btree_gist` e o que permite combinar a igualdade de `party_id` com a
-- sobreposicao de intervalo numa restricao so. Existe no Postgres local e no
-- Neon, e nao exige privilegio especial.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- `COALESCE(ended_at, 'infinity')`: o apontamento ABERTO ocupa dali ate o fim
-- dos tempos, de modo que a mesma restricao cobre os dois casos, o par de
-- fechados sobrepostos e o par de abertos.
--
-- E RESTRICAO DE BANCO, e nao validacao de tela, pelo mesmo motivo da RN-83:
-- duas telas abertas ao mesmo tempo burlariam a validacao, e o resultado seria
-- hora contada em dobro no custo de mao de obra.
ALTER TABLE task_executions
  ADD CONSTRAINT task_executions_sem_sobreposicao
  EXCLUDE USING gist (
    party_id WITH =,
    tstzrange(started_at, COALESCE(ended_at, 'infinity'::timestamptz)) WITH &&
  );

-- O INDICE `task_executions_um_aberto_por_pessoa` FICA. A restricao acima ja o
-- cobre, mas e ele que C6 e C8 citam como a garantia da RN-83, e uma segunda
-- barreira sobre o caso mais comum nao custa nada: derruba-lo trocaria uma
-- mensagem de erro conhecida por outra, sem ganho.

COMMENT ON CONSTRAINT task_executions_sem_sobreposicao ON task_executions IS
  'RN-97: intervalos de uma mesma pessoa nao se sobrepoem. Cobre tambem o par de apontamentos abertos.';
