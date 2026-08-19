# Banco `notas_despesas` — guia para construção de BI

Contexto para o Claude Code produzir dashboards/BI sobre o banco histórico fiscal-financeiro
do **Viveiro Mudar** (produção de mudas nativas + compensação ambiental). Este banco é a
fundação de dados; o BI vai apoiar decisões de faturamento, custo, margem, mix de produto,
clientes e geografia.

> **Leia as regras críticas (seção 3) antes de escrever qualquer query.** Ignorá-las produz
> números errados (ex.: despesa inflada ~4×, prejuízo fantasma).

---

> ## 🔄 ESTE DOCUMENTO É HISTÓRICO (P12, ago/2026)
>
> ### ⚠️ Desambiguação obrigatória: dois `financeiro` diferentes
>
> Houve uma tentativa (abandonada em 05/08/2026) de importar o schema `viveiro` deste
> banco para dentro do banco do app como um schema chamado `financeiro`, via
> `scripts/import-financeiro.ps1`. **Isso foi desfeito** (`DROP SCHEMA financeiro
> CASCADE`), e tanto o script quanto as views `vw_bi_*` só existem na branch
> arquivada `feat/financeiro-bi`.
>
> O schema **`financeiro` que existe hoje no app é outra coisa**: são as transações
> importadas dos extratos bancários (P12 nova abordagem), nada a ver com esta
> planilha. Ver [`docs/rotinas/4-financeiro/02-schema-financeiro.md`](docs/rotinas/4-financeiro/02-schema-financeiro.md).
>
> **Este banco (`notas_despesas`, schema `viveiro`) segue separado e intacto**, como
> descrito no resto do documento. Onde se lê `viveiro.tabela`, é `viveiro.tabela` mesmo.
> Ele serve para **tendência histórica**, não para conciliação — o marco zero do
> financeiro novo é 01/01/2026.
>
> ### Outras correções
>
> 1. **As views `vw_*` da seção 4 continuam válidas neste banco.** A família `vw_bi_*`
>    que existiu por cima delas foi descartada junto com a abordagem — não procure por ela.
> 2. **A regra de natureza da seção 3 está errada** — ver a correção abaixo.
> 3. **A janela confiável começa em 2020.** Antes disso o dado não tem qualidade.
>
> ### Correções de fato apuradas contra o banco
>
> | Este documento diz | O banco tem |
> |---|---|
> | `natureza IN ('negocio','misto')` basta para o DRE | **Não basta.** A coluna está furada nos dois sentidos: R$48.793 de gasto pessoal marcado `negocio` (entra sem dever) e R$63.311 de gasto de negócio marcado `pessoal` (fica de fora). A natureza confiável é a da **categoria**, mais rateio por centro de custo para as 15 categorias `misto`. |
> | Período detalhado confiável 2003→2026 | A **despesa de 2024 para em ago** e a **de 2026 em abr**, enquanto a receita segue até o fim. Isso produz margem falsa de 74,1% (2024) e 79,2% (2026) — suprima a margem desses anos. |
> | Receita começa em 2003 | `notas_fiscais` começa em **jun/2011**. O prejuízo de 2003–2010 no `vw_dre_anual` é receita ausente, não prejuízo real. |
> | `municipios_ibge` com 5.570 municípios | Ficou 29 linhas na primeira carga; **corrigido** — hoje são 5.571 e a receita está 100% geolocalizada. |
> | 27 categorias | Confere. Dessas, **15 são `misto`** (não 12). |
>
> ### Uso extra dos totalizadores
>
> A seção 3 manda filtrar `eh_totalizador = FALSE` — continua valendo. Mas eles
> também servem de **auditoria**: o maior totalizador de cada aba é o total que a
> própria planilha calculava naquele mês. Comparado com a soma do detalhe, aponta
> onde a importação não bateu (2020–2026: 84 abas, 49 conferem ao centavo, 35
> divergem, R$15.319 no total).

---

## 1. Como subir e conectar

PostgreSQL 14+. Todos os objetos vivem no schema **`viveiro`**.

```bash
createdb notas_despesas
psql -d notas_despesas -f notas_despesas.sql        # carga base (schema + dados)
# aplicar os enriquecimentos em ordem:
for n in 10 11 12 13 14 15 16 17 18; do
  psql -d notas_despesas -f ${n}_*.sql
done
# em toda sessão / conexão do BI:
SET search_path TO viveiro, public;
```

