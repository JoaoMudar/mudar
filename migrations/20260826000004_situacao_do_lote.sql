-- ============================================================
-- Situacao do lote: saudavel, atencao, critico
--
-- Especificacao: docs/rotinas/2-producao/04-lotes-e-canteiros.md
-- Requisitos: RF-117 a RF-120 · Regras: RN-93, RN-94
-- Entidades: C8 `batch_health` (visao), `settings`
--
-- E VISAO, E NAO COLUNA (RN-93). Status gravado envelhece sozinho: o lote que
-- estava verde ontem continuaria verde no banco hoje, e a tela existe
-- justamente para dizer o contrario. E a mesma razao de `input_stock_balance`
-- e `species_unit_cost` nao serem tabelas.
--
-- A COR SAI DO ATRASO DE TAREFA, e de nada mais. Mortalidade e previsao de
-- disponibilidade tem alerta proprio (RF-29, RF-90); somar tudo numa cor so
-- produziria um vermelho que nao diz o que fazer. O que o hover mostra e uma
-- acao pendente: "Irrigacao, atrasada 3 dias".
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

-- Os limites sao PARAMETRO, nao literal na visao (RN-94): mudam com a estacao e
-- com a tarefa, pelo mesmo motivo do periodo de trabalho (RN-85). Zero em
-- "atencao" significa que a tarefa que vence hoje ja pinta de amarelo.
INSERT INTO settings (key, value, value_type, description) VALUES
  ('producao.atraso_atencao_dias', '0', 'numero',
   'Dias de atraso a partir dos quais o lote fica em atencao (RN-93, RN-94)'),
  ('producao.atraso_critico_dias', '3', 'numero',
   'Dias de atraso a partir dos quais o lote fica critico (RN-93, RN-94)');

-- Assercao: os dois parametros tem de existir, porque a visao os le. Sem eles a
-- subconsulta devolveria nulo e TODO lote apareceria como saudavel, que e a
-- falha silenciosa mais cara possivel nesta tela.
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM settings
   WHERE key IN ('producao.atraso_atencao_dias', 'producao.atraso_critico_dias');
  IF n <> 2 THEN
    RAISE EXCEPTION 'esperados 2 parametros de atraso, encontrados %', n;
  END IF;
END $$;

CREATE VIEW batch_health AS
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

     -- Tarefa dada como realizada no fechamento da semana (RF-75, RN-51) para
     -- de ser pendencia. Sem esta linha, toda semana fechada deixaria um
     -- vermelho permanente atras de si, e o mapa inteiro ficaria vermelho ate
     -- deixar de ser olhado.
     AND a.status <> 'nao_confirmada'

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
  'Situacao do lote aberto, derivada do atraso das tarefas planejadas para ele. Nunca digitada (RN-93).';
