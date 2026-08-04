-- Migration: 20260805000002_fin_despesas_app_columns.sql
-- Descricao: Colunas de autoria/soft-delete em financeiro.despesas (P12 Fase 1).
--
-- A tabela nasceu de importacao de planilha (uma .xls por ano). Agora ela passa a
-- receber lancamento pelo app tambem, e precisa saber de onde cada linha veio e
-- quem mexeu.
--
-- Duas decisoes que valem registro:
--
-- 1. `origem_lancamento` em vez de reaproveitar `fonte`. `fonte` guarda o nome do
--    arquivo de origem ("DESPESAS 2018.xls") e continua util para rastrear a
--    importacao; sobrecarrega-la com 'app' misturaria duas coisas diferentes.
--
-- 2. Soft delete (`excluido_em`), nunca DELETE. Isto e livro-caixa: apagar linha
--    de historico financeiro destroi a trilha de auditoria e faz total de mes
--    mudar sem explicacao. Toda view vw_bi_* filtra `excluido_em IS NULL`.
--
-- `criado_por` guarda o username como TEXTO e nao FK para public.users. Agora que
-- app e historico dividem o banco a FK seria possivel, mas o registro financeiro
-- precisa sobreviver a remocao do usuario que o lancou.
--
-- Guarda de schema: ver o cabecalho de 20260805000001_fin_rateio_config.sql.

BEGIN;

DO $$
BEGIN
  IF to_regnamespace('financeiro') IS NULL THEN
    RAISE NOTICE 'schema financeiro ausente — migracao ignorada (rode scripts/import-financeiro.ps1)';
    RETURN;
  END IF;

  ALTER TABLE financeiro.despesas
    ADD COLUMN IF NOT EXISTS origem_lancamento TEXT NOT NULL DEFAULT 'excel',
    ADD COLUMN IF NOT EXISTS criado_por        TEXT,
    ADD COLUMN IF NOT EXISTS atualizado_em     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS atualizado_por    TEXT,
    ADD COLUMN IF NOT EXISTS excluido_em       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS excluido_por      TEXT;

  -- CHECK separado do ADD COLUMN para a migracao continuar repetivel.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'despesas_origem_lancamento_check'
      AND conrelid = 'financeiro.despesas'::regclass
  ) THEN
    ALTER TABLE financeiro.despesas
      ADD CONSTRAINT despesas_origem_lancamento_check
      CHECK (origem_lancamento IN ('excel', 'app'));
  END IF;

  -- Indice parcial: o unico acesso a esta coluna e "mostre o que o app lancou",
  -- e essas linhas sao raras perto das 42k importadas da planilha.
  CREATE INDEX IF NOT EXISTS despesas_origem_app
    ON financeiro.despesas (data DESC)
    WHERE origem_lancamento = 'app' AND excluido_em IS NULL;
END $$;

COMMIT;