Os scripts `10`–`18` são **idempotentes** (podem rodar de novo). O `14` requer `municipios.csv`
na mesma pasta (já incluído).

---

## 2. Modelo de dados

**Fatos**

| Tabela | Linhas | O que é |
|---|---:|---|
| `notas_fiscais` | 2.488 | Notas de venda (empresa + produtor). **Receita.** |
| `itens_nota` | 3.425 | Itens das notas (produto, qtd, valor). |
| `despesas` | 42.666 | Lançamentos de despesa 2003–2026. **Ver regra do `eh_totalizador`.** |
| `controle_notas` | 9.094 | Notas expedidas 2004–2026, com qtd por recipiente. |
| `resumo_anual` | 9 | Totais anuais 2000–2008 (anos sem detalhe). |

**Dimensões** (criadas no enriquecimento)

| Tabela | O que é |
|---|---|
| `pessoas` | Clientes/emitentes (dedup por documento). |
| `enderecos` | Endereços; com `regiao`, `cod_municipio_ibge`, `latitude`, `longitude`. |
| `categorias_despesa` | 28 categorias (`nome`, `grupo`, `natureza`). |
| `centros_custo` | Centro (Viveiro, Campo, Floricultura, Casa, Sítio, Clínica) + natureza. |
| `especies` | 118 espécies (`nome_comum`, `nome_cientifico`, `grupo`). |
| `unidades` | Unidades canônicas (MD, UN, SC, CX, KG, G, M, M2, MIL). |
| `municipios_ibge` | 5.570 municípios (código + UF + região + lat/long). |

**Relações principais:** `notas_fiscais` → `pessoas` (emitente/destinatário) → `enderecos`;
`notas_fiscais` 1—N `itens_nota` → `especies`; `despesas` → `categorias_despesa` + `centros_custo`.
`despesas`/`controle_notas` não têm FK rígida com as notas (elo lógico por `numero`).

---

## 3. Regras CRÍTICAS (não negociáveis para BI correto)

1. **`despesas.eh_totalizador` — SEMPRE filtrar `= FALSE`.**
   2.553 linhas são somatórios/totais herdados do Excel. Incluí-las **infla a despesa ~4×**
   (bruto R$28,5M vs real R$6,99M). *Toda* query de despesa começa com `WHERE eh_totalizador = FALSE`.

2. **`despesas.natureza` — separa negócio de pessoal.** Valores: `negocio`, `pessoal`, `misto`.
   O banco mistura gastos do viveiro e da família. Para **DRE/custo do negócio**, use
   `natureza IN ('negocio','misto')`. Pessoal (casa, clínica da mãe) fica de fora.

3. **Receita = `notas_fiscais.valor_total`** (origens `empresa` e `produtor` são ambas venda).
   Não há totalizador na receita.

4. **Volume por recipiente → use `controle_notas`, não `itens_nota`.**
   O `itens_nota` é menos completo nos recipientes maiores (nem toda nota tem itens/XML).
   Para receita por espécie/produto, `itens_nota` serve; para *quantidade* por tamanho, o
   `controle_notas` (colunas `tub`, `r10x18`, `r17x22`, `r20x26`, `r28x32`, `balde`) é a fonte cheia.

5. **Período:** detalhe confiável **2003→2026**. 2000–2002 só como total anual em `resumo_anual`.
   A separação natureza/categoria vale para o período detalhado.

6. **Cobertura (o que não fecha 100%):** categoria de despesa cobre **92,7% do valor**
   (resto = `categoria_id IS NULL`, cauda de fornecedores minúsculos); espécie cobre 99,8%;
   geografia 100%.

---

## 4. Camada analítica — as VIEWS são o contrato do BI

Prefira ler estas views a montar joins do zero. Já aplicam as regras da seção 3.

