# Dívida técnica: trabalho futuro

> Registrado em **11/08/2026**, logo após o merge do PR #20 (`refactor/politica-e-parties`).
> Complementa [`auditoria-divergencias.md`](auditoria-divergencias.md): aquele documento lista o
> que estava **errado**; este lista o que ainda **falta**.

## Onde o sistema está

Em 10/08/2026 a prontidão para produção foi medida em **65%**. Depois das duas entregas
(`chore/producao-ready` e `refactor/politica-e-parties`) ela está em **~85%**.

O que fechou, e por que importava:

| Buraco | Situação anterior | Hoje |
|---|---|---|
| Autorização | nome de papel na mão em 105 lugares | matriz única do D4 em `src/lib/permissions.ts`, verificada por teste tabular e por teste de cobertura estática |
| Identidade de pessoa | partida entre `customers` e `suppliers` | schema `cadastro` (`parties`, `party_roles`, `addresses`) com ponto único de escrita em `src/lib/parties.ts`; desde 19/08/2026 o casamento cliente↔fornecedor é regra contínua, não só backfill |
| CI | não existia | `.github/workflows/ci.yml`: lint + typecheck + testes |
| Erro do Postgres exibido na tela | 24 ocorrências | 0: tudo passa por `safeErrorMessage` |
| Upload de foto de espécie | **quebrado em produção** (filesystem somente-leitura na Vercel) | `BYTEA` no Postgres + rota `/api/fotos/[id]` |
| Fila offline | 3 defeitos reais, nenhum teste | corrigida, idempotente por `client_id`, testada |
| Observabilidade | nenhuma | Sentry (server + client + edge), com evento real confirmado em produção |

**Os dois refactors estruturais estão feitos.** É o que responde à exigência original de "não
quero ter que refatorar depois": o P13 e o P12 podem ser construídos sobre a política de acesso e
sobre `parties` sem retrabalho.

O que resta abaixo é risco de **operação**, não de **arquitetura**. Nenhum destes itens impede
escrever código novo.

---

## 1. Backup do banco não é automático: **prioridade máxima**

**Estado:** [`engenharia/E-qualidade/E6-plano-backup-recuperacao.md`](engenharia/E-qualidade/E6-plano-backup-recuperacao.md)
descreve o procedimento (§3.1 "Cópia automatizada do banco"), mas **nada o executa**. Hoje a única
cópia dos dados de produção é o próprio Neon.

**Por que é o item mais grave:** é o único da lista que, se der errado, não tem conserto. Todos os
outros custam tempo; este custa os dados. O sistema já carrega pedidos reais, clientes reais e a
rede de fornecedores.

**Feito quando:**
- Existe uma cópia do banco de produção **fora do Neon**, gerada sem intervenção manual.
- A cópia foi **restaurada com sucesso pelo menos uma vez**, backup não verificado não é backup.
- O procedimento de restauração do E6 §6 foi executado de ponta a ponta e cronometrado.

**Caminhos possíveis:** GitHub Action agendada rodando `pg_dump` contra o Neon e guardando o
artefato; ou o próprio *branching*/PITR do Neon, se o plano contratado cobrir a janela desejada.
mas confirmar a janela real do plano free antes de depender dela.

---

## 2. Nenhum teste toca banco real

**Estado:** os 557 testes passam, e **todos** são unitários com `vi.mock` sobre `@/lib/db`. Nenhum
executa SQL de verdade.

**A prova de que isso é um buraco, e não uma preferência:** o achado **J** da auditoria. As tabelas
`input_usages` e `input_price_history` **não existiam** em nenhum dos dois bancos, embora as tarefas
P1 T1.10–T1.12 estivessem marcadas `[x]` e a suíte inteira estivesse verde. A rota
`/insumos/registrar` nunca funcionou em produção e **nenhum teste percebeu**, porque o banco de que
eles falam é um mock.

**Feito quando:** existe ao menos um teste que sobe contra um Postgres real (o
`npm run db:refresh-local` já dá a infraestrutura), aplica as migrations e exercita um caminho de
escrita ponta a ponta: por exemplo, registrar consumo de insumo.

> **Primeiro passo dado em 19/08/2026:** `npm run db:verifica-cadastro`
> (`scripts/verifica-cadastro-unico.ts`) roda o SQL de `src/lib/parties.ts` contra o Postgres local,
> dentro de uma transação que sempre termina em `ROLLBACK`, com guarda de host igual à do
> `seed-supplier-network`. **Justificou-se na primeira execução:** pegou um defeito que os 581
> testes mockados não pegavam: `mergeParties` violava `idx_parties_document` ao copiar o documento
> enquanto a identidade duplicada ainda o segurava, porque o Postgres checa índice único por
> comando, não no fim da transação. Não substitui o item: cobre um módulo só, e não roda em CI.

---

## 3. Nada compara o schema declarado com o schema real

**Estado:** não existe. É o item que **teria pego o achado J sozinho**, e é muito mais barato que
o item 2.

**Feito quando:** um teste de CI lê as tabelas e colunas que `migrations/*.sql` declara, consulta
`information_schema` do banco e falha se divergirem. Cobre a classe inteira de erro "a migration foi
registrada em `_migrations` mas não aplicou nada", que é exatamente como o achado J nasceu.

---

## 4. Sentry: ✅ confirmado em produção (11/08/2026)

**Não é mais pendência.** Fica registrado porque o caminho de verificação é útil da próxima vez.

