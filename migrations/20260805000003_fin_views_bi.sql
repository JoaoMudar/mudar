-- Migration: 20260805000003_fin_views_bi.sql
-- Descricao: Camada analitica vw_bi_* do BI financeiro (P12 Fase 1).
--
-- POR QUE VIEWS NOVAS EM VEZ DE ALTERAR AS ANTIGAS
-- O readmeBI.md declara as views vw_* existentes como "o contrato do BI" e manda
-- apontar Metabase/Power BI para elas. Trocar vw_dre_anual por baixo quebraria
-- esses consumidores e tornaria impossivel responder "por que 2025 mudou?".
-- As duas familias convivem, da para reconciliar linha a linha, e as antigas
-- ficam marcadas como legado ate a data de depreciacao.
--
-- AS QUATRO REGRAS QUE TODA VIEW DAQUI RESPEITA
--   1. eh_totalizador = FALSE. 2.554 linhas sao subtotais herdados do Excel;
--      inclui-las infla a despesa ~4x (R$21,5M fantasma sobre R$6,99M reais).
--   2. excluido_em IS NULL. Soft delete — livro-caixa nao faz DELETE.
--   3. ano_ref >= bi_ano_minimo(). Antes de 2020 o dado nao tem qualidade.
--   4. Negocio x pessoal sai da CATEGORIA + rateio, nunca de despesas.natureza,
--      que esta furada nos dois sentidos. Ver src/lib/bi-rateio.ts.

BEGIN;

