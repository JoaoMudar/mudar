-- Migration: 20260529100001_species_tags.sql
-- Descricao: Substitui a categoria unica da especie por caracteristicas multiplas (tags).
--            Uma especie pode ter varias: Nativa, Exotica, Frutifera, Ornamental,
--            Madeireira, Forrageira (catalogo fixo em src/lib/species-tags.ts).
--            Exibidas como badges coloridos ao lado do nome em todas as rotinas.
--
-- Compatibilidade: a coluna `category` e mantida (apenas perde o NOT NULL); o codigo
--            novo nao a usa mais. Pode ser removida numa migracao futura.

-- 1) Nova coluna de tags
ALTER TABLE species ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- 2) Backfill best-effort a partir da categoria antiga.
--    restauracao/pioneira/climax sao papeis ecologicos de especies nativas -> 'nativa'.
--    O usuario ajusta caso a caso depois no cadastro.
UPDATE species SET tags = CASE category
  WHEN 'frutifera'   THEN ARRAY['frutifera']
  WHEN 'ornamental'  THEN ARRAY['ornamental']
  WHEN 'madeira'     THEN ARRAY['madeireira']
  WHEN 'restauracao' THEN ARRAY['nativa']
  WHEN 'pioneira'    THEN ARRAY['nativa']
  WHEN 'climax'      THEN ARRAY['nativa']
  ELSE ARRAY[]::TEXT[]
END
WHERE tags = '{}'::TEXT[] AND category IS NOT NULL;

-- 3) Categoria deixa de ser obrigatoria (codigo novo nao a preenche mais)
ALTER TABLE species ALTER COLUMN category DROP NOT NULL;
