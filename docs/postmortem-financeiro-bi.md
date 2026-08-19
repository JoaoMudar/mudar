# Post-mortem: o BI financeiro construído sobre a planilha (P12, ago/2026)

> **Status: abordagem abandonada em 05/08/2026.** Este documento existe para não
> repetirmos o erro. A abordagem nova está em
> [`plans/P12-conciliacao-bancaria.md`](../plans/P12-conciliacao-bancaria.md):
> **o extrato do banco é a verdade, a planilha vira só a explicação dele.**

## O que foi tentado

Importar o histórico da planilha `DESPESAS AAAA.xls` (banco `notas_despesas`,
schema `viveiro`, 42.666 linhas de 2003 a 2026) para dentro do banco do app como
o schema `financeiro`, e construir 11 views `vw_bi_*` + 8 telas em `/financeiro`
por cima. Em 4 dias ficou de pé: painel executivo, mensal, custos, vendas,
clientes, lançamento de despesa, fila de categorização e tela de qualidade.

Funcionava. O problema nunca foi o código.

## Por que foi abandonado

**A planilha não é uma fonte de dados: é a memória de uma pessoa em forma de
grade.** Cada defeito abaixo foi medido contra a base real, não suposto. Nenhum é
bug de importação: são propriedades do artefato que estávamos tratando como
fonte da verdade.

### 1. A base não sabe o que é dinheiro e o que é rótulo

| Defeito | Tamanho medido |
|---|---|
| Linhas de subtotal herdadas do Excel (`eh_totalizador`) | 2.554 linhas: incluí-las inflava a despesa **~4×** (R$21,5M sobre R$7M reais) |
| Rótulo digitado em coluna de dinheiro (`%`, `Folha`) | 72 células em toda a base |
| Numeração de veículo (1 a 11) na coluna DESCRIÇÃO em Jun26/Jul26 | 22 falsos lançamentos, R$12.875,11 de combustível **já contado no detalhe** |

Cada um exigiu uma regra de leitura própria. Cada regra é uma chance de errar em
silêncio, e nenhuma delas se defende sozinha de um novo hábito de digitação.

### 2. A classificação negócio × pessoal estava furada nos dois sentidos

Medido em 2020+, usando a coluna `despesas.natureza`:

- **R$48.793** de gasto pessoal (mercado, moradia, lazer, saúde) marcado como
  `negocio` → entrava no DRE sem dever.
- **R$63.311** de gasto de negócio (mão de obra R$31,1k, contabilidade R$16,2k,
  insumos R$14,6k) marcado como `pessoal` → ficava de fora.

A correção foi deduzir a natureza da **categoria** + rateio por centro de custo,
nunca da linha. Funcionou: mas é uma camada de conserto sobre um dado que nasceu
errado porque **conta pessoal e conta de empresa são a mesma conta**. É esse o
problema de raiz, e ele não se resolve no software.

### 3. Categoria digitada à mão vira categoria errada

Muda comprada de outro produtor (Márcio Kuhar, Sávio Giacomozzi, Artêmio,
Guilherme Ponticelli) para revenda caía em **Insumos/Produção**. Não é insumo de
produção, é custo de mercadoria, com margem diferente. Uma migração separou
**215 lançamentos / R$111.726,50**. Em 2025 isso era **R$28,9k de R$52,5k, 55% do
"insumo" não era insumo.**

Origem do erro: campo de texto livre. Daí a decisão nº 4 do plano novo.
**lista fechada, sem campo aberto, sem typo.**

### 4. A planilha anda depois do import, e não avisa

Conferência linha a linha de 05/08/2026 contra os 24 arquivos `.xls` originais:
das 42.666 linhas, **41.844 batiam campo a campo**, mais 179 depois de descontado
deslocamento de linha. De 2003 a 2025 o banco reproduzia a planilha.

E mesmo assim faltavam **R$299.047,85: 100% deles em 2026**, o ano vivo:

| Forma da defasagem | Linhas | Valor |
|---|---|---|
| Meses inteiros que nunca entraram (mai–ago/26) | 560 | R$255.066,13 |
| Linhas novas em meses que já existiam | 139 | R$32.230,72 |
| Linhas que entraram **com o valor vazio** | 26 | R$11.751,00 |

**A terceira linha é a que ensina.** O Gilberto deixa os gastos fixos
pré-digitados em vermelho no começo do mês (Contab, Luz, Condomínio, INSS, FGTS,
Mesada) e só preenche o valor quando a conta chega. O import passou no meio: veio
a descrição, não veio o valor.

