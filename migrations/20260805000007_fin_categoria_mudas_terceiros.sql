-- Migration: 20260805000007_fin_categoria_mudas_terceiros.sql
-- Descricao: Categoria propria para muda comprada de outro produtor.
--
-- CONTEXTO
-- Quando falta especie no viveiro, a muda e comprada de outro produtor (Marcio
-- Kuhar, Savio Giacomozzi, Artemio, Guilherme Ponticelli...) e revendida. Isso
-- nao e insumo de producao: e custo de mercadoria. Ate aqui caia tudo em
-- 'Insumos/Producao' e sumia dentro do agregado — em 2025 eram R$28,9k de um
-- total de R$52,5k da categoria, ou seja, 55% do "insumo" nao era insumo.
--
-- Separar responde a pergunta que o painel nao respondia: quanto do custo e
-- producao propria e quanto e revenda. A margem dos dois e diferente.
--
-- natureza = 'negocio': 100% do gasto e do viveiro, sem rateio. Por isso esta
-- categoria NAO entra em financeiro.rateio_categoria (so 'misto' entra) e a
-- despesa de negocio total nao se move — a conferencia
-- 'despesa de negocio (rateada)' do npm run bi:sanity e a prova disso.
--
-- GUARDA DE SCHEMA
-- Mesmo motivo das migracoes 20260805000001..06: o schema `financeiro` chega
-- por `npm run db:import-financeiro`, nao por migracao. Onde ele ainda nao foi
-- importado (Vercel/Neon) esta migracao vira no-op. O nome do arquivo mantem o
-- prefixo `202608050000` de proposito, para continuar coberto por
--   DELETE FROM _migrations WHERE filename LIKE '202608050000%';
-- que e a receita documentada em docs/rotinas/financeiro-bi.md para o dia em
-- que o financeiro for importado no Neon.

BEGIN;

DO $$
DECLARE
  v_categoria_id    INT;
  v_insumos_id      INT;
  v_reclassificadas INT;
  v_regras          INT;
BEGIN
  IF to_regnamespace('financeiro') IS NULL THEN
    RAISE NOTICE 'schema financeiro ausente — migracao ignorada (rode npm run db:import-financeiro)';
    RETURN;
  END IF;

  INSERT INTO financeiro.categorias_despesa (nome, grupo, natureza)
  VALUES ('Mudas de terceiros', 'Operacional produção', 'negocio')
  ON CONFLICT (nome) DO NOTHING
  RETURNING id INTO v_categoria_id;

  -- ON CONFLICT DO NOTHING nao devolve linha quando nao insere: v_categoria_id
  -- NULL significa "a categoria ja existia". Nesse caso a migracao para aqui, e
  -- isso e o ponto — a reclassificacao abaixo e um movimento de dado, nao um
  -- estado desejado permanente. Se ela rodasse de novo (o cenario real: apagar
  -- `_migrations` para recriar as views no Neon), desfaria na marra qualquer
  -- linha que o Gilberto tivesse devolvido para Insumos/Producao na mao.
  IF v_categoria_id IS NULL THEN
    RAISE NOTICE 'categoria "Mudas de terceiros" ja existe — reclassificacao ignorada';
    RETURN;
  END IF;

  SELECT id INTO v_insumos_id
    FROM financeiro.categorias_despesa
   WHERE nome = 'Insumos/Produção';

  -- -------------------------------------------------------------------------
  -- Reclassificacao do historico, restrita a janela do BI (2020+).
  --
  -- So mexe no que ja esta em 'Insumos/Producao': linha sem categoria continua
  -- na fila de /financeiro/pendencias, onde a decisao e humana — sao 17 linhas
  -- (R$8.642,50) em 2020+, e agora com a categoria nova disponivel na lista.
  --
  -- O casamento e "muda"/"mudas" como PALAVRA INTEIRA (`\y` — no POSIX do
  -- Postgres `\b` e backspace, nao fronteira de palavra). Isso pega tanto
  -- 'Mudas Marcio Kuhar' quanto 'Marcio Kuhar mudas', e deixa de fora
  -- 'Certificado digital Mudar' e 'Conserto Mudanca 1215'.
  --
  -- A segunda condicao tira o insumo que apenas cita muda no nome ('Saco para
  -- mudas 10x18', 'Saquinhos para mudas', 'Mudas e Bandejas'). Hoje essas 9
  -- linhas sao todas anteriores a 2020 e o corte de ano ja as excluiria, mas o
  -- filtro fica explicito: se bi_ano_minimo() baixar um dia, elas continuam
  -- sendo insumo.
  -- -------------------------------------------------------------------------
  UPDATE financeiro.despesas d
     SET categoria_id   = v_categoria_id,
         atualizado_em  = NOW(),
         atualizado_por = 'migracao 20260805000007'
   WHERE d.categoria_id = v_insumos_id
     AND d.eh_totalizador = FALSE
     AND d.excluido_em IS NULL
     AND d.ano >= financeiro.bi_ano_minimo()
     AND financeiro.bi_normaliza(d.descricao) ~ '\ymudas?\y'
     AND financeiro.bi_normaliza(d.descricao) !~
         '(saco|saquinho|tubete|substrato|bandeja|vaso|adubo|frete|transporte)';
  GET DIAGNOSTICS v_reclassificadas = ROW_COUNT;

  -- As regras aprendidas na fila de pendencias apontavam para Insumos/Producao.
  -- Sem redirecionar, a proxima compra de muda que caisse na fila receberia a
  -- sugestao antiga e a mistura voltaria a se formar sozinha.
  -- Regra so sugere (ver src/app/financeiro/pendencias/actions.ts) — mudar o
  -- destino nao reclassifica nada retroativamente.
  UPDATE financeiro.regras_categoria
     SET categoria_id = v_categoria_id
   WHERE categoria_id = v_insumos_id
     AND financeiro.bi_normaliza(padrao) ~ '\ymudas?\y';
  GET DIAGNOSTICS v_regras = ROW_COUNT;

  RAISE NOTICE 'Mudas de terceiros: categoria id=% criada, % lancamentos reclassificados, % regra(s) redirecionada(s)',
    v_categoria_id, v_reclassificadas, v_regras;
END $$;

COMMIT;