O erro forçado em `/pedidos/abc` chegou ao painel. O `abc` é um UUID malformado, então o Postgres
lança `22P02`; como nem a página nem `getOrderById` têm `try/catch`, o erro sobe até o
`onRequestError` do `instrumentation.ts`. Isso fecha a cadeia inteira: aplicação → instrumentação →
DSN → painel, com `environment: production`.

> Cuidado com o teste errado: `/pedidos/00000000-0000-0000-0000-000000000000` **não** serve. É um
> UUID sintaticamente válido que apenas não existe: a consulta devolve zero linhas sem erro e a
> página faz `redirect('/pedidos')`. Nenhuma exceção é lançada, e o Sentry corretamente não
> registra nada. Foi essa a confusão que atrasou a verificação.

Para testar o DSN isoladamente, sem subir o Next: `npm run sentry:teste`.

**Pendência residual:** o *auth token* para upload de source maps nunca foi criado (não foi
encontrado na interface do Sentry). Sem ele o stack trace vem minificado, dá para achar o erro,
mas não a linha. O `next.config.mjs` já trata a ausência sem quebrar o build, então é conforto,
não bloqueio.

---

## 5. Telas ainda não leem de `parties`

**Estado:** a identidade única existe e é mantida corretamente na escrita, mas **nenhuma tela lê
dela**. `/clientes` e `/fornecedores` continuam exibindo as colunas antigas de `customers` e
`suppliers`, então a mesma pessoa nos dois papéis ainda aparece como dois cadastros na interface.
mesmo já sendo uma identidade só no banco.

Isso é a Fase 2 do P13 (T13.4–T13.8) e não é urgente: a duplicidade de *dado* está resolvida, o que
resta é duplicidade de *exibição*.

> **Parcialmente fechado em 19/08/2026.** `/cadastros/pessoas` lê de `parties` (via `listParties`)
> e mostra a pessoa uma vez, com um selo por papel: a duplicidade de exibição acabou na porta de
> entrada. `/clientes` e `/fornecedores` continuam lendo das colunas antigas, o que está certo:
> são as telas **do papel**, e é lá que vivem os campos que não são de identidade.

> Corrigido em 19/08/2026 (branch `feat/cadastro-unico-casamento-pessoa`), e que sai desta lista:
> cadastro novo procurava identidade existente (não procurava: toda criação fazia party nova);
> `mergeCustomers` deixava a party do duplicado viva e sem dono; e `upsertParty` não sabia apagar
> campo, porque o COALESCE em todas as colunas fazia `null` e "não sei" serem a mesma coisa.

---

## 6. `T13.3`: `users.party_id`

Última tarefa aberta da Fase 1 do P13. As colunas `party_id` de `customers` e `suppliers` já
existem e estão preenchidas; `users` ficou de fora. É pré-requisito para a agenda de pessoal
(P13 Fase 3), que precisa ligar um usuário do sistema à pessoa física correspondente.

---

## 7. Pendências pequenas

- **Fotos órfãs.** O upload grava em `species_photos` *antes* do INSERT da espécie (o formulário
  funciona assim). Se o cadastro for abandonado no meio, a linha fica sem dono. Não vaza nada e não
  quebra tela nenhuma: só ocupa espaço. Falta uma rotina de limpeza.
- **Branch `refactor/politica-e-parties`** continua no GitHub depois do merge do PR #20. Excluir
  exige autorização explícita (regra do `CLAUDE.md`).
- **Nenhum teste E2E.** Não há Playwright nem Cypress. Consequência direta: os fluxos de campo
  (registrar consumo no celular, separar carga) só foram validados à mão.

---

## 8. `mergeParties` vai apagar histórico financeiro: **quando o financeiro existir**

**Estado:** latente. Não dá para corrigir hoje, porque `financeiro.transactions` ainda não
existe; e não dá para esquecer, porque no dia em que existir a falha é silenciosa.

`mergeParties` (`src/lib/parties.ts`) termina com `DELETE FROM cadastro.parties` e, antes disso,
repointa **só** `customers` e `suppliers`. `financeiro.transactions.party_id` (P12 Fase 2,
`docs/rotinas/4-financeiro/02-schema-financeiro.md:50`) será uma terceira FK para a mesma
linha. Fundir duas identidades depois disso ou **falha na FK**, ou, se alguém usar
`ON DELETE SET NULL` para destravar: **desliga as transações da pessoa sem avisar**: o dinheiro
segue no saldo e some do histórico dela.

**Por que importa:** fundir identidade não é caso raro, é a rotina que o cadastro único existe
para servir: `PartyMatchPrompt` oferece a fusão toda vez que um fornecedor conhecido é
cadastrado como cliente. E é justamente a pessoa com os dois papéis, de quem se compra e para
quem se vende, cujo histórico tem mais valor.

**Correção:** está escrita na Fase 2 do P12, em "A armadilha 4, por extenso"
([`plans/P12-conciliacao-bancaria.md`](../plans/P12-conciliacao-bancaria.md)), FK RESTRICT
explícita, `UPDATE` das transações no passo 5, e um teste que falhe se sobrar referência.

---

## Ordem sugerida

**1** (backup) antes de qualquer coisa: é uma tarde de trabalho e é o único risco irreversível.
Depois **3** (drift de schema), que é barato e cobre a falha mais provável. **2** e **7** entram
quando houver folga; **5** entra com a Fase 2 do P13 e **6** com a Fase 3, que são quem precisa de
cada um. **4** está fechado (resta só o source map, que é conforto).

**8 não tem ordem: tem gatilho.** Ele não pode ser feito antes da Fase 2 do P12 nem depois dela
tem que ser feito **na mesma migration** que criar `financeiro.transactions`.
