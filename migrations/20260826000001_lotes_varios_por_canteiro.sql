-- ============================================================
-- Um canteiro comporta varios lotes
--
-- Especificacao: docs/rotinas/2-producao/04-lotes-e-canteiros.md
-- Requisitos: RF-84, RF-85 (emendado), RF-117 · Regras: RN-76 (emendada),
--             RN-79 (emendada), RN-92 · Entidade: C8 `batches`
--
-- A RN-76 DIZIA DUAS COISAS E SO UMA ERA VERDADE. "Um lote ocupa um canteiro"
-- continua de pe: a leva nao se espalha por dois lugares, e e isso que faz "o
-- que tem neste canteiro" ter resposta direta. O que caiu foi a EXCLUSIVIDADE,
-- que o viveiro nunca teve: o mapa de producao mostra seis, oito, nove lotes
-- no mesmo canteiro, e o indice unico proibia justamente o que a operacao faz
-- todo dia.
--
-- A `position` E O QUE DA AO MAPA UM DESENHO ESTAVEL. Sem ela os quadradinhos
-- trocariam de lugar a cada carregamento, e o gerente perderia a referencia
-- espacial que a tela existe para dar: ele reconhece o lote pelo lugar antes
-- de ler o rotulo.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL: scripts/migrate.ts ja
-- envolve cada arquivo numa transacao, e migration que checa antes de agir
-- roda como no-op e ainda assim e marcada como aplicada (licao no 7).
-- ============================================================

-- O indice que materializava a exclusividade. E ele, e nao a aplicacao, que
-- impedia o segundo lote no canteiro: por isso a emenda da regra comeca aqui.
DROP INDEX batches_um_lote_aberto_por_canteiro;

ALTER TABLE batches
  ADD COLUMN position INTEGER,

  -- Posicao e ordem, nao coordenada: comeca em 1 e conta da esquerda para a
  -- direita, como a equipe le o canteiro de pe na frente dele.
  ADD CONSTRAINT batches_position_positiva
    CHECK (position IS NULL OR position > 0);

-- NULO E ACEITO DE PROPOSITO. Lote lancado as pressas, sem se cuidar da ordem,
-- precisa caber: exigir posicao faria a gerencia inventar um numero so para
-- conseguir registrar o lote, e numero inventado desenha o mapa errado. O
-- indice e parcial nos dois eixos por isso.
CREATE UNIQUE INDEX batches_posicao_unica_no_canteiro
  ON batches(bed_id, position)
  WHERE closed_at IS NULL AND position IS NOT NULL;

-- Consulta do mapa: todos os lotes abertos de um canteiro, na ordem do desenho.
CREATE INDEX batches_por_canteiro_idx
  ON batches(bed_id, position)
  WHERE closed_at IS NULL;

-- `batches_encerrado_sem_canteiro` CONTINUA VALENDO, e e ela que mantem
-- "canteiro livre = canteiro sem NENHUM lote aberto" verificavel (RN-79): lote
-- encerrado larga o `bed_id`, entao a contagem de lotes abertos por canteiro
-- responde a pergunta sem depender de mais nada.

COMMENT ON COLUMN batches.position IS
  'Ordem do lote dentro do canteiro, a partir de 1. Da ao mapa um desenho estavel (RF-117). Nula quando a ordem nao foi cuidada.';

COMMENT ON TABLE batches IS
  'A leva de mudas da mesma especie, no mesmo recipiente, ocupando um canteiro. Um lote ocupa um canteiro, e um canteiro comporta varios lotes (RN-76, RN-92).';
