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
| ~~2026~~ | ~~abr/2026~~ | — | resolvido em 05/08/2026 |

**2026 saiu da lista.** Mai, jun e jul estavam lançados no Excel e não no banco;
entraram pela sincronização descrita em *[Sincronizar um ano com a planilha](#sincronizar-um-ano-com-a-planilha)*.
Sobrou só 2024.

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

### Muda comprada de terceiro é categoria própria

Quando falta espécie no viveiro, a muda é comprada de outro produtor (Márcio
Kuhar, Sávio Giacomozzi, Artêmio, Guilherme Ponticelli…) e revendida. Isso não é
insumo de produção — é custo de mercadoria, com margem diferente. Até a migração
`20260805000007` caía tudo em **Insumos/Produção** e sumia no agregado: em 2025
eram R$28,9k de R$52,5k, ou seja **55% do "insumo" não era insumo**.

A categoria **`Mudas de terceiros`** (grupo `Operacional produção`, natureza
`negocio`) separa os dois. A migração reclassificou **215 lançamentos /
R$111.726,50** dentro da janela do BI, casando `muda`/`mudas` como palavra
inteira — `\y` no POSIX do Postgres, porque lá `\b` é backspace. Isso pega tanto
`Mudas Márcio Kuhar` quanto `Márcio Kuhar mudas`, e deixa de fora
`Certificado digital Mudar` e `Conserto Mudança 1215`. Um segundo filtro tira o
insumo que só cita muda no nome (`Saco para mudas 10x18`, `Saquinhos para mudas`).

Três coisas que a migração **não** faz, de propósito:

- **Não mexe em nenhum total.** As duas categorias são `negocio` a 100%, então a
  despesa de negócio, o DRE e a margem ficam idênticos — conferido movendo as 215
  linhas de volta dentro de uma transação com `ROLLBACK`. Só a quebra por
  categoria muda.
- **Não toca em linha sem categoria.** As 17 linhas de muda sem categoria em
  2020+ (R$8.642,50) continuam na fila de `/financeiro/pendencias`, onde a decisão
  é humana — agora com a categoria nova na lista.
- **Não roda duas vezes.** Se a categoria já existe, a reclassificação é pulada.
  Sem isso, apagar `_migrations` para recriar as views no Neon desfaria na marra
  qualquer linha devolvida para Insumos/Produção na mão.

As duas regras aprendidas que apontavam para Insumos/Produção (`mudas toninho`,
`mudas guilherme ponticelli`) foram redirecionadas — senão a mistura voltaria a
se formar sozinha na próxima compra que caísse na fila. Regra só **sugere**, então
redirecionar não reclassifica nada retroativamente.

### Comparação entre períodos

Comparar 2026 (ano em curso) com o ano cheio de 2025 daria uma variação
inventada. As views recortam **os dois anos na mesma janela** (`janela_comp`), que
é a interseção do que existe nos dois. Por isso 2025 é comparado com 2024 em
jan–ago, e não com o 2024 "cheio" que tem a despesa faltando.

---

## Manutenção

```bash
npm run db:import-financeiro   # importa/reimporta o schema financeiro
npm run db:migrate             # cria/atualiza as views vw_bi_*
npm run bi:sanity              # confere os números contra os valores de referência
npm run db:conferir-despesas   # confere o banco contra as planilhas DESPESAS 20xx.xls

python scripts/reimportar-despesas-ano.py --ano 2026          # simula a sincronizacao
python scripts/reimportar-despesas-ano.py --ano 2026 --apply  # grava
```

### As duas conferências, e o que cada uma responde

Elas parecem a mesma coisa e não são:

| | Pergunta que responde | Limite |
|---|---|---|
| `financeiro.vw_bi_conferencia_mensal` (tela `/financeiro/qualidade`) | O total que a planilha calculava bate com a soma do detalhe importado? | Os dois lados vieram do **mesmo** import — não enxerga valor trocado nem mês faltando |
| `npm run db:conferir-despesas` | Cada linha do banco é igual à linha do `.xls` original, campo a campo? | Precisa dos `.xls` em `../migracao/dados/despesas` e do Postgres local |

O script casa `despesas.fonte` + `aba` + `linha_excel` com a linha do arquivo, compara os
9 campos (tolerância de R$0,01) e classifica em igual / **deslocada** / divergente /
faltando / sobrando. Sai com código ≠ 0 se achar qualquer coisa. Flags úteis: `--ano 2016`,
`--out caminho.csv`, `--self-test` (48 verificações das normalizações, sem banco).

**Por que "deslocada" existe.** A conferência é em duas passadas. A primeira usa o número
da linha, mas só pareia se as descrições conferirem; a segunda repesca o que sobrou
casando por conteúdo (data + descrição + local), ignorando a posição. Sem isso, **uma
única linha inserida na planilha depois do import** desalinha tudo abaixo dela e vira
centenas de divergências que não existem — foi o que aconteceu em `Jan26`, onde
"Estacionamento Shopping" entrou na L105 e empurrou o mês inteiro uma linha para baixo.
Antes da segunda passada o relatório acusava R$81 mil de diferença em `Jan26`; depois,
R$479. Linha classificada como *deslocada* só mudou de lugar: não é perda de dado.

Normalizações que o import fez e o script reproduz de propósito, para não virarem falso
positivo: `*` inicial da descrição removido e `local`/`unidade` em minúsculas. Algumas
abas (Out08–Dez08, Out09–Dez10) não têm as linhas de título e o cabeçalho está na linha 1
— por isso a primeira linha de dados é **detectada**, não fixa. E as linhas de rodapé
(subtotal por centro + total geral) ficam de fora de qualquer soma em R$: são o mesmo
dinheiro do detalhe contado de novo, e incluí-las multiplicaria o mês por ~3.

Duas armadilhas do rodapé que o leitor trata explicitamente, porque as duas já produziram
lixo no banco:

- **Rótulo em coluna de dinheiro.** São 72 células em toda a base: `% ` ao lado do
  percentual de combustível e `Folha ` acima do bloco de veículos. Viram `NULL` — mas a
  **linha fica**, porque o import original a guardou (Jun25 L166 está no banco com o
  subtotal do bloco em M.C. e o percentual 18,74 em M.O.). Descartar a linha inteira
  criava 61 divergências artificiais de 2021 a 2025.
- **Numeração no lugar da descrição.** Em `Jun26`/`Jul26` o Gilberto numerou os veículos
  de 1 a 11 na coluna DESCRIÇÃO. Se a numeração contar como descrição, o bloco deixa de
  ser rodapé e vira 22 lançamentos que somam R$12.875,11 de combustível **já contado no
  detalhe do mês** — e quebra o invariante `negócio + pessoal = total`. O discriminador é
  a data: lançamento de verdade tem data; numeração de rodapé, não. As sete linhas
  históricas de descrição numérica (`1.99`, `2.99`, `3.99`, `0`) têm data e continuam
  sendo lançamento.

### O resultado da conferência de 05/08/2026

Rodada completa nos 24 arquivos: **das 42.666 linhas, 41.844 batem campo a campo** e outras
179 batem depois de descontado o deslocamento. Sobra **R$299.047,85 que está na planilha e
não está no banco — e 100% disso é 2026.** De 2003 a 2025 o banco reproduz a planilha.

> **Achado 1 já corrigido** — 2026 foi sincronizado no mesmo dia, ver
> *[Sincronizar um ano com a planilha](#sincronizar-um-ano-com-a-planilha)*. Os achados 2, 3
> e 4 continuam abertos e são deliberadamente aceitos (os motivos estão abaixo).

**1. A planilha de 2026 andou desde o import.** Não é erro de importação, é defasagem — e
tem duas formas:

| | Linhas | Valor |
|---|---|---|
| Meses inteiros que nunca entraram (mai, jun, jul, ago/26) | 560 | R$255.066,13 |
| Linhas novas em meses que já existem no banco (abr/26 puxa 124) | 139 | R$32.230,72 |
| Linhas que entraram **com o valor vazio** (abr e fev/26) | 26 | R$11.751,00 |

A terceira linha da tabela é a mais traiçoeira e merece nome: o Gilberto deixa os gastos
fixos **pré-digitados em vermelho** no começo do mês (Contab, Luz, Condomínio, INSS, FGTS,
Mesada…) e só preenche o valor quando a conta chega. O import passou no meio: veio a
descrição, não veio o valor. Exemplo — `despesas.id = 42181`, `Abr26` L14, "Condomínio
Saint Patrick": R$1.432,00 na planilha, `valor_mc` nulo no banco.

**Consequência prática:** abr/2026 aparecia **verde** em `/financeiro/preenchimento` (tem
lançamento no mês) e mesmo assim estava subestimado em R$8.798,18. A grade de cobertura
responde "tem linha nesse mês?", não "as linhas têm valor?". **O buraco de 2026 foi
fechado; a limitação da grade continua** — é o que ainda pode esconder um mês pela metade
em 2027.

As abas `Mai25..Dez25` existiam no arquivo quando o import rodou e depois foram renomeadas
para `…26` — por isso 448 linhas aparecem como sobrando. As abas set–dez/26 só têm o
gabarito herdado de 2025.

**2. Dentro da janela do BI, e fora de 2026, o import perdeu R$402,71.** Uma linha:
`Abr25` L111, 16/04/2025, DESL. R$402,71 sem descrição. É o padrão de falha do importador:
linha **sem descrição** cujo valor está só em M.O./EQUIP./DESL. é descartada.

**3. Fora da janela, o mesmo bug custou caro em 2008**: 79 lançamentos de deslocamento e
mão de obra (R$13.712,16) em fev–mai/2008 não entraram. E em 2003–2008 lançamentos reais
sem descrição foram marcados `eh_totalizador = TRUE`, ficando de fora de qualquer soma.
Nenhum dos dois afeta o painel enquanto `bi_ano_minimo()` for 2020.

**4. Os 35 meses divergentes de `/financeiro/qualidade` não são erro de importação.** Em
ago/2020 o banco reproduz o Excel com 100% de acerto e mesmo assim o total da planilha
(R$45.916,89) não fecha com a soma do próprio detalhe dela (R$45.970,28). A diferença de
−R$53,39 se repete em vários meses: é a fórmula `SUM` do Excel deixando linha de fora do
intervalo. **Nesses meses o banco está mais certo que a planilha.**

O resto (≈100 achados em 2003–2025) é ruído de rótulo, não dado: a palavra `TOTAL` na
coluna DATA do rodapé, um `%` na coluna EQUIP., datas impossíveis digitadas no Excel
(`30/2`, `31/04`), `1000.0` vs `1000` na coluna UNID. Em todos, o import fez a coisa certa
ao ignorar.

`npm run bi:sanity` é a rede de segurança: fixa 32 valores medidos (contagens,
receita de 2025, invariante do rateio, vazamentos zerados). Se um deles mudar sem
você ter mudado de propósito, algo quebrou em silêncio. Ao mudar um número
intencionalmente (reconfigurar rateio, por exemplo), atualize o valor esperado em
`scripts/bi-sanity.ts` no mesmo commit.

### Sincronizar um ano com a planilha

`scripts/reimportar-despesas-ano.py` traz um ano inteiro do `.xls` para o banco. **Simula
por padrão; só grava com `--apply`.** Usado em 05/08/2026 para fechar 2026.

**Por que não é DELETE + INSERT.** 761 das 1.046 linhas de 2026 já tinham `categoria_id` e
859 tinham `centro_custo` — curadoria feita no app, que não vem da planilha. Recriar o ano
jogaria isso fora. A sincronização é por linha:

| Situação | O que faz |
|---|---|
| Linha casada | `UPDATE` dos 9 campos da planilha; **categoria, centro e natureza ficam** |
| Só no Excel | `INSERT` sem categoria — cai na fila de `/financeiro/pendencias` |
| Só no banco | `excluido_em` (soft delete). Livro-caixa não faz `DELETE` |

O casamento é **por mês, não por nome de aba**: quando o import rodou, as abas dos meses
que ainda não tinham começado se chamavam `Mai25..Dez25` e depois viraram `Mai26..Dez26`.
Casar por mês faz a linha pré-digitada de maio reencontrar a dela e manter a categoria —
sem isso, 448 linhas apareceriam como "sobrando". Dentro do mês vale o mesmo pareamento em
duas passadas da conferência (linha, depois conteúdo), e o leitor de planilha é literalmente
o mesmo módulo, para não existirem duas versões de "como se lê esse Excel".

Antes de qualquer escrita ele grava o ano inteiro em `%TEMP%\backup-despesas-AAAA.csv`, e
tudo roda numa transação só, com rollback em erro.

**O que a sincronização de 2026 fez:**

| | Linhas | Valor |
|---|---|---|
| `UPDATE` (categoria preservada em 458) | 596 | +R$60.187,61 |
| `INSERT` | 715 | +R$238.634,24 |
| Soft delete | 129 | R$0,00 — **nenhuma linha com valor** |

As 129 baixadas são 86 rodapés e 43 fixos de valor zero que o Gilberto tirou das abas de
2026 (COC, Academia, Netflix, Seguro BB, Mesada, Dentista…). Despesa de 2026: **R$182.387,86
→ R$481.209,71**. `npm run db:conferir-despesas -- --ano 2026` passou a fechar ao centavo,
1.632 de 1.632 linhas, e nenhum outro ano se moveu.

**Efeitos colaterais esperados no painel**, todos já refletidos no `bi:sanity`:

- mai, jun e jul/2026 deixaram de ser meses faltantes — 2026 saiu da pendência aberta.
- A fila de `/financeiro/pendencias` subiu de 2.160 para 2.764 linhas (R$407.138,09): as
  linhas novas nascem sem categoria, de propósito.
- As abas que conferem em `/financeiro/qualidade` foram de 49 para 47. Jun e jul/26
  passaram a conferir; set–dez/26 pararam. Não é regressão: essas abas agora têm o
  lançamento real que existia na planilha (R$53,39 de gasolina em set/26, por exemplo) e
  não têm total de mês — o único rodapé é o bloco de percentual. É a planilha que não
  fecha, não o banco.

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
