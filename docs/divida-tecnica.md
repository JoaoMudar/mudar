# Dívida técnica — trabalho futuro

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
| Identidade de pessoa | partida entre `customers` e `suppliers` | schema `cadastro` (`parties`, `party_roles`, `addresses`) com ponto único de escrita em `src/lib/parties.ts` |
| CI | não existia | `.github/workflows/ci.yml` — lint + typecheck + testes |
| Erro do Postgres exibido na tela | 24 ocorrências | 0 — tudo passa por `safeErrorMessage` |
| Upload de foto de espécie | **quebrado em produção** (filesystem somente-leitura na Vercel) | `BYTEA` no Postgres + rota `/api/fotos/[id]` |
| Fila offline | 3 defeitos reais, nenhum teste | corrigida, idempotente por `client_id`, testada |
| Observabilidade | nenhuma | Sentry (server + client + edge) |

**Os dois refactors estruturais estão feitos.** É o que responde à exigência original de "não
quero ter que refatorar depois": o P13 e o P12 podem ser construídos sobre a política de acesso e
sobre `parties` sem retrabalho.

O que resta abaixo é risco de **operação**, não de **arquitetura**. Nenhum destes itens impede
escrever código novo.

---

## 1. Backup do banco não é automático — **prioridade máxima**

**Estado:** [`engenharia/E-qualidade/E6-plano-backup-recuperacao.md`](engenharia/E-qualidade/E6-plano-backup-recuperacao.md)
descreve o procedimento (§3.1 "Cópia automatizada do banco"), mas **nada o executa**. Hoje a única
cópia dos dados de produção é o próprio Neon.

**Por que é o item mais grave:** é o único da lista que, se der errado, não tem conserto. Todos os
outros custam tempo; este custa os dados. O sistema já carrega pedidos reais, clientes reais e a
rede de fornecedores.

**Feito quando:**
- Existe uma cópia do banco de produção **fora do Neon**, gerada sem intervenção manual.
- A cópia foi **restaurada com sucesso pelo menos uma vez** — backup não verificado não é backup.
- O procedimento de restauração do E6 §6 foi executado de ponta a ponta e cronometrado.

**Caminhos possíveis:** GitHub Action agendada rodando `pg_dump` contra o Neon e guardando o
artefato; ou o próprio *branching*/PITR do Neon, se o plano contratado cobrir a janela desejada —
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
escrita ponta a ponta — por exemplo, registrar consumo de insumo.

---

## 3. Nada compara o schema declarado com o schema real

**Estado:** não existe. É o item que **teria pego o achado J sozinho**, e é muito mais barato que
o item 2.

**Feito quando:** um teste de CI lê as tabelas e colunas que `migrations/*.sql` declara, consulta
`information_schema` do banco e falha se divergirem. Cobre a classe inteira de erro "a migration foi
registrada em `_migrations` mas não aplicou nada" — que é exatamente como o achado J nasceu.

---

## 4. Sentry sem evento real confirmado em produção

**Estado:** instalado e configurado; `npm run sentry:teste` prova que o DSN e a rede funcionam. Falta
confirmar que um erro **da aplicação em produção** chega ao painel.

**Como confirmar:** logado em produção, abrir `/pedidos/abc`. O `abc` é um UUID malformado, então o
Postgres lança `22P02`; como nem a página nem `getOrderById` têm `try/catch`, o erro sobe até o
`onRequestError` do `instrumentation.ts`.

> Cuidado com o teste errado: `/pedidos/00000000-0000-0000-0000-000000000000` **não** serve. É um
> UUID sintaticamente válido que apenas não existe — a consulta devolve zero linhas sem erro e a
> página faz `redirect('/pedidos')`. Nenhuma exceção é lançada, e o Sentry corretamente não
> registra nada.

**Pendência menor junto:** o *auth token* para upload de source maps nunca foi criado (não foi
encontrado na interface do Sentry). Sem ele o stack trace vem minificado. O `next.config.mjs` já
trata a ausência sem quebrar o build, então isso é conforto, não bloqueio.

---

## 5. `T13.3` — `users.party_id`

Última tarefa aberta da Fase 1 do P13. As colunas `party_id` de `customers` e `suppliers` já
existem e estão preenchidas; `users` ficou de fora. É pré-requisito para a agenda de pessoal
(P13 Fase 3), que precisa ligar um usuário do sistema à pessoa física correspondente.

---

## 6. Pendências pequenas

- **Fotos órfãs.** O upload grava em `species_photos` *antes* do INSERT da espécie (o formulário
  funciona assim). Se o cadastro for abandonado no meio, a linha fica sem dono. Não vaza nada e não
  quebra tela nenhuma — só ocupa espaço. Falta uma rotina de limpeza.
- **Branch `refactor/politica-e-parties`** continua no GitHub depois do merge do PR #20. Excluir
  exige autorização explícita (regra do `CLAUDE.md`).
- **Nenhum teste E2E.** Não há Playwright nem Cypress. Consequência direta: os fluxos de campo
  (registrar consumo no celular, separar carga) só foram validados à mão.

---

## Ordem sugerida

**1** (backup) antes de qualquer coisa — é uma tarde de trabalho e é o único risco irreversível.
Depois **3** (drift de schema), que é barato e cobre a falha mais provável. **4** custa cinco
minutos e pode ser feito a qualquer momento. **2** e **6** entram quando houver folga; **5** entra
junto com a Fase 3 do P13, que é quem precisa dele.
