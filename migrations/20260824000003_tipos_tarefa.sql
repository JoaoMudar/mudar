-- ============================================================
-- Catalogo de tipos de tarefa
--
-- Especificacao: docs/rotinas/2-producao/01-agenda-de-pessoal.md (decisao 2)
-- Requisitos: RF-70, RF-82 · Regras: RN-80, RN-81, RN-82
-- Entidade: C8 `task_types`
--
-- ESTE CATALOGO COMANDA O FORMULARIO. Os tres `requires_*` e o
-- `measurement_type` decidem o que a tela pede em cada tarefa: "Irrigacao" nao
-- pergunta lote e "Repicar" pergunta. Sem isso, ou o formulario pede tudo
-- sempre (e ninguem preenche), ou pede o minimo sempre (e o dado nao serve).
--
-- TODA TAREFA MEDE TEMPO. O apontamento tem inicio e fim sempre; o
-- `measurement_type` so diz se TAMBEM se conta quanto foi feito. Por isso os
-- valores sao `tempo`, `saco` e `tubete`, e nao "tempo ou quantidade": a
-- pergunta do viveiro e "quantos fez em quantas horas".
--
-- NASCE PREENCHIDO, e nao vazio: tipo de tarefa digitado por quem monta a
-- agenda produziria "limpar mato", "limpeza de mato" e "capina" como tres
-- tarefas distintas, e a soma de horas por tarefa deixaria de existir.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

CREATE TABLE task_types (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL UNIQUE,
  category             TEXT NOT NULL,
  measurement_type     TEXT NOT NULL,
  requires_species     BOOLEAN NOT NULL DEFAULT FALSE,
  requires_container   BOOLEAN NOT NULL DEFAULT FALSE,
  requires_batch       BOOLEAN NOT NULL DEFAULT FALSE,
  avg_minutes_per_unit NUMERIC(10,2),
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT task_types_category_valida CHECK (category IN
    ('semente', 'terra', 'plantio', 'manutencao', 'pos_morte', 'expedicao')),

  CONSTRAINT task_types_measurement_valido CHECK (measurement_type IN
    ('tempo', 'saco', 'tubete')),

  CONSTRAINT task_types_minutos_positivos
    CHECK (avg_minutes_per_unit IS NULL OR avg_minutes_per_unit > 0)
);

CREATE TRIGGER task_types_set_updated_at
  BEFORE UPDATE ON task_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Carga inicial: as 22 tarefas do viveiro, como a equipe as nomeia.
--
-- SEMEAR NAO EXIGE LOTE E PLANTAR EXIGE. E o ponto em que a leva ganha
-- endereco: a semente vai para bandeja de germinacao, que nao e canteiro. O
-- lote nasce no plantio, e "classificar pos-germinacao", que ja exige lote,
-- ocorre depois dele.
--
-- CLASSIFICAR APARECE DUAS VEZES porque sao dois momentos com propositos
-- distintos: pos-germinacao separa o que germinou do que nao germinou, e
-- selecao separa as maiores das menores quando trocam de bandeja. Ambas
-- produzem perda no mesmo gesto (RN-90).
-- ------------------------------------------------------------
INSERT INTO task_types (name, category, measurement_type, requires_species, requires_container, requires_batch) VALUES
  -- semente
  ('Colher semente',              'semente',    'tempo',  TRUE,  FALSE, FALSE),
  ('Beneficiar semente',          'semente',    'tempo',  TRUE,  FALSE, FALSE),
  ('Semear',                      'semente',    'tempo',  TRUE,  FALSE, FALSE),
  -- terra
  ('Fazer substrato',             'terra',      'tempo',  FALSE, FALSE, FALSE),
  ('Encher saquinho',             'terra',      'saco',   FALSE, TRUE,  FALSE),
  ('Encher tubete',               'terra',      'tubete', FALSE, TRUE,  FALSE),
  -- plantio
  ('Encanteirar saco',            'plantio',    'saco',   TRUE,  TRUE,  TRUE),
  ('Plantar no saquinho',         'plantio',    'saco',   TRUE,  TRUE,  TRUE),
  ('Plantar no tubete',           'plantio',    'tubete', TRUE,  TRUE,  TRUE),
  -- manutencao
  ('Classificar pós-germinação',  'manutencao', 'tubete', FALSE, FALSE, TRUE),
  ('Classificar seleção',         'manutencao', 'tubete', FALSE, FALSE, TRUE),
  ('Repicar',                     'manutencao', 'tubete', FALSE, FALSE, TRUE),
  ('Limpar mato',                 'manutencao', 'tubete', FALSE, FALSE, TRUE),
  ('Aplicação de adubo',          'manutencao', 'tempo',  FALSE, FALSE, FALSE),
  ('Aplicação de fungicida',      'manutencao', 'tempo',  FALSE, FALSE, FALSE),
  ('Irrigação',                   'manutencao', 'tempo',  FALSE, FALSE, FALSE),
  -- pos_morte
  ('Limpar canteiro',             'pos_morte',  'tempo',  FALSE, FALSE, TRUE),
  ('Replantar no saco',           'pos_morte',  'tempo',  FALSE, FALSE, TRUE),
  ('Limpar saco',                 'pos_morte',  'tempo',  FALSE, FALSE, FALSE),
  ('Limpar tubete',               'pos_morte',  'tempo',  FALSE, FALSE, FALSE),
  -- expedicao
  ('Separar mudas',               'expedicao',  'tempo',  FALSE, FALSE, TRUE),
  ('Carregar',                    'expedicao',  'tempo',  FALSE, FALSE, FALSE);

-- Assercao: a carga tem de ter entrado inteira. Sem isso, uma linha rejeitada
-- por CHECK passaria despercebida e o catalogo nasceria com um buraco.
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM task_types;
  IF n <> 22 THEN
    RAISE EXCEPTION 'task_types deveria ter 22 linhas, tem %', n;
  END IF;
END $$;

COMMENT ON TABLE task_types IS
  'Catalogo fechado de tipos de tarefa. Comanda o que o formulario pede (RF-82).';
COMMENT ON COLUMN task_types.measurement_type IS
  'tempo | saco | tubete. Decide se o encerramento pede contagem alem do relogio (RN-81).';
COMMENT ON COLUMN task_types.requires_batch IS
  'Quando verdadeiro, a atribuicao e o apontamento exigem lote, e com ele o canteiro (RN-82).';
