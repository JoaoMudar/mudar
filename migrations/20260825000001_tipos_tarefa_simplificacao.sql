-- ============================================================
-- Simplificacao do catalogo de tipos de tarefa
--
-- Especificacao: docs/rotinas/2-producao/01-agenda-de-pessoal.md (decisao 2)
--                docs/rotinas/2-producao/05-apontamento-de-tarefas.md
-- Requisitos: RF-70, RF-82, RF-98, RF-99, RF-107 · Regras: RN-80 a RN-82, RN-91
-- Entidade: C8 `task_types`
--
-- A MEDICAO DEIXA DE SER LISTA FECHADA E VIRA BOOLEANO. `measurement_type`
-- tinha tres valores (`tempo`, `saco`, `tubete`), e os dois ultimos serviam
-- para dizer QUAL recipiente se contava. Mas o recipiente ja esta no lote
-- (`batches.container_id`) e no proprio nome da tarefa ("Encher tubete"), de
-- modo que os tres valores respondiam uma pergunta de dois estados: pede
-- contagem, ou nao pede. Guardar em tres o que decide em dois garantia que
-- alguem, um dia, escreveria `measurement_type = 'saco'` numa condicao e
-- esqueceria `'tubete'`.
--
-- `avg_minutes_per_unit` SAI porque nunca teve origem. Ninguem no viveiro
-- cronometrou tempo por unidade, e o custo de mao de obra (RF-76) sai das
-- HORAS APONTADAS em `task_executions`, nao de estimativa. Coluna sem fonte de
-- dado e coluna que fica nula para sempre, e que alguem confunde com dado real.
--
-- OS `requires_*` FICAM OS TRES. `requires_batch` e o "lote especifico" da
-- tela; `requires_species` e `requires_container` continuam porque ha tarefa
-- que pede especie sem lote ("Colher semente") e recipiente sem lote
-- ("Encher saquinho").
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

ALTER TABLE task_types
  ADD COLUMN is_quantitative BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: quem media por recipiente passa a ser quantitativa; quem media por
-- tempo fica no default FALSE.
UPDATE task_types
   SET is_quantitative = TRUE
 WHERE measurement_type <> 'tempo';

-- Assercao ANTES do DROP, enquanto a coluna de origem ainda existe: das 22
-- tarefas da carga inicial, 9 mediam por saco ou tubete. Se o numero divergir,
-- o catalogo foi editado por fora e o backfill precisa ser conferido a mao,
-- nao silenciosamente aceito.
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM task_types WHERE is_quantitative;
  IF n <> 9 THEN
    RAISE EXCEPTION 'esperadas 9 tarefas quantitativas, encontradas %', n;
  END IF;
END $$;

-- A CONSTRAINT `task_types_measurement_valido` CAI JUNTO com a coluna: nao
-- precisa de DROP CONSTRAINT proprio, e escrever um daria erro se a ordem
-- fosse invertida.
ALTER TABLE task_types
  DROP COLUMN measurement_type,
  DROP COLUMN avg_minutes_per_unit;

-- Os comentarios antigos citavam `measurement_type` e ficariam mentindo.
COMMENT ON TABLE task_types IS
  'Catalogo de tipos de tarefa. Comanda o que o encerramento pede (RF-82).';
COMMENT ON COLUMN task_types.category IS
  'Classifica a tarefa em uma das seis categorias (RN-80). Agrupa listas e relatorios; nao comanda formulario.';
COMMENT ON COLUMN task_types.is_quantitative IS
  'Quando verdadeiro, o encerramento pede quanto CADA PARTICIPANTE fez (RN-81, RN-91).';
COMMENT ON COLUMN task_types.requires_batch IS
  'O "lote especifico" da tela: quando verdadeiro, o encerramento exige o lote, e com ele o canteiro (RN-82).';
COMMENT ON COLUMN task_types.requires_species IS
  'Quando verdadeiro, a atribuicao e o encerramento exigem especie. Tarefa com lote a herda dele.';
COMMENT ON COLUMN task_types.requires_container IS
  'Quando verdadeiro, exigem recipiente. Tarefa com lote o herda dele.';
