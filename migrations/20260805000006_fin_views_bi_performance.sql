-- Migration: 20260805000006_fin_views_bi_performance.sql
-- Descricao: Reescreve vw_bi_cobertura e vw_bi_dre_anual sem subqueries
--            correlacionadas. Mesmos numeros, mesmas colunas, ~200x mais rapido.
--
-- O PROBLEMA
-- A home /financeiro levava ~11s para abrir. Medido query a query, o custo
-- inteiro estava em vw_bi_dre_anual (10,7s) e, em menor escala, em
-- vw_bi_cobertura (0,5s — que roda no layout, ou seja, em TODA tela do modulo).
--
-- As duas views usavam subquery escalar correlacionada por linha:
--   COALESCE((SELECT SUM(d.valor_negocio) FROM financeiro.vw_bi_despesa_mensal d
--              WHERE d.ano = c.ano), 0)
-- Como vw_bi_despesa_mensal e uma view (nao uma tabela), nao ha indice para o
-- WHERE d.ano = c.ano: cada uma dessas subqueries re-varre vw_bi_despesas
-- inteira — 60k linhas, 3 LEFT JOINs de rateio e um EXTRACT por linha — e so
-- depois joga fora tudo que nao e do ano. Eram 13 subqueries dessas x 7 anos,
-- mais as re-execucoes de vw_bi_cobertura dentro dos LEAST(): ~150 varreduras
-- completas da base de despesas para produzir 7 linhas.
--
-- A CORRECAO
-- Agregar uma vez em CTE (rec/desp por ano+mes, ~80 linhas cada) e recortar as
-- janelas com FILTER em cima desse resultado ja pequeno. Nenhuma regra de
-- negocio muda: os cortes YTD/comparavel, o piso de lancamentos por mes e a
-- semantica de "completo" sao os mesmos — so deixam de ser recalculados N vezes.
--
-- CREATE OR REPLACE (e nao DROP/CREATE) e proposital aqui: garante em tempo de
-- migracao que a lista de colunas ficou identica a anterior, que e exatamente o
-- contrato que esta reescrita promete nao quebrar.

BEGIN;

