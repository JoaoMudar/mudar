# Rotina: Financeiro / BI

Painel de receita, despesa e margem (`/financeiro`) e o lançamento de despesas que
substitui a planilha `DESPESAS AAAA.xls`. Plano: `plans/P12-financeiro-bi.md`.

---

## ⚠️ Pendência aberta: meses de despesa por lançar

**Esta é a informação mais importante deste documento.**

A importação do histórico veio com dois buracos na despesa, enquanto a receita
está completa:

| Ano | Despesa lançada até | Meses faltando | Efeito no painel |
|-----|--------------------|----------------|------------------|
| 2024 | **ago/2024** | set, out, nov, dez | margem aparecia como 74,1% |
| 2026 | **abr/2026** | mai, jun, jul | margem aparecia como 79,2% |

Enquanto esses meses não forem lançados, o painel **suprime a margem anual desses
anos** (mostra `—` em vez de número) e marca os anos como *parciais*. É proposital:
uma margem de 79% que não existe levaria a uma decisão errada; um travessão leva à
pergunta certa.

**Onde isso aparece** — tudo lido de `financeiro.vw_bi_cobertura`, então **some
sozinho** conforme você lança. Nada está fixo no código:

1. Card vermelho na home (`/`)
2. Faixa amarela no topo de todas as telas de `/financeiro`
3. Tela `/financeiro/preenchimento` — grade ano × mês, clicável
4. Nos gráficos: barra clara + etiqueta "parcial"

**Como preencher:** `/financeiro/preenchimento` → clicar num mês vermelho abre o
formulário já naquele mês. O botão "Repetir categoria e centro do último
lançamento" acelera o preenchimento em lote.

---

## Rotina mensal

> Todo mês, lançar as despesas do mês anterior.
> `/financeiro/preenchimento` é a fonte da verdade do que falta.

1. Abrir `/financeiro/despesas/nova`
2. Lançar as despesas do mês (o formulário fica no lugar depois de salvar, com
   contador da sessão, para lançar várias seguidas)
3. Conferir em `/financeiro/preenchimento` que o mês ficou verde
4. Quando sobrar tempo: `/financeiro/pendencias`, para categorizar o que veio da
   planilha sem categoria

---

## As telas

| Rota | O que responde |
|------|----------------|
| `/financeiro` | Resultado do ano, receita × despesa por ano, margem |
| `/financeiro/mensal` | Mês a mês do ano escolhido + sazonalidade (heatmap) |
| `/financeiro/custos` | Custo por grupo, centro e categoria; alterna Negócio / Pessoal / Total |
| `/financeiro/despesas` | Lançamentos do mês; `/nova` para incluir |
| `/financeiro/preenchimento` | Grade do que falta lançar |
| `/financeiro/pendencias` | Fila de categorização, por valor |
| `/financeiro/qualidade` | Defeitos conhecidos da base e conferência com a planilha |

Acesso: **admin e chefia** apenas (`requireRole('admin', 'chefia')`).

---

## Como os números são calculados

Tudo sai das views `financeiro.vw_bi_*`, que aplicam quatro regras. **Nenhuma
query da aplicação deve recalcular isso na mão** — se precisar de um recorte novo,
o lugar é a view.

1. **`eh_totalizador = FALSE`** — 2.554 linhas são subtotais herdados do Excel.
   Incluí-las infla a despesa ~4× (R$21,5M sobre R$7M reais).
2. **`excluido_em IS NULL`** — soft delete; livro-caixa não faz `DELETE`.
3. **`ano_ref >= 2020`** (`financeiro.bi_ano_minimo()`) — antes disso o dado não
   tem qualidade suficiente.
4. **Negócio × pessoal vem da CATEGORIA + rateio**, nunca de `despesas.natureza`.

### Por que a natureza da linha não vale

A coluna `despesas.natureza` está furada nos dois sentidos (medido em 2020+):

- R$48.793 de gasto **pessoal** (mercado, moradia, lazer, saúde) marcado como
  `negocio` → entrava no DRE sem dever
- R$63.311 de gasto de **negócio** (mão de obra R$31,1k, contabilidade R$16,2k,
  insumos R$14,6k) marcado como `pessoal` → ficava de fora

