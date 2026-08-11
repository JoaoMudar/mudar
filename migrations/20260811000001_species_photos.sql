-- ============================================================
-- Fotos de especie no banco, nao no filesystem
--
-- Motivo: `uploadEspecieFoto` gravava com writeFile em
-- public/uploads/especies/. O filesystem da Vercel e somente-leitura fora de
-- /tmp e e descartado a cada deploy — ou seja, o upload nunca funcionou em
-- producao, e o que fosse gravado sumiria no deploy seguinte.
--
-- A foto passa a ser uma linha aqui e e servida por /api/fotos/[id].
-- Ganho colateral: a imagem entra no mesmo backup do banco, conforme o plano
-- E6 (docs/engenharia/E-qualidade/E6-plano-backup-recuperacao.md), que hoje
-- nao cobre nada que esteja em disco.
--
-- Chave propria, e nao species_id: a tela faz o upload ANTES de inserir a
-- especie (EspeciesManager.tsx), entao no momento da gravacao a especie ainda
-- nao existe. species.photo_url continua sendo a referencia, agora no formato
-- /api/fotos/<uuid>.
-- ============================================================

CREATE TABLE species_photos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bytes      BYTEA       NOT NULL,
  mime       TEXT        NOT NULL DEFAULT 'image/webp',
  byte_size  INTEGER     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- As fotos antigas apontam para arquivos em public/uploads/especies/, que nao
-- existem mais (diretorio efemero na Vercel, ignorado pelo git). Deixar a URL
-- gravada produziria imagem quebrada na tela; anular deixa o placeholder que a
-- interface ja trata, e a foto pode ser reenviada.
UPDATE species
   SET photo_url = ''
 WHERE photo_url LIKE '/uploads/%';
