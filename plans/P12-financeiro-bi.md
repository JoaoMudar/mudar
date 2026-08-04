# P12 — BI Financeiro

## Status: CÓDIGO COMPLETO — falta preencher dados, verificar visualmente e subir ao Neon
## Branch: `feat/financeiro-bi`
## Documentação da rotina: `docs/rotinas/financeiro-bi.md`

Painel de receita/despesa/margem + lançamento de despesas substituindo a planilha
`DESPESAS AAAA.xls`. O histórico de `notas_despesas` virou o schema `financeiro`
dentro do banco do app.

**Feito e validado:** importação do schema, 3 migrações (rateio, colunas de app,
11 views `vw_bi_*`), 6 telas, formulário de lançamento, fila de categorização,
`npm run bi:sanity` com 27 verificações, 69 testes novos.

---

## 🔴 Bug conhecido — corrigir antes de usar de verdade

- [x] **Link quebrado para `/financeiro/config/rateio`.** Resolvido criando a
  tela. Cruzamento entre `href` e páginas agora dá **zero** links quebrados.

---

## Ação sua (dados) — é o que destrava o painel

O painel está suprimindo a margem de 2024 e 2026 de propósito, até estes meses
entrarem. Acompanhe em `/financeiro/preenchimento`.

- [ ] Lançar **set, out, nov e dez de 2024** (4 meses)
- [ ] Lançar **mai, jun e jul de 2026** (3 meses)
- [ ] Trabalhar a fila de pendências: **497 lançamentos ≥ R$100 = 65% do valor**
      pendente (`/financeiro/pendencias`). Não precisa zerar a cauda inteira
      (2.160 linhas) — a triagem por valor é o desenho.
- [ ] Conferir se o rateio padrão faz sentido (categorias `misto` como energia,
      água, combustível: hoje 100% quando o centro é Viveiro/Campo/Floricultura,
      0% em Casa/Clínica, 50% em Sítio)

---

## Verificação que ainda não foi feita

Nada disso foi olhado com os olhos — a extensão do Chrome não estava conectada e
não é possível logar sem sua senha.

- [ ] Abrir `http://localhost:3000/financeiro` e conferir que os gráficos renderizam
- [ ] Confirmar que 2024 e 2026 aparecem com barra clara + etiqueta "parcial"
- [ ] Confirmar que a margem anual desses dois anos aparece como `—`
- [ ] Testar a legibilidade no **celular** (é o dispositivo principal)
- [ ] Fluxo ponta a ponta: lançar despesa em mai/2026 → o mês sai de vermelho na
      tela de preenchimento → o card da home recalcula sozinho
- [ ] Categorizar uma pendência com "aplicar a lançamentos parecidos" e conferir
      que o lote pegou (a normalização de acento é nova, vale ver funcionando)
- [ ] Conferir que `/pedidos` e `/fornecedores` seguem normais (a fusão de schemas
      não deveria ter tocado no app, mas confirmar)

---

## Telas — todas feitas

- [x] **`/financeiro/config/rateio`** — grade 15 categorias × 7 centros, prévia
      ao vivo e aviso de retroatividade. A prévia roda a própria view dentro de
      uma transação com `ROLLBACK`, então o número mostrado é exatamente o que
      vai aparecer depois de salvar — não uma reimplementação da regra.
- [x] **`/financeiro/vendas`** — top 15 espécies, dois gráficos de recipiente
      (quantidade e receita, de fontes diferentes e rotulados como tal), mapa
      Leaflet, barras por UF e tabela de municípios.
- [x] **`/financeiro/clientes`** — curva ABC em gráfico próprio, top 20 e
      recência com ícone + rótulo. Inclui a view nova `vw_bi_clientes`
      (migração `20260805000005`), cuja receita reconcilia exatamente com as notas.

---

## Produção (Neon)

Hoje o BI só funciona local. Ordem importa:

- [ ] Subir o schema: `npm run db:import-financeiro -- -Target neon -AllowRemote`
- [ ] **Depois** rodar as migrações lá. Atenção: se elas rodarem *antes* do schema
      existir, viram no-op e ficam marcadas como aplicadas. Nesse caso:
      `DELETE FROM _migrations WHERE filename LIKE '2026080500%';` e migrar de novo.
- [ ] `npm run bi:sanity` apontando para o Neon
- [ ] Medir o tamanho (~60k linhas a mais no banco de produção)
- [ ] Depois disso, `npm run db:refresh-local` volta a ser seguro

---

## Testes — feitos

- [x] Actions de `/financeiro/pendencias` — 19 testes. **Pegaram um bug real**:
      `categorizar` validava `categoria_id > 0` mas não `id > 0`, então `id=0`
      chegava ao banco. Corrigido.
- [x] Actions de `/financeiro/config/rateio` — 11 testes, com foco em garantir
      que a prévia **sempre** faz `ROLLBACK` e nunca `COMMIT`.
- [x] Normalização de acento — verificada no `bi:sanity` contra o banco real
      (é uma função SQL; mock não provaria nada).

---

## Dívidas e decisões pendentes

- [ ] **Depreciar as views `vw_*` legadas.** Convivem com as `vw_bi_*` para não
      quebrar Metabase/Power BI. Definir uma data e avisar quem usa.
- [x] **Centralizar formatação.** Zero `fmtDate` locais e zero moeda inline
      restantes no projeto. `formatPriceBR` virou alias de `formatBRL`, então há
      um nome a mais mas uma implementação só.
- [x] **"Não classificado" visível nos gráficos de custo.** Fixado como fatia
      própria em cinza, nunca dobrado em "Outros", com link para a fila.
- [ ] **Rateio retroativo.** A configuração de hoje vale para todos os anos. A
      coluna `vigencia_inicio` já existe para rateio por período, sem uso. Só
      implementar se incomodar.
- [ ] Commit + PR da branch `feat/financeiro-bi`

---

## Notas técnicas (para não redescobrir)

- **Sempre qualificar o schema** em SQL: `financeiro.vw_bi_dre_anual`. O pool é
  compartilhado com o app (`public`), então mexer no `search_path` afeta os dois.
- **Um mês "lançado" = ≥ 5 lançamentos**, não `valor > 0`. Os meses abandonados de
  2024/2026 têm 1–4 linhas residuais de ~R$53 que faziam mês vazio passar por
  cheio (`financeiro.bi_min_lancamentos_mes()`).
- **Comparação ano a ano usa a interseção das janelas dos dois anos.** 2025 é
  completo, 2024 não — comparar 2025 com o "2024 cheio" usaria a margem falsa
  como base.
- **`unaccent` não está instalado** (exige superusuário). Use
  `financeiro.bi_normaliza()` dos dois lados da comparação.
- **`CREATE OR REPLACE VIEW` não aceita coluna nova no meio.** A migração das
  views dropa tudo antes de recriar, por isso é re-executável.
- Ao mudar um número de propósito (reconfigurar rateio, p.ex.), atualizar o valor
  esperado em `scripts/bi-sanity.ts` no mesmo commit.
