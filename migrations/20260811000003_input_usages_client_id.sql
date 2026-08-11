-- ============================================================
-- Idempotencia do registro de consumo de insumo (fila offline)
--
-- O formulario de campo (/insumos/registrar) guarda o registro no IndexedDB
-- quando o envio falha e reenvia depois. Sem uma chave gerada pelo cliente, o
-- caso "servidor gravou mas a resposta se perdeu" e indistinguivel de "nao
-- gravou": o item continua na fila e o reenvio cria uma segunda linha.
--
-- Consumo duplicado inflaciona o custo por especie — exatamente o numero que o
-- P1 existe para apurar. `client_id` e o UUID que o aparelho gera antes da
-- primeira tentativa e mantem em todos os reenvios; o INSERT usa
-- ON CONFLICT (client_id) DO NOTHING.
--
-- NULL-able: registros criados fora do formulario de campo (seed, importacao)
-- nao tem origem em aparelho. UNIQUE no Postgres admite varios NULL, entao a
-- restricao ja vale so para quem de fato tem chave — nao e preciso indice
-- parcial. E melhor que seja total: `ON CONFLICT (client_id)` so consegue
-- inferir um indice parcial como arbitro se repetir o predicado no comando,
-- detalhe facil de esquecer no proximo INSERT que alguem escrever.
-- ============================================================

ALTER TABLE input_usages
  ADD COLUMN client_id UUID;

CREATE UNIQUE INDEX idx_input_usages_client_id
  ON input_usages (client_id);