Consequência: **abr/2026 aparecia verde** na grade de cobertura, "tem lançamento
nesse mês": e estava subestimado em R$8.798,18. A grade responde *"tem linha
nesse mês?"*, nunca *"as linhas têm valor?"*. Um mês pela metade passa por
completo.

Some-se a isso: as abas `Mai25..Dez25` foram renomeadas para `…26` depois do
import, e 448 linhas apareceram como "sobrando".

### 5. Em vários meses o banco estava mais certo que a planilha

35 meses divergiam na tela de qualidade. Em ago/2020 o banco reproduzia o Excel
com 100% de acerto e ainda assim o total da planilha (R$45.916,89) não fechava com
a soma do próprio detalhe dela (R$45.970,28), **−R$53,39, a fórmula `SUM`
deixando linha de fora do intervalo.** O padrão se repete em vários meses.

Quando a fonte da verdade não fecha consigo mesma, não há conciliação possível:
não existe resposta certa para comparar.

### 6. O que sobrava de trabalho humano não diminuía

Ao final, a fila de categorização tinha **2.764 linhas / R$407.138,09** sem
categoria. Cada linha nova nascia sem categoria, de propósito. A triagem por valor
(497 lançamentos ≥ R$100 = 65% do valor) tornava viável, mas é uma fila que
**cresce sozinha e nunca zera**, porque a entrada de dados continua sendo digitação
livre num Excel.

O plano novo inverte: nada existe se não bater com um movimento do banco, e o
movimento chega pronto no OFX. A fila passa a ser só o que não casou.

## O que fica de aprendizado, independente de ferramenta

1. **Fonte da verdade é o que a realidade registrou sozinho** (extrato), não o que
   alguém digitou depois (planilha).
2. **Ano em curso ≠ ano fechado.** Comparar 2026 parcial com 2025 cheio inventa
   variação. Se um período está incompleto, o número tem que ser suprimido, um
   travessão leva à pergunta certa, uma margem de 74,1% falsa leva à decisão errada.
3. **"Tem dado no mês" não é "o mês está completo".** Qualquer indicador de
   cobertura precisa olhar valor, não existência de linha.
4. **Campo de texto livre é dívida.** Categoria digitada à mão sempre vira
   categoria errada em escala.
5. **Separar conta pessoal de conta de empresa é pré-requisito, não detalhe.**
   Sem isso, toda apuração de margem carrega um conserto estatístico por cima.
   (Passado: negócio R$3,69M, pessoal R$3,30M, quase meio a meio.)
6. **View empilhada não tem índice para se apoiar.** Uma subquery escalar
   correlacionada sobre uma view que varre 60k linhas fez o DRE anual levar 11 s
   para devolver 7 linhas (13 subqueries × 7 anos ≈ 150 varreduras completas). O
   padrão certo: agregar uma vez em CTE (`GROUP BY ano, mes`) e recortar com
   `FILTER` sobre o resultado já pequeno. Depois: ~130 ms.
7. **Migration com guarda `IF ... IS NULL THEN RETURN` roda como no-op e mesmo
   assim é marcada como aplicada.** No Neon as 6 migrations do BI ficaram
   registradas sem nunca terem criado nada: todo deploy da Vercel roda
   `tsx scripts/migrate.ts && next build`. Se um dia o schema fosse importado lá,
   `db:migrate` responderia "nenhuma migração pendente" e as views nunca
   existiriam. Guarda de migration precisa vir com uma forma de desmarcar.

## O que sobreviveu na branch

| Item | Onde |
|---|---|
| Formatação pt-BR (moeda, data, percentual) + testes | `src/lib/format.ts` |
| Base de gráficos Recharts (moldura, tile, paleta validada) | `src/components/charts/` |
| Descrição do banco histórico e suas regras críticas | `readmeBI.md` |
| Este post-mortem | você está aqui |

## Onde está o resto

Nada foi destruído. A branch **`feat/financeiro-bi`** continua no repositório
(topo em `1433548`, também em `origin`), com as 8 telas, as 11 views, as 6
migrations, o `bi-sanity` de 32 verificações, o conferidor de planilha e o
sincronizador de ano. Para consultar sem trocar de branch:

```bash
git show feat/financeiro-bi:docs/rotinas/financeiro-bi.md   # a doc original, 369 linhas
git log --stat feat/financeiro-bi -12                        # tudo que existia
```

O banco de origem **`notas_despesas`** (Postgres local, schema `viveiro`, 42.666
linhas) está intacto: é ele que vai ser conciliado com os extratos na Fase 3 do
plano novo. O schema `financeiro` dentro do banco `viveiro` era só uma cópia dele,
e foi removido.