A regra nova: a natureza da **categoria** manda. Categorias `misto` (combustível,
energia, água…) entram por percentual de rateio configurável por centro de custo.
Regra completa e testada em `src/lib/bi-rateio.ts`.

### Comparação entre períodos

Comparar 2026 (despesa até abril) com o ano cheio de 2025 daria uma variação
inventada. As views recortam **os dois anos na mesma janela** (`janela_comp`), que
é a interseção do que existe nos dois. Por isso 2025 é comparado com 2024 em
jan–ago, e não com o 2024 "cheio" que tem a despesa faltando.

---

## Manutenção

```bash
npm run db:import-financeiro   # importa/reimporta o schema financeiro
npm run db:migrate             # cria/atualiza as views vw_bi_*
npm run bi:sanity              # confere os números contra os valores de referência
```

`npm run bi:sanity` é a rede de segurança: fixa 27 valores medidos (contagens,
receita de 2025, invariante do rateio, vazamentos zerados). Se um deles mudar sem
você ter mudado de propósito, algo quebrou em silêncio. Ao mudar um número
intencionalmente (reconfigurar rateio, por exemplo), atualize o valor esperado em
`scripts/bi-sanity.ts` no mesmo commit.

### Ao escrever uma view nova: nada de subquery correlacionada

As `vw_bi_*` são views empilhadas sobre `vw_bi_despesas`, que varre ~60k linhas
com três `LEFT JOIN` de rateio. Uma subquery escalar por linha
(`(SELECT SUM(...) FROM vw_bi_despesa_mensal WHERE ano = c.ano)`) **não tem
índice para se apoiar** — view não é tabela — então cada uma re-varre a base
inteira e joga fora o que não é do ano. Foi assim que `vw_bi_dre_anual` chegou a
levar 11 s para devolver 7 linhas: 13 subqueries × 7 anos ≈ 150 varreduras
completas (corrigido na migração `20260805000006`, que a deixou em ~130 ms).

O padrão certo: agregar uma vez em CTE (`GROUP BY ano, mes` → dezenas de linhas)
e recortar as janelas com `FILTER` em cima desse resultado já pequeno.

### ⚠️ As migrations do BI já constam como aplicadas no Neon — sem terem rodado

Todo push dispara deploy na Vercel, e `npm run build` é
`tsx scripts/migrate.ts && next build`: **as migrations rodam contra o Neon a
cada deploy**. Como o schema `financeiro` ainda não existe lá, as migrations
`20260805000001`, `…02`, `…03`, `…05` e `…06` caíram todas na guarda
`IF to_regnamespace('financeiro') IS NULL THEN RETURN` — não fizeram nada, mas
foram gravadas em `_migrations` como aplicadas.

Consequência: no dia em que o schema `financeiro` for importado para o Neon,
`npm run db:migrate` vai responder *"Nenhuma migração pendente"* e **nenhuma view
`vw_bi_*` será criada** — o dump traz só as tabelas. O módulo `/financeiro`
quebraria em produção com `relation ... does not exist`.

Ao importar o financeiro no Neon, desmarque as migrations do BI antes de migrar:

```sql
DELETE FROM _migrations WHERE filename LIKE '202608050000%';
```

```bash
npm run db:migrate   # agora recria as views de verdade
npm run bi:sanity
```

### ⚠️ Cuidado com `npm run db:refresh-local`

Esse script recria o banco local do zero a partir do Neon. Enquanto o schema
`financeiro` não estiver no Neon, ele **apagaria todo o histórico importado**.
O script agora detecta isso e aborta. Para reimportar depois:

```bash
npm run db:refresh-local -- -SkipFinanceiroCheck
npm run db:import-financeiro
```

---

## O que o painel ainda não responde

- **Margem ou custo por espécie** — existe receita por espécie, mas não custo
  rateado por muda. Depende do P1 (custeio).
- **Segmento de cliente** (paisagista, prefeitura, B2C) — campo não existe em
  `financeiro.pessoas`.
- **Dados antes de 2020** — fora por decisão de qualidade.
- **Vendas por espécie/região e curva de clientes** — as views existem
  (`vw_bi_vendas_especie_ano`, `vw_bi_vendas_geo`), as telas ainda não.
