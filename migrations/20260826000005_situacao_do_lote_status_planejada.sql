-- ============================================================
-- Correcao: tarefa confirmada nao e pendencia
--
-- Especificacao: docs/rotinas/2-producao/04-lotes-e-canteiros.md
-- Requisitos: RF-74, RF-75, RF-118, RF-119 · Regras: RN-51, RN-93
-- Entidade: C8 `batch_health` (visao)
--
-- A VERSAO ANTERIOR EXCLUIA UM STATUS E DEIXAVA PASSAR OUTRO. O filtro era
-- `a.status <> 'nao_confirmada'`, escrito para impedir que a semana fechada
-- deixasse um vermelho permanente atras de si. So que `assignments.status`
-- admite TRES valores, e `confirmada` continuava entrando como pendencia.
--
-- `confirmada` E A TAREFA QUE O COLABORADOR DEU POR CONCLUIDA (RF-74). O lote
-- ficaria colorido por um servico que foi feito, e bastaria o caminho de
-- confirmacao nao gravar um `task_executions` com status `concluida` para a
-- cor nunca mais sair. Erro silencioso: a tela nao acusaria nada, so mostraria
-- o viveiro pior do que ele esta, ate deixar de ser olhada.
--
-- A CONDICAO CERTA E POSITIVA, E NAO NEGATIVA: pendencia e o que continua
-- `planejada`, e so isso. Os outros dois saem por motivos diferentes, e e por
-- isso que enumera-los pela exclusao era fragil:
--   `confirmada`      foi feita, e alguem disse que foi (RF-74)
--   `nao_confirmada`  foi assumida como feita no fechamento (RF-75, RN-51)
--
-- CREATE OR REPLACE, e nao edicao da 20260826000004: migration aplicada nao se
-- reescreve, mesmo recem-aplicada. A visao inteira e repetida porque
-- CREATE OR REPLACE VIEW exige o corpo completo.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

CREATE OR REPLACE VIEW batch_health AS
WITH limites AS (
  SELECT
    (SELECT value::INTEGER FROM settings WHERE key = 'producao.atraso_atencao_dias') AS atencao,
    (SELECT value::INTEGER FROM settings WHERE key = 'producao.atraso_critico_dias') AS critico
)
SELECT
  b.id       AS batch_id,
  b.code     AS batch_code,
  b.bed_id,
  b.position,
  pendente.assignment_id   AS pending_assignment_id,
  pendente.task_type_id    AS pending_task_type_id,
  pendente.task_name       AS pending_task_name,
  pendente.work_date       AS pending_since,
  COALESCE(pendente.days_late, 0) AS days_late,
  CASE
    WHEN pendente.days_late IS NULL      THEN 'saudavel'
    WHEN pendente.days_late >= l.critico THEN 'critico'
    WHEN pendente.days_late >= l.atencao THEN 'atencao'
    ELSE 'saudavel'
  END AS health
FROM batches b
CROSS JOIN limites l

-- A MAIS ANTIGA MANDA. Havendo tres pendencias no lote, quem determina a cor e
-- a que espera ha mais tempo, e e ela que o hover mostra (RF-119): resolver a
-- mais antiga e a providencia que o mapa esta pedindo.
LEFT JOIN LATERAL (
  SELECT a.id           AS assignment_id,
         a.task_type_id,
         tt.name        AS task_name,
         a.work_date,
         (CURRENT_DATE - a.work_date)::INTEGER AS days_late
    FROM assignments a
    JOIN task_types tt ON tt.id = a.task_type_id
   WHERE a.batch_id = b.id
     AND a.work_date <= CURRENT_DATE

     -- Pendencia e o que segue PLANEJADO, e nada mais. Ver o cabecalho: a
     -- condicao e positiva de proposito, porque enumerar pela exclusao ja
     -- deixou `confirmada` passar uma vez.
     AND a.status = 'planejada'

     AND NOT EXISTS (
       SELECT 1 FROM task_executions te
        WHERE te.assignment_id = a.id
          AND te.status = 'concluida'
     )
   ORDER BY a.work_date
   LIMIT 1
) pendente ON TRUE

-- Lote encerrado nao esta em canteiro nenhum e nao aparece no mapa (RN-79).
WHERE b.closed_at IS NULL;

COMMENT ON VIEW batch_health IS
  'Situacao do lote aberto, derivada do atraso das tarefas ainda planejadas para ele. Nunca digitada (RN-93).';
