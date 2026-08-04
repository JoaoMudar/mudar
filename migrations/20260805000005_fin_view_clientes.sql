-- Migration: 20260805000005_fin_view_clientes.sql
-- Descricao: vw_bi_clientes — ranking de clientes na janela do BI (P12).
--
-- POR QUE UMA VIEW NOVA
-- Ja existe `vw_ranking_clientes` (legada, do dump original), mas ela nao serve:
--   * nao aplica o corte de bi_ano_minimo() — mistura 2011..2019 com 2020+;
--   * nao tem dimensao de ano, entao a tela nao consegue filtrar por periodo.
-- Como as views legadas sao contrato publicado no readmeBI.md (Metabase/Power BI
-- apontam para elas), a antiga fica de pe e esta entra ao lado.
--
-- Grao: cliente x ano. A tela agrega quando quer o total do periodo.
--
-- Guarda de schema: ver o cabecalho de 20260805000001_fin_rateio_config.sql.

BEGIN;

DO $$
BEGIN
  IF to_regnamespace('financeiro') IS NULL THEN
    RAISE NOTICE 'schema financeiro ausente — migracao ignorada (rode scripts/import-financeiro.ps1)';
    RETURN;
  END IF;

  DROP VIEW IF EXISTS financeiro.vw_bi_clientes CASCADE;

  CREATE VIEW financeiro.vw_bi_clientes AS
  SELECT
    p.id AS cliente_id,
    COALESCE(NULLIF(TRIM(p.nome), ''), '(sem nome)') AS nome,
    p.documento,
    nf.ano::int AS ano,
    COUNT(*)::int        AS notas,
    SUM(nf.valor_total)  AS receita,
    MIN(nf.data_emissao) AS primeira_compra,
    MAX(nf.data_emissao) AS ultima_compra
  FROM financeiro.notas_fiscais nf
  JOIN financeiro.pessoas p ON p.id = nf.destinatario_id
  WHERE nf.ano::int >= financeiro.bi_ano_minimo()
    -- Nota sem destinatario nao identifica cliente; entra no faturamento, nao aqui.
    AND nf.destinatario_id IS NOT NULL
  GROUP BY 1, 2, 3, 4;

  COMMENT ON VIEW financeiro.vw_bi_clientes IS
    'Ranking de clientes por ano, ja com o corte de bi_ano_minimo(). Substitui vw_ranking_clientes (legada) no BI da aplicacao.';
END $$;

COMMIT;