DO $$
BEGIN
  IF to_regnamespace('financeiro') IS NULL THEN
    RAISE NOTICE 'schema financeiro ausente — migracao ignorada (rode scripts/import-financeiro.ps1)';
    RETURN;
  END IF;

  -- Fonte unica do corte temporal. Funcao em vez de literal espalhado para que
  -- mudar a janela do BI seja uma linha, nao um grep por 11 views.
  CREATE OR REPLACE FUNCTION financeiro.bi_ano_minimo() RETURNS INT
    LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $f$ SELECT 2020 $f$;

  -- Quantos lancamentos um mes precisa ter para contar como "lancado".
  --
  -- Nao basta testar valor > 0: os meses abandonados de 2024 e 2026 tem 1 a 4
  -- linhas residuais de ~R$53 (recorrencias que a planilha arrastava), e isso
  -- faria um mes vazio passar por preenchido — justo o erro que a tela de
  -- preenchimento existe para evitar. Um mes de verdade nesta base tem de 60 a
  -- 230 lancamentos, entao 5 e um piso folgado e nao arbitrario.
  CREATE OR REPLACE FUNCTION financeiro.bi_min_lancamentos_mes() RETURNS INT
    LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $f$ SELECT 5 $f$;

  -- Dropar antes de recriar em vez de confiar so no CREATE OR REPLACE: este
  -- ultimo exige lista de colunas identica, entao acrescentar uma coluna a uma
  -- view ja existente falharia. Dropando, a migracao fica re-executavel de
  -- verdade. Nenhuma ferramenta externa aponta para as vw_bi_* (o contrato
  -- publicado no readmeBI.md sao as vw_* antigas, que nao sao tocadas aqui).
  DROP VIEW IF EXISTS
    financeiro.vw_bi_qualidade,
    financeiro.vw_bi_conferencia_mensal,
    financeiro.vw_bi_pendencias,
    financeiro.vw_bi_vendas_geo,
    financeiro.vw_bi_vendas_especie_ano,
    financeiro.vw_bi_estrutura_custo,
    financeiro.vw_bi_dre_anual,
    financeiro.vw_bi_cobertura,
    financeiro.vw_bi_receita_mensal,
    financeiro.vw_bi_despesa_mensal,
    financeiro.vw_bi_despesas
  CASCADE;

  -- ===========================================================================
  -- 1. vw_bi_despesas — o fato base. Todo o resto deriva daqui.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_despesas AS
  WITH base AS (
    SELECT
      d.id, d.descricao, d.valor_total AS valor, d.quantidade, d.unidade,
      d.categoria_id, d.centro_custo, d.aba, d.fonte,
      d.origem_lancamento, d.criado_por, d.data AS data_lancada,
      d.ano AS ano_planilha, d.mes AS mes_planilha,
      -- EIXO DE TEMPO CANONICO
      -- `data` e a data real do documento e ganha quando e plausivel. Cai para
      -- o 1o dia de ano/mes quando `data` e nula (569 linhas) ou futura (3
      -- linhas) — datas futuras nao podem criar um balde 2026-11 no grafico.
      CASE
        WHEN d.data IS NOT NULL AND d.data <= CURRENT_DATE THEN d.data
        ELSE make_date(d.ano::int, d.mes::int, 1)
      END AS data_ref,
      -- Divergencia entre o eixo da planilha e a data do documento: 1.360
      -- linhas. Nao e corrigido em silencio, e exposto em vw_bi_qualidade.
      (d.data IS NOT NULL AND d.ano::int <> EXTRACT(YEAR FROM d.data)::int) AS eixo_divergente,
      (d.data IS NOT NULL AND d.data > CURRENT_DATE) AS data_futura,
      (d.valor_total = 0) AS zerado
    FROM financeiro.despesas d
    WHERE d.eh_totalizador = FALSE
      AND d.excluido_em IS NULL
  ),
  resolvido AS (
    SELECT
      b.*,
      c.nome AS categoria, c.grupo, c.natureza AS categoria_natureza,
      cc.natureza AS centro_natureza,
      -- Precedencia identica a resolverRateio() em src/lib/bi-rateio.ts.
      CASE
        WHEN c.natureza = 'negocio' THEN 100                              -- ramo 1
        WHEN c.natureza = 'pessoal' THEN 0                                -- ramo 2
        WHEN c.natureza = 'misto'   THEN                                  -- ramo 3
          COALESCE(rc_centro.pct_negocio, rc_padrao.pct_negocio, 50)
        WHEN b.categoria_id IS NULL AND cc.natureza IS NOT NULL THEN      -- ramo 4
          CASE cc.natureza WHEN 'negocio' THEN 100 WHEN 'pessoal' THEN 0 ELSE 50 END
        ELSE NULL                                                          -- ramo 5
      END AS pct_negocio,
      CASE
        WHEN c.natureza = 'negocio' THEN 'categoria_negocio'
        WHEN c.natureza = 'pessoal' THEN 'categoria_pessoal'
        WHEN c.natureza = 'misto' AND rc_centro.pct_negocio IS NOT NULL THEN 'rateio_centro'
        WHEN c.natureza = 'misto' AND rc_padrao.pct_negocio IS NOT NULL THEN 'rateio_padrao'
        WHEN c.natureza = 'misto' THEN 'rateio_fallback'
        WHEN b.categoria_id IS NULL AND cc.natureza IS NOT NULL THEN 'centro_custo'
        ELSE 'sem_classificacao'
      END AS classificacao
    FROM base b
    LEFT JOIN financeiro.categorias_despesa c ON c.id = b.categoria_id
    LEFT JOIN financeiro.centros_custo cc     ON cc.nome = b.centro_custo
    -- Regra especifica do centro tem prioridade sobre a linha-padrao.
    LEFT JOIN financeiro.rateio_categoria rc_centro
           ON rc_centro.categoria_id = b.categoria_id
          AND rc_centro.centro_custo = b.centro_custo
    LEFT JOIN financeiro.rateio_categoria rc_padrao
           ON rc_padrao.categoria_id = b.categoria_id
          AND rc_padrao.centro_custo IS NULL
  )
  SELECT
    r.*,
    EXTRACT(YEAR  FROM r.data_ref)::int AS ano_ref,
    EXTRACT(MONTH FROM r.data_ref)::int AS mes_ref,
    -- valor_pessoal sai por subtracao (e nao por 100-pct) para garantir que
    -- negocio + pessoal = valor ao centavo. E o invariante do bi:sanity.
    ROUND(r.valor * r.pct_negocio / 100.0, 2) AS valor_negocio,
    r.valor - ROUND(r.valor * r.pct_negocio / 100.0, 2) AS valor_pessoal
  FROM resolvido r
  WHERE EXTRACT(YEAR FROM r.data_ref)::int >= financeiro.bi_ano_minimo();

  COMMENT ON VIEW financeiro.vw_bi_despesas IS
    'Fato base de despesa do BI. Ja aplica: sem totalizador, sem excluido, corte de ano e rateio negocio/pessoal por categoria.';

  -- ===========================================================================
  -- 2. vw_bi_despesa_mensal
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_despesa_mensal AS
  SELECT
    ano_ref AS ano, mes_ref AS mes,
    grupo, categoria, centro_custo, classificacao,
    COUNT(*)::int                        AS lancamentos,
    COUNT(*) FILTER (WHERE valor > 0)::int AS lancamentos_com_valor,
    SUM(valor)                           AS valor,
    SUM(valor_negocio)                   AS valor_negocio,
    SUM(valor_pessoal)                   AS valor_pessoal
  FROM financeiro.vw_bi_despesas
  GROUP BY 1, 2, 3, 4, 5, 6;

  -- ===========================================================================
  -- 3. vw_bi_receita_mensal — receita nao tem totalizador nem rateio.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_receita_mensal AS
  SELECT
    nf.ano::int AS ano, nf.mes::int AS mes, nf.origem,
    COUNT(*)::int      AS notas,
    SUM(nf.valor_total) AS receita,
    SUM(nf.valor_produtos) AS receita_produtos
  FROM financeiro.notas_fiscais nf
  WHERE nf.ano::int >= financeiro.bi_ano_minimo()
  GROUP BY 1, 2, 3;

  -- ===========================================================================
  -- 4. vw_bi_cobertura — a view da honestidade.
  --
  -- Existe por causa do defeito mais perigoso da base: a despesa de 2024 para em
  -- jul e a de 2026 em abr, enquanto a receita segue ate dez/2024 e jul/2026.
  -- Sem isto o painel exibe margem de 74,1% em 2024 e 79,2% em 2026 — numeros
  -- que nao existem. Tudo que fala de periodo parcial na UI le daqui.
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
  -- Um mes "lancado" precisa de massa, nao de uma linha solta.
  desp AS (
    SELECT ano_ref AS ano, mes_ref AS mes,
           SUM(valor) AS valor,
           COUNT(*) FILTER (WHERE valor > 0) AS lancamentos
    FROM financeiro.vw_bi_despesas GROUP BY 1, 2
  ),
  desp_ok AS (
    SELECT * FROM desp WHERE lancamentos >= financeiro.bi_min_lancamentos_mes()
  ),
  rec AS (
    SELECT ano, mes, SUM(receita) AS receita
    FROM financeiro.vw_bi_receita_mensal GROUP BY 1, 2
  )
  SELECT
    l.ano,
    l.mes_limite,
    (SELECT COUNT(*)::int FROM rec r WHERE r.ano = l.ano AND r.receita > 0)  AS meses_receita,
    (SELECT MAX(r.mes)    FROM rec r WHERE r.ano = l.ano AND r.receita > 0)  AS ultimo_mes_receita,
    (SELECT COUNT(*)::int FROM desp_ok d WHERE d.ano = l.ano)                AS meses_despesa,
    (SELECT MAX(d.mes)    FROM desp_ok d WHERE d.ano = l.ano)                AS ultimo_mes_despesa,
    (SELECT MAX(v.data_ref) FROM financeiro.vw_bi_despesas v
      WHERE v.ano_ref = l.ano AND v.valor > 0)                               AS ultima_data_despesa,
    COALESCE((
      SELECT array_agg(m ORDER BY m)
      FROM generate_series(1, l.mes_limite) AS m
      WHERE NOT EXISTS (SELECT 1 FROM desp_ok d WHERE d.ano = l.ano AND d.mes = m)
    ), ARRAY[]::int[])                                                       AS meses_faltantes,
    -- Janela segura de comparacao ano a ano: ate onde as DUAS series existem.
    LEAST(
      COALESCE((SELECT MAX(r.mes) FROM rec r     WHERE r.ano = l.ano AND r.receita > 0), 0),
      COALESCE((SELECT MAX(d.mes) FROM desp_ok d WHERE d.ano = l.ano), 0)
    )                                                                        AS meses_comparaveis,
    -- Ano so e "completo" se nao falta mes E ja terminou.
    (NOT EXISTS (
       SELECT 1 FROM generate_series(1, l.mes_limite) AS m
       WHERE NOT EXISTS (SELECT 1 FROM desp_ok d WHERE d.ano = l.ano AND d.mes = m)
     ) AND l.ano < EXTRACT(YEAR FROM CURRENT_DATE)::int)                     AS completo
  FROM limites l;

  COMMENT ON VIEW financeiro.vw_bi_cobertura IS
    'Quais meses de despesa faltam lancar, por ano. Dirige todo aviso de periodo parcial na UI.';

  -- ===========================================================================
  -- 5. vw_bi_dre_anual — com gemeos YTD.
  --
  -- Os campos *_ytd cortam os dois anos na mesma janela de meses, para que 2026
  -- (jan-abr de despesa) seja comparado com jan-abr de 2025 e nao com o ano
  -- cheio. `margem_pct` fica NULL em ano incompleto: melhor um travessao na tela
  -- do que um 79% que nao existe.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_dre_anual AS
  WITH cob AS (SELECT * FROM financeiro.vw_bi_cobertura),
  agg AS (
    SELECT
      c.ano, c.completo, c.meses_comparaveis, c.meses_faltantes,
      c.ultimo_mes_despesa, c.ultimo_mes_receita, c.ultima_data_despesa,
      -- Janela de comparacao = intersecao das janelas dos DOIS anos.
      -- So recortar o ano atual nao basta: 2025 e completo, mas 2024 perde
      -- set-dez, e comparar 2025 inteiro com 2024 "inteiro" devolveria a margem
      -- falsa de 73,4% como base. Com a intersecao, os dois lados olham jan-ago.
      LEAST(
        c.meses_comparaveis,
        COALESCE((SELECT c2.meses_comparaveis FROM cob c2 WHERE c2.ano = c.ano - 1), 12)
      ) AS janela_comp,
      COALESCE((SELECT SUM(r.receita) FROM financeiro.vw_bi_receita_mensal r
                 WHERE r.ano = c.ano), 0) AS receita,
      COALESCE((SELECT SUM(d.valor_negocio) FROM financeiro.vw_bi_despesa_mensal d
                 WHERE d.ano = c.ano), 0) AS despesa_negocio,
      COALESCE((SELECT SUM(d.valor_pessoal) FROM financeiro.vw_bi_despesa_mensal d
                 WHERE d.ano = c.ano), 0) AS despesa_pessoal,
      COALESCE((SELECT SUM(d.valor) FROM financeiro.vw_bi_despesa_mensal d
                 WHERE d.ano = c.ano), 0) AS despesa_total,
      COALESCE((SELECT SUM(r.receita) FROM financeiro.vw_bi_receita_mensal r
                 WHERE r.ano = c.ano AND r.mes <= c.meses_comparaveis), 0) AS receita_ytd,
      COALESCE((SELECT SUM(d.valor_negocio) FROM financeiro.vw_bi_despesa_mensal d
                 WHERE d.ano = c.ano AND d.mes <= c.meses_comparaveis), 0) AS despesa_ytd,
      -- Par comparavel: os dois anos recortados na MESMA janela (janela_comp).
      -- Fica na view e nao na tela porque toda tela que compara precisa disso.
      COALESCE((SELECT SUM(r.receita) FROM financeiro.vw_bi_receita_mensal r
                 WHERE r.ano = c.ano AND r.mes <= LEAST(
                   c.meses_comparaveis,
                   COALESCE((SELECT c2.meses_comparaveis FROM cob c2 WHERE c2.ano = c.ano - 1), 12)
                 )), 0) AS receita_comp,
      COALESCE((SELECT SUM(d.valor_negocio) FROM financeiro.vw_bi_despesa_mensal d
                 WHERE d.ano = c.ano AND d.mes <= LEAST(
                   c.meses_comparaveis,
                   COALESCE((SELECT c2.meses_comparaveis FROM cob c2 WHERE c2.ano = c.ano - 1), 12)
                 )), 0) AS despesa_comp,
      COALESCE((SELECT SUM(r.receita) FROM financeiro.vw_bi_receita_mensal r
                 WHERE r.ano = c.ano - 1 AND r.mes <= LEAST(
                   c.meses_comparaveis,
                   COALESCE((SELECT c2.meses_comparaveis FROM cob c2 WHERE c2.ano = c.ano - 1), 12)
                 )), 0) AS receita_comp_anterior,
      COALESCE((SELECT SUM(d.valor_negocio) FROM financeiro.vw_bi_despesa_mensal d
                 WHERE d.ano = c.ano - 1 AND d.mes <= LEAST(
                   c.meses_comparaveis,
                   COALESCE((SELECT c2.meses_comparaveis FROM cob c2 WHERE c2.ano = c.ano - 1), 12)
                 )), 0) AS despesa_comp_anterior
    FROM cob c
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

  -- ===========================================================================
  -- 6. vw_bi_estrutura_custo — a antiga nao tem dimensao de ano.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_estrutura_custo AS
  SELECT
    ano_ref AS ano,
    COALESCE(grupo, 'Sem categoria') AS grupo,
    COUNT(*)::int      AS lancamentos,
    SUM(valor)         AS valor,
    SUM(valor_negocio) AS valor_negocio,
    SUM(valor_pessoal) AS valor_pessoal,
    ROUND(100.0 * SUM(valor_negocio)
          / NULLIF(SUM(SUM(valor_negocio)) OVER (PARTITION BY ano_ref), 0), 1) AS pct_negocio_ano
  FROM financeiro.vw_bi_despesas
  GROUP BY ano_ref, COALESCE(grupo, 'Sem categoria');

  -- ===========================================================================
  -- 7. vw_bi_vendas_especie_ano — a antiga tambem nao tem ano.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_vendas_especie_ano AS
  SELECT
    nf.ano::int AS ano,
    COALESCE(e.nome_comum, '(não identificada)') AS nome_comum,
    e.nome_cientifico, e.grupo,
    COUNT(*)::int   AS itens,
    SUM(i.quantidade) AS quantidade,
    SUM(i.valor_total) AS receita
  FROM financeiro.itens_nota i
  JOIN financeiro.notas_fiscais nf ON nf.id = i.nota_id
  LEFT JOIN financeiro.especies e  ON e.id = i.especie_id
  WHERE nf.ano::int >= financeiro.bi_ano_minimo()
  GROUP BY 1, 2, 3, 4;

  -- ===========================================================================
  -- 8. vw_bi_vendas_geo
  -- Cobertura de coordenada e 100% hoje, mas fica exposta: dado novo pode entrar
  -- sem lat/long e o mapa nao pode omitir venda em silencio.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_vendas_geo AS
  SELECT
    nf.ano::int AS ano,
    en.uf, en.municipio, en.regiao, en.cod_municipio_ibge,
    en.latitude, en.longitude,
    (en.latitude IS NOT NULL AND en.longitude IS NOT NULL) AS tem_coordenada,
    COUNT(*)::int       AS notas,
    SUM(nf.valor_total) AS receita
  FROM financeiro.notas_fiscais nf
  JOIN financeiro.pessoas p    ON p.id = nf.destinatario_id
  JOIN financeiro.enderecos en ON en.id = p.endereco_id
  WHERE nf.ano::int >= financeiro.bi_ano_minimo()
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8;

  -- ===========================================================================
  -- 9. vw_bi_pendencias — fila de categorizacao, por valor.
  --
  -- Ordenada por valor porque zerar a fila nao e o objetivo: em 2020+ sao 2.211
  -- linhas / R$184k, e a fatia >= R$100 (497 linhas) ja cobre 65% do valor.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_pendencias AS
  SELECT
    d.id, d.descricao, d.valor, d.data_ref, d.ano_ref, d.mes_ref,
    d.centro_custo, d.centro_natureza, d.fonte, d.aba
  FROM financeiro.vw_bi_despesas d
  WHERE d.categoria_id IS NULL
    AND d.valor > 0;

  -- ===========================================================================
  -- 10. vw_bi_conferencia_mensal
  --
  -- Os totalizadores nao servem so para serem filtrados: o MAIOR totalizador de
  -- cada aba e o total que a propria planilha calculava naquele mes. Comparado
  -- com a soma do detalhe, vira auditoria de importacao de graca — aponta o mes
  -- exato em que o banco nao bate com a planilha original.
  -- Medido em 2020-2026: 84 abas, 49 batem ao centavo, 35 divergem, R$15.321.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_conferencia_mensal AS
  WITH por_aba AS (
    SELECT
      d.ano::int AS ano, d.mes::int AS mes, d.aba,
      MAX(d.valor_total) FILTER (WHERE d.eh_totalizador)       AS total_planilha,
      SUM(d.valor_total) FILTER (WHERE NOT d.eh_totalizador)   AS total_detalhe
    FROM financeiro.despesas d
    WHERE d.ano::int >= financeiro.bi_ano_minimo()
      AND d.excluido_em IS NULL
    GROUP BY 1, 2, 3
  )
  SELECT
    ano, mes, aba, total_planilha, total_detalhe,
    COALESCE(total_planilha, 0) - COALESCE(total_detalhe, 0) AS diferenca,
    (ABS(COALESCE(total_planilha, 0) - COALESCE(total_detalhe, 0)) < 0.01) AS confere
  FROM por_aba;

  -- ===========================================================================
  -- 11. vw_bi_qualidade — um cartao por defeito na tela de qualidade.
  -- `severidade`: 'alta' pede acao, 'media' vale olhar, 'info' e so prova de que
  -- a regra esta ativa.
  -- ===========================================================================
  CREATE OR REPLACE VIEW financeiro.vw_bi_qualidade AS
  SELECT 'meses_faltantes' AS metrica,
         'Meses de despesa por lançar' AS rotulo,
         (SELECT COALESCE(SUM(cardinality(meses_faltantes)), 0)::int
            FROM financeiro.vw_bi_cobertura)                    AS quantidade,
         NULL::numeric                                          AS valor,
         'alta' AS severidade, '/financeiro/preenchimento' AS rota
  UNION ALL
  SELECT 'sem_categoria', 'Lançamentos sem categoria',
         (SELECT COUNT(*)::int FROM financeiro.vw_bi_pendencias),
         (SELECT SUM(valor)   FROM financeiro.vw_bi_pendencias),
         'alta', '/financeiro/pendencias'
  UNION ALL
  SELECT 'conferencia_divergente', 'Meses em que o detalhe não bate com a planilha',
         (SELECT COUNT(*)::int      FROM financeiro.vw_bi_conferencia_mensal WHERE NOT confere),
         (SELECT SUM(ABS(diferenca)) FROM financeiro.vw_bi_conferencia_mensal WHERE NOT confere),
         'media', '/financeiro/qualidade'
  UNION ALL
  SELECT 'sem_coordenada', 'Receita sem coordenada geográfica',
         (SELECT COUNT(*)::int FROM financeiro.vw_bi_vendas_geo WHERE NOT tem_coordenada),
         (SELECT COALESCE(SUM(receita), 0) FROM financeiro.vw_bi_vendas_geo WHERE NOT tem_coordenada),
         'media', '/financeiro/vendas'
  UNION ALL
  SELECT 'eixo_divergente', 'Data do documento diverge do mês da planilha',
         (SELECT COUNT(*)::int FROM financeiro.vw_bi_despesas WHERE eixo_divergente),
         (SELECT COALESCE(SUM(valor), 0) FROM financeiro.vw_bi_despesas WHERE eixo_divergente),
         'info', '/financeiro/qualidade'
  UNION ALL
  SELECT 'data_futura', 'Lançamentos com data futura',
         (SELECT COUNT(*)::int FROM financeiro.vw_bi_despesas WHERE data_futura),
         (SELECT COALESCE(SUM(valor), 0) FROM financeiro.vw_bi_despesas WHERE data_futura),
         'media', '/financeiro/despesas'
  UNION ALL
  SELECT 'zerados', 'Lançamentos de valor zero',
         (SELECT COUNT(*)::int FROM financeiro.vw_bi_despesas WHERE zerado),
         0::numeric, 'info', '/financeiro/despesas'
  UNION ALL
  SELECT 'sem_classificacao', 'Sem categoria e sem centro de custo',
         (SELECT COUNT(*)::int FROM financeiro.vw_bi_despesas WHERE classificacao = 'sem_classificacao'),
         (SELECT COALESCE(SUM(valor), 0) FROM financeiro.vw_bi_despesas WHERE classificacao = 'sem_classificacao'),
         'media', '/financeiro/pendencias'
  UNION ALL
  SELECT 'totalizadores_ignorados', 'Totalizadores do Excel excluídos das contas',
         (SELECT COUNT(*)::int FROM financeiro.despesas WHERE eh_totalizador),
         (SELECT SUM(valor_total) FROM financeiro.despesas WHERE eh_totalizador),
         'info', '/financeiro/qualidade';
END $$;

COMMIT;