| View | Grão | Para quê |
|---|---|---|
| `vw_dre_anual` | ano | **DRE executivo**: receita, despesa, resultado, `margem_pct`. |
| `vw_resultado_mensal` | ano, mês | Resultado mensal do negócio (receita − despesa). |
| `vw_despesas_mensal` | ano, mês, centro, grupo, categoria | Despesa de negócio detalhada. |
| `vw_estrutura_custo` | grupo | % de cada grupo no custo do negócio. |
| `vw_despesas_por_natureza` | ano, natureza | Conferência negócio × pessoal. |
| `vw_faturamento_mensal` | ano, mês, origem | Receita por mês e origem. |
| `vw_ranking_clientes` | cliente | Total comprado, 1ª/última compra. |
| `vw_vendas_especie` | espécie | Receita/qtd por espécie (grupo/científico). |
| `vw_vendas_recipiente` | recipiente, tamanho | Mix por embalagem (mudas). |
| `vw_vendas_geo` | município | Vendas por local (com lat/long p/ mapa). |
| `vw_conciliacao_notas` | nota | Controle × NF (confere/divergente/sem NF). |
| `vw_despesas_reais` / `vw_despesas_negocio` | lançamento | Base limpa (sem totalizador) — geral / só negócio. |
| `vw_mix_produtos` | descrição bruta | Legado (use `vw_vendas_especie`). |

**Números de referência (sanidade):** DRE do negócio ~R$400–540k receita/ano, margem **48–79%**.
Estrutura de custo: Operacional produção 34%, Tributos/Serviços 18%, Veículos/Logística 14%.

---

## 5. Dashboards sugeridos (primeira versão do BI)

1. **Visão executiva** — `vw_dre_anual`: receita × despesa × resultado × margem por ano; KPIs do ano corrente.
2. **Financeiro mensal** — `vw_resultado_mensal` (série temporal) + `vw_estrutura_custo` (donut de custo).
3. **Vendas & produto** — `vw_vendas_especie` (top espécies) + `vw_vendas_recipiente` (mix por tamanho) + sazonalidade via `vw_faturamento_mensal`.
4. **Clientes** — `vw_ranking_clientes` (Pareto/curva ABC, recência).
5. **Mapa de vendas** — `vw_vendas_geo` (choropleth por município/UF; pontos por lat/long).
6. **Qualidade fiscal** — `vw_conciliacao_notas` (divergências controle × NF).

Ferramenta: qualquer BI que fale Postgres (Metabase, Power BI, Looker Studio, Superset).
Aponte para as views do schema `viveiro`.

---

## 6. Limites — o que o banco NÃO responde (ainda)

Seja explícito com o usuário se ele pedir estas análises:

- **Margem/custo por produto:** há receita por espécie, mas **não custo por espécie**. As despesas
  estão em nível de categoria, não rateadas por muda. Decisão de preço precisa de um modelo de
  custeio (plano **P1**) — não existe no banco hoje.
- **Produção, estoque e mortalidade:** não há dados (plano **P2**). Não dá para planejar produção
  ou avaliar perdas a partir daqui.
- **Segmento de cliente** (B2C/produtor/paisagista/empresa/governo): campo ainda não criado em `pessoas`.
- **Atualização contínua:** este é um retrato histórico carregado uma vez. Para BI vivo é preciso
  um pipeline de ingestão de notas/despesas novas.
- **Cauda de despesas sem categoria (~7% do valor)** e **grafias duplicadas de espécie**
  (araçá/araca, gerivá/jerivá) — pequenas imprecisões conhecidas.

---

## 7. Exemplos de query

```sql
SET search_path TO viveiro, public;

-- DRE dos últimos anos
SELECT * FROM vw_dre_anual WHERE ano >= 2020;

-- Top 10 espécies por receita
SELECT nome_comum, nome_cientifico, receita
FROM vw_vendas_especie WHERE grupo='especifica' ORDER BY receita DESC LIMIT 10;

-- Despesa do NEGÓCIO por grupo, 2025 (regras já aplicadas na view)
SELECT grupo, sum(valor) valor FROM vw_despesas_mensal WHERE ano=2025 GROUP BY grupo ORDER BY valor DESC;

-- Se for direto na tabela de despesas, NUNCA esqueça os filtros:
SELECT categoria_id, sum(valor_total)
FROM despesas
WHERE eh_totalizador = FALSE AND natureza IN ('negocio','misto') AND ano = 2025
GROUP BY categoria_id;
```

---

## 8. Arquivos nesta pasta

`notas_despesas.sql` (carga base) · `01_schema.sql` · `03_views.sql` (legado) ·
`10`–`18_*.sql` (enriquecimentos, aplicar em ordem) · `municipios.csv` (dimensão IBGE) ·
`INSTALAR_BANCO.md`. Histórico e decisões em
`Base-Viveiro/projetos/ativos/app-gestao/docs/enriquecimento-dados.md`.