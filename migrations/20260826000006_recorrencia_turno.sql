-- ============================================================
-- Correcao: a recorrencia precisa declarar o turno
--
-- Especificacao: docs/rotinas/2-producao/01-agenda-de-pessoal.md (decisao 3)
-- Requisitos: RF-114, RF-115 · Regras: RN-48, RN-95
-- Entidade: C8 `task_recurrences`
--
-- A OCORRENCIA GERADA NAO TINHA DE ONDE TIRAR O TURNO. `assignments.shift_id`
-- e NOT NULL desde 20260824000005, e a recorrencia nascia so com hora de
-- inicio e fim: RF-115 manda gerar a atribuicao sem digitacao, e a geracao
-- travaria na primeira tentativa.
--
-- E A HORA NAO RESOLVE SOZINHA. Os turnos cadastrados sao 07:00-11:00 e
-- 13:00-17:00, com o almoco no meio. Uma recorrencia das 11:30 as 12:30, a
-- carga de terra que chega no fim da manha, NAO CAI EM TURNO NENHUM: derivar o
-- turno da hora exigiria escolher entre errar e recusar, e as duas saidas sao
-- piores do que perguntar.
--
-- QUEM RESPONDE E A GERENCIA, e a pergunta e simples: esta rotina conta como
-- manha ou como tarde? O turno vira o que a ocorrencia herda; a hora continua
-- sendo o que desenha a barra na linha do tempo (RN-95). RN-48 fica inteira:
-- todo planejamento tem turno, inclusive o recorrente.
--
-- NOT NULL DIRETO, SEM DEFAULT E SEM BACKFILL: a tabela nasceu vazia em
-- 20260826000003 e nenhuma tela escreve nela ainda. Um DEFAULT aqui escolheria
-- um turno por todas as regras futuras, que e exatamente a escolha que esta
-- migration existe para nao fazer.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

-- Assercao ANTES do ALTER: se houver linha, o NOT NULL falharia no meio e o
-- motivo apareceria como erro de constraint, e nao como o que e, uma regra que
-- precisa de turno atribuido a mao.
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM task_recurrences;
  IF n <> 0 THEN
    RAISE EXCEPTION
      'task_recurrences tem % linha(s): defina o turno de cada uma antes desta migration', n;
  END IF;
END $$;

ALTER TABLE task_recurrences
  ADD COLUMN shift_id UUID NOT NULL REFERENCES work_shifts(id);

CREATE INDEX task_recurrences_turno_idx ON task_recurrences(shift_id);

COMMENT ON COLUMN task_recurrences.shift_id IS
  'Turno que a ocorrencia gerada herda (RN-48). A hora fica em start_time/end_time e desenha a barra (RN-95).';