DO $$
BEGIN
  IF to_regnamespace('financeiro') IS NULL THEN
    RAISE NOTICE 'schema financeiro ausente — migracao ignorada (rode scripts/import-financeiro.ps1)';
    RETURN;
  END IF;

  -- ===========================================================================
  -- vw_bi_cobertura — a view da honestidade (semantica inalterada).
  --
  -- `meses_faltantes` = meses sem lancamento de verdade (ver
  -- bi_min_lancamentos_mes), ate o limite: para anos passados, 12; para o ano
  -- corrente, o mes anterior ao atual — o mes em curso nao esta "faltando",
  -- esta em andamento.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_cobertura AS
  WITH anos AS (
    SELECT generate_series(
      financeiro.bi_ano_minimo(),
      EXTRACT(YEAR FROM CURRENT_DATE)::int
    ) AS ano
  ),
  limites AS (
    SELECT a.ano,
           CASE WHEN a.ano = EXTRACT(YEAR FROM CURRENT_DATE)::int
                THEN GREATEST(EXTRACT(MONTH FROM CURRENT_DATE)::int - 1, 0)
                ELSE 12 END AS mes_limite
    FROM anos a
  ),
  -- Uma unica varredura de vw_bi_despesas para tudo que segue.
  desp AS MATERIALIZED (
    SELECT ano_ref AS ano, mes_ref AS mes,
           COUNT(*) FILTER (WHERE valor > 0)   AS lancamentos,
           MAX(data_ref) FILTER (WHERE valor > 0) AS ultima_data
    FROM financeiro.vw_bi_despesas GROUP BY 1, 2
  ),
  -- Um mes "lancado" precisa de massa, nao de uma linha solta.
  desp_ano AS (
    SELECT ano,
           -- ultima_data olha o ano inteiro, inclusive meses abaixo do piso:
           -- e "quando foi o ultimo lancamento", nao "ate onde o ano fecha".
           MAX(ultima_data)                                                  AS ultima_data_despesa,
           COUNT(*) FILTER (WHERE lancamentos >= financeiro.bi_min_lancamentos_mes())::int AS meses_despesa,
           MAX(mes) FILTER (WHERE lancamentos >= financeiro.bi_min_lancamentos_mes())      AS ultimo_mes_despesa,
           COALESCE(
             array_agg(mes) FILTER (WHERE lancamentos >= financeiro.bi_min_lancamentos_mes()),
             ARRAY[]::int[]
           ) AS meses_ok
    FROM desp GROUP BY 1
  ),
  rec_ano AS (
    SELECT ano,
           COUNT(*) FILTER (WHERE receita > 0)::int AS meses_receita,
           MAX(mes) FILTER (WHERE receita > 0)      AS ultimo_mes_receita
    FROM (
      SELECT ano, mes, SUM(receita) AS receita
      FROM financeiro.vw_bi_receita_mensal GROUP BY 1, 2
    ) r
    GROUP BY 1
  )
  SELECT
    l.ano,
    l.mes_limite,
    COALESCE(rc.meses_receita, 0) AS meses_receita,
    rc.ultimo_mes_receita,
    COALESCE(dp.meses_despesa, 0) AS meses_despesa,
    dp.ultimo_mes_despesa,
    dp.ultima_data_despesa,
    f.meses_faltantes,
    -- Janela segura de comparacao ano a ano: ate onde as DUAS series existem.
    LEAST(
      COALESCE(rc.ultimo_mes_receita, 0),
      COALESCE(dp.ultimo_mes_despesa, 0)
    ) AS meses_comparaveis,
    -- Ano so e "completo" se nao falta mes E ja terminou.
    (cardinality(f.meses_faltantes) = 0
     AND l.ano < EXTRACT(YEAR FROM CURRENT_DATE)::int) AS completo
  FROM limites l
  LEFT JOIN desp_ano dp ON dp.ano = l.ano
  LEFT JOIN rec_ano  rc ON rc.ano = l.ano
  -- generate_series de no maximo 12 elementos por ano: custo irrelevante.
  CROSS JOIN LATERAL (
    SELECT COALESCE(array_agg(m ORDER BY m), ARRAY[]::int[]) AS meses_faltantes
    FROM generate_series(1, l.mes_limite) AS m
    WHERE NOT (m = ANY (COALESCE(dp.meses_ok, ARRAY[]::int[])))
  ) f;

  COMMENT ON VIEW financeiro.vw_bi_cobertura IS
    'Quais meses de despesa faltam lancar, por ano. Dirige todo aviso de periodo parcial na UI.';

  -- ===========================================================================
  -- vw_bi_dre_anual — com gemeos YTD (semantica inalterada).
  --
  -- Os campos *_ytd cortam os dois anos na mesma janela de meses, para que 2026
  -- (jan-abr de despesa) seja comparado com jan-abr de 2025 e nao com o ano
  -- cheio. `margem_pct` fica NULL em ano incompleto: melhor um travessao na tela
  -- do que um 79% que nao existe.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_dre_anual AS
  -- MATERIALIZED explicito: `cob` e referenciada duas vezes (o self-join que
  -- monta a janela), e sem isso o planner poderia executar vw_bi_cobertura
  -- duas vezes.
  WITH cob AS MATERIALIZED (SELECT * FROM financeiro.vw_bi_cobertura),
  rec AS MATERIALIZED (
    SELECT ano, mes, SUM(receita) AS receita
    FROM financeiro.vw_bi_receita_mensal GROUP BY 1, 2
  ),
  desp AS MATERIALIZED (
    SELECT ano, mes,
           SUM(valor)          AS valor,
           SUM(valor_negocio)  AS valor_negocio,
           SUM(valor_pessoal)  AS valor_pessoal
    FROM financeiro.vw_bi_despesa_mensal GROUP BY 1, 2
  ),
  -- Janela de comparacao = intersecao das janelas dos DOIS anos.
  -- So recortar o ano atual nao basta: 2025 e completo, mas 2024 perde
  -- set-dez, e comparar 2025 inteiro com 2024 "inteiro" devolveria a margem
  -- falsa de 73,4% como base. Com a intersecao, os dois lados olham jan-ago.
  janela AS (
    SELECT c.*,
           LEAST(c.meses_comparaveis, COALESCE(cp.meses_comparaveis, 12)) AS janela_comp
    FROM cob c
    LEFT JOIN cob cp ON cp.ano = c.ano - 1
  ),
  -- Um join por fonte, com os recortes expressos em FILTER. O join traz o ano
  -- corrente E o anterior (ano - 1) porque o par comparavel precisa dos dois
  -- lados na mesma linha.
  receita_ano AS (
    SELECT j.ano,
      COALESCE(SUM(r.receita) FILTER (WHERE r.ano = j.ano), 0) AS receita,
      COALESCE(SUM(r.receita) FILTER (WHERE r.ano = j.ano AND r.mes <= j.meses_comparaveis), 0) AS receita_ytd,
      COALESCE(SUM(r.receita) FILTER (WHERE r.ano = j.ano AND r.mes <= j.janela_comp), 0) AS receita_comp,
      COALESCE(SUM(r.receita) FILTER (WHERE r.ano = j.ano - 1 AND r.mes <= j.janela_comp), 0) AS receita_comp_anterior
    FROM janela j
    LEFT JOIN rec r ON r.ano IN (j.ano, j.ano - 1)
    GROUP BY j.ano
  ),
  despesa_ano AS (
    SELECT j.ano,
      COALESCE(SUM(d.valor_negocio) FILTER (WHERE d.ano = j.ano), 0) AS despesa_negocio,
      COALESCE(SUM(d.valor_pessoal) FILTER (WHERE d.ano = j.ano), 0) AS despesa_pessoal,
      COALESCE(SUM(d.valor)         FILTER (WHERE d.ano = j.ano), 0) AS despesa_total,
      COALESCE(SUM(d.valor_negocio) FILTER (WHERE d.ano = j.ano AND d.mes <= j.meses_comparaveis), 0) AS despesa_ytd,
      COALESCE(SUM(d.valor_negocio) FILTER (WHERE d.ano = j.ano AND d.mes <= j.janela_comp), 0) AS despesa_comp,
      COALESCE(SUM(d.valor_negocio) FILTER (WHERE d.ano = j.ano - 1 AND d.mes <= j.janela_comp), 0) AS despesa_comp_anterior
    FROM janela j
    LEFT JOIN desp d ON d.ano IN (j.ano, j.ano - 1)
    GROUP BY j.ano
  ),
  agg AS (
    SELECT
      j.ano, j.completo, j.meses_comparaveis, j.meses_faltantes,
      j.ultimo_mes_despesa, j.ultimo_mes_receita, j.ultima_data_despesa,
      j.janela_comp,
      r.receita, d.despesa_negocio, d.despesa_pessoal, d.despesa_total,
      r.receita_ytd, d.despesa_ytd,
      r.receita_comp, d.despesa_comp,
      r.receita_comp_anterior, d.despesa_comp_anterior
    FROM janela j
    JOIN receita_ano r ON r.ano = j.ano
    JOIN despesa_ano d ON d.ano = j.ano
  )
  SELECT
    a.*,
    a.receita - a.despesa_negocio AS resultado,
    a.receita_ytd - a.despesa_ytd AS resultado_ytd,
    a.receita_comp - a.despesa_comp AS resultado_comp,
    a.receita_comp_anterior - a.despesa_comp_anterior AS resultado_comp_anterior,
    -- Margem anual so existe em ano completo. Em 2024 e 2026 o travessao na tela
    -- e o resultado correto: a margem cheia desses anos (74,1% e 79,2%) e um
    -- artefato de ter receita ate o fim e despesa pela metade.
    CASE WHEN a.completo AND a.receita > 0
         THEN ROUND(100.0 * (a.receita - a.despesa_negocio) / a.receita, 1) END AS margem_pct,
    -- Margem da janela propria do ano (quanto rendeu ate onde ha dado).
    CASE WHEN a.receita_ytd > 0
         THEN ROUND(100.0 * (a.receita_ytd - a.despesa_ytd) / a.receita_ytd, 1) END AS margem_ytd_pct,
    -- Par comparavel, os dois lados na mesma janela.
    CASE WHEN a.receita_comp > 0
         THEN ROUND(100.0 * (a.receita_comp - a.despesa_comp) / a.receita_comp, 1) END AS margem_comp_pct,
    CASE WHEN a.receita_comp_anterior > 0
         THEN ROUND(100.0 * (a.receita_comp_anterior - a.despesa_comp_anterior)
                    / a.receita_comp_anterior, 1) END AS margem_comp_anterior_pct,
    CASE WHEN a.receita_comp_anterior > 0
         THEN ROUND(100.0 * (a.receita_comp - a.receita_comp_anterior)
                    / a.receita_comp_anterior, 1) END AS var_receita_comp_pct,
    CASE WHEN a.despesa_comp_anterior > 0
         THEN ROUND(100.0 * (a.despesa_comp - a.despesa_comp_anterior)
                    / a.despesa_comp_anterior, 1) END AS var_despesa_comp_pct
  FROM agg a;
END $$;

COMMIT;
