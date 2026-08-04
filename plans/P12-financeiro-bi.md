# P12 — BI Financeiro

## Status: EM ANDAMENTO (base pronta, telas parciais)
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

- [ ] **Link quebrado para `/financeiro/config/rateio`.**
  `src/app/financeiro/despesas/nova/DespesaForm.tsx` mostra "ajustar rateio" com
  link para uma tela que **não existe** → 404. Ou criar a tela (ver abaixo) ou
  remover o link enquanto isso.

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

## Telas que faltam

- [ ] **`/financeiro/config/rateio`** (admin) — grade das 15 categorias `misto` ×
      7 centros de custo, editável 0–100. Prévia ao vivo do efeito na despesa do
      ano. É o que fecha o bug do link quebrado. *Maior prioridade das três.*
- [ ] **`/financeiro/vendas`** — top espécies por receita, mix por recipiente
      (quantidade de `controle_notas`, receita de `itens_nota` — fontes diferentes,
      rotular cada gráfico), e o **mapa Leaflet** (100% da receita tem coordenada;
      reusar `src/app/fornecedores/mapa/`). Views prontas:
      `vw_bi_vendas_especie_ano`, `vw_bi_vendas_geo`.
- [ ] **`/financeiro/clientes`** — curva ABC, top 20, recência.
      ⚠️ **Falta criar a view**: existe só a `vw_ranking_clientes` legada, sem o
      corte de 2020 e sem dimensão de ano.

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

## Testes que faltam

- [ ] Actions de `/financeiro/pendencias` (`categorizar`, `getFila`) — as de
      despesas já têm 16 testes, essas não têm nenhum
- [ ] Caso de borda da normalização: regra com acento casando com descrição sem
      acento e vice-versa (`financeiro.bi_normaliza`)

---

## Dívidas e decisões pendentes

- [ ] **Depreciar as views `vw_*` legadas.** Convivem com as `vw_bi_*` para não
      quebrar Metabase/Power BI. Definir uma data e avisar quem usa.
- [ ] **Centralizar formatação.** `src/lib/format.ts` existe e está testado, mas
      ~8 arquivos ainda têm `formatPriceBR`/`fmtDate` próprios
      (`src/lib/suppliers.ts:114`, `PedidosList`, `QuotesList`, `OrderDetailClient`,
      os managers do admin). Migrar aos poucos, sem pressa.
- [ ] **"Não classificado" visível nos gráficos de custo.** Hoje some. Melhor
      mostrar como fatia explícita do que fingir 100% de cobertura — decidir.
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
