-- Migration: 20260805000001_fin_rateio_config.sql
-- Descricao: Config de rateio negocio/pessoal e regras de categorizacao (P12 Fase 1).
--
-- CONTEXTO
-- O historico financeiro mistura gastos do viveiro e da familia. Hoje a separacao
-- mora em `despesas.natureza` (nivel da LINHA) e ela esta furada nos dois sentidos:
--   * R$48.793 de gasto pessoal (Mercado, Moradia, Lazer, Saude) marcado 'negocio'
--     -> entra no DRE do negocio sem dever;
--   * R$63.311 de gasto de negocio (Mao de obra, Contabilidade, Insumos) marcado
--     'pessoal' -> fica de fora do DRE devendo entrar.
-- (numeros medidos em 2020+, que e a janela do BI)
--
-- A correcao: quem manda passa a ser a natureza da CATEGORIA, nao a da linha. E
-- para as 12 categorias 'misto' (combustivel, energia, agua... compartilhadas entre
-- viveiro e casa) entra um percentual de rateio configuravel por centro de custo,
-- em vez do 100%-ou-nada de hoje.
--
-- Ver a regra completa (5 ramos de precedencia) em src/lib/bi-rateio.ts, que e
-- espelho desta config e tem os testes.
--
-- GUARDA DE SCHEMA
-- O schema `financeiro` chega por scripts/import-financeiro.ps1 (dump de ~60k
-- linhas), nao por migracao. Em ambiente onde ele ainda nao foi importado — Vercel
-- no primeiro deploy, por exemplo — esta migracao vira no-op para nao quebrar o
-- build. Depois de importar o schema, rode de novo:
--   DELETE FROM _migrations WHERE filename LIKE '2026080500%'; -- e npm run db:migrate
-- `npm run bi:sanity` acusa se as tabelas de config estiverem faltando.

BEGIN;

DO $$
BEGIN
  IF to_regnamespace('financeiro') IS NULL THEN
    RAISE NOTICE 'schema financeiro ausente — migracao ignorada (rode scripts/import-financeiro.ps1)';
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Rateio: quanto de uma categoria 'misto' pertence ao negocio, por centro.
  -- ---------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS financeiro.rateio_categoria (
    id              SERIAL PRIMARY KEY,
    categoria_id    INT  NOT NULL REFERENCES financeiro.categorias_despesa(id),
    -- NULL = valor padrao da categoria, usado quando o centro de custo da linha
    -- nao tem regra propria (ou a linha nem tem centro).
    centro_custo    TEXT,
    pct_negocio     SMALLINT NOT NULL CHECK (pct_negocio BETWEEN 0 AND 100),
    -- Sem uso na v1 (o rateio vale para toda a serie). Existe desde ja para que
    -- rateio variavel no tempo nao exija ALTER TABLE depois.
    vigencia_inicio DATE NOT NULL DEFAULT DATE '1900-01-01',
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_por  TEXT
  );

  -- coalesce no unique: NULL nao colide com NULL em UNIQUE comum, e queremos
  -- exatamente uma linha-padrao por categoria/vigencia.
  CREATE UNIQUE INDEX IF NOT EXISTS rateio_categoria_chave
    ON financeiro.rateio_categoria (categoria_id, COALESCE(centro_custo, ''), vigencia_inicio);

  -- ---------------------------------------------------------------------------
  -- Regras aprendidas na fila de pendencias: padrao de descricao -> categoria.
  -- Existe porque casar descricao exata e inutil aqui: das 7.273 pendencias,
  -- ZERO repetem uma descricao ja categorizada. Sem regras acumulaveis a cauda
  -- nunca fecha.
  -- ---------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS financeiro.regras_categoria (
    id           SERIAL PRIMARY KEY,
    -- Guardado ja normalizado (minusculo, sem acento) por src/lib/text.ts:
    -- a extensao unaccent nao esta instalada neste banco.
    padrao       TEXT NOT NULL UNIQUE,
    categoria_id INT  NOT NULL REFERENCES financeiro.categorias_despesa(id),
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    criado_por   TEXT
  );

  CREATE INDEX IF NOT EXISTS regras_categoria_categoria
    ON financeiro.regras_categoria (categoria_id);

  -- Normalizacao de texto para casar regra com descricao.
  --
  -- Precisa existir porque a extensao `unaccent` NAO esta instalada (exige
  -- superusuario) e `lower()` sozinho nao resolve: o padrao e gravado sem
  -- acento por src/lib/text.ts, entao `lower('Combustível') LIKE '%combustivel%'`
  -- daria falso e a regra nunca pegaria. translate() cobre o portugues e, por
  -- ser IMMUTABLE, ainda permite indice funcional depois se precisar.
  CREATE OR REPLACE FUNCTION financeiro.bi_normaliza(t TEXT) RETURNS TEXT
    LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $f$
      SELECT lower(translate(
        COALESCE(t, ''),
        'áàâãäéèêëíìîïóòôõöúùûüñçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÇ',
        'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
      ))
    $f$;

  -- ---------------------------------------------------------------------------
  -- Seed do rateio.
  --
  -- Nada de constante magica: o padrao sai da natureza do proprio centro de custo
  -- (Viveiro/Campo/Floricultura = negocio -> 100; Casa/Clinica = pessoal -> 0;
  -- Sitio/A revisar = misto -> 50). Editavel em /financeiro/config/rateio.
  --
  -- So as categorias 'misto' entram: 'negocio' e 'pessoal' sao resolvidas direto
  -- pela natureza da categoria (ramos 1 e 2) e nao consultam esta tabela.
  -- ON CONFLICT DO NOTHING mantem a migracao repetivel sem pisar em ajuste manual.
  --
  -- Os INSERTs ficam DENTRO do DO junto com o resto: fora dele o parser resolveria
  -- `financeiro.categorias_despesa` na hora de planejar o statement e estouraria
  -- antes de qualquer WHERE, furando a guarda de schema.
  -- ---------------------------------------------------------------------------
  INSERT INTO financeiro.rateio_categoria (categoria_id, centro_custo, pct_negocio, atualizado_por)
  SELECT c.id,
         cc.nome,
         CASE cc.natureza WHEN 'negocio' THEN 100 WHEN 'pessoal' THEN 0 ELSE 50 END,
         'seed'
  FROM financeiro.categorias_despesa c
  CROSS JOIN financeiro.centros_custo cc
  WHERE c.natureza = 'misto'
  ON CONFLICT DO NOTHING;

  -- Linha-padrao (sem centro): meio a meio, por ser o unico chute honesto quando
  -- nao da para dizer de que lado o gasto caiu.
  INSERT INTO financeiro.rateio_categoria (categoria_id, centro_custo, pct_negocio, atualizado_por)
  SELECT c.id, NULL, 50, 'seed'
  FROM financeiro.categorias_despesa c
  WHERE c.natureza = 'misto'
  ON CONFLICT DO NOTHING;
END $$;

COMMIT;
