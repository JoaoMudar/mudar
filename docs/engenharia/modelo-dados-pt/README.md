# Modelo de dados em português (versão para o TCC)

Mesmo modelo de [`../C-modelagem/C6-modelo-entidade-relacionamento.md`](../C-modelagem/C6-modelo-entidade-relacionamento.md),
com tabelas e colunas nomeadas em português. A estrutura (entidades, cardinalidades, chaves,
caixas vazias para entidade de outro módulo) é idêntica: muda a nomenclatura e o recorte das figuras.

**Os módulos grandes foram divididos.** Um diagrama de 20 entidades com 10 atributos cada tem
cerca de 200 linhas de texto, que não cabem legíveis em uma página A4: a fonte cai para 3 pt.
Cada módulo foi quebrado nas subseções que o próprio texto do C6 já usa, de modo que toda figura
fica acima de 6 pt na mancha de 16 cm. São 15 figuras no lugar de 6.

Fonte Mermaid em `mmd/`, PNGs em `img/`, layout em `mermaid-config.json` (`nodeSpacing` 30 e
`rankSpacing` 45 no lugar dos padrões 140 e 80 do Mermaid, que são a causa do espalhamento).
Para regerar uma figura:

```
npx -y @mermaid-js/mermaid-cli -i mmd/fig06-conceitual-producao.mmd -o img/fig06-conceitual-producao.png -c mermaid-config.json -s 3 -b white
```

O `-s 3` renderiza a 3x: no Word a imagem entra reduzida e continua nítida na impressão.

> ⚠️ **Esta pasta não é gerada por script.** `npm run docs:tcc` e `npm run docs:mapas` não passam
> por aqui. Toda mudança em `C6`/`C8` (entidade, atributo, chave, cardinalidade) precisa ser
> repetida no `.mmd` da figura correspondente e o `.png` regerado com o comando acima. Confira
> depois a **fonte útil** na tabela abaixo: ela muda quando a figura muda de proporção. Regra
> declarada no [`CLAUDE.md`](../../../CLAUDE.md) §Banco de dados.

## Figuras

| Fig. | Arquivo | Conteúdo | Fonte útil |
|---:|---|---|---|
| 6 | `fig06-conceitual-producao` | Conceitual: da semente à muda pronta | 8,7 pt |
| 7 | `fig07-conceitual-comercial` | Conceitual: do custo ao dinheiro | 6,5 pt |
| 8 | `fig08-acesso` | Acesso e parâmetros, transversais aos quatro módulos | 7,3 pt |
| 9 | `fig09-cadastros-especie` | Cadastros: a espécie e seus nomes | 15,8 pt |
| 10 | `fig10-cadastros-insumo-recipiente` | Cadastros: recipiente, insumo e tipo de tarefa | 7,7 pt |
| 11 | `fig11-cadastros-viveiro` | Cadastros: área, canteiro e turno de trabalho | 16,3 pt |
| 12 | `fig12-cadastros-pessoas` | Cadastros: identidade única e papéis | 6,9 pt |
| 13 | `fig13-producao-agenda` | Produção: semana e atribuição | 5,6 pt · **usar paisagem** (7,3 pt) |
| 14 | `fig14-producao-recorrencia` | Produção: a tarefa recorrente | 8,6 pt |
| 15 | `fig15-producao-apontamento` | Produção: apontamento e gasto de tarefa | 6,6 pt |
| 16 | `fig16-producao-lote` | Produção: o lote e seus movimentos | 9,5 pt |
| 17 | `fig17-producao-campo` | Produção: consumo, perda e contagem | 5,5 pt · **usar paisagem** (8,2 pt) |
| 18 | `fig18-comercial-pedido` | Comercial: pedido, item e carga | 7,3 pt |
| 19 | `fig19-comercial-cotacao` | Comercial: cotação com fornecedor | 12,5 pt |
| 20 | `fig20-financeiro-extrato` | Financeiro: o extrato como fonte da verdade | 6,4 pt |
| 21 | `fig21-financeiro-classificacao` | Financeiro: categoria, centro de custo e regra | 9,5 pt |
| 22 | `fig22-financeiro-custo-preco` | Financeiro: do custo ao preço | 6,9 pt |

**A antiga Figura 13 virou três, em 26/08/2026, e daí a renumeração.** Ela juntava planejamento e
execução e já era a mais apertada da série, a 6,2 pt. A tarefa recorrente entrou, e com ela as
chaves de local (`area_id`, `canteiro_id`) em três entidades: a figura caiu para **4,9 pt**, abaixo
do piso de legibilidade impressa.

**Foram medidas todas as combinações de duas figuras, e nenhuma passa dos 6 pt.** O motivo é
estrutural: `atribuicoes` recebe **nove relacionamentos**, e mermaid os dispõe numa linha só, o que
governa a largura. Dividir em planejamento, recorrência e apontamento é o único corte em que as
três metades cabem, e coincide com o corte que o próprio modelo faz: a regra, o dia planejado e o
dia realizado. **As figuras 14 a 21 antigas passaram a 15 a 22.**

> **A primeira divisão, feita horas antes, custou dois relacionamentos**, e foi a auditoria que os
> encontrou: `especies ||--o{ atribuicoes` e `recipientes ||--o{ atribuicoes` sumiram, deixando
> `atribuicoes.especie_id` e `atribuicoes.recipiente_id` desenhados apontando para nada. É
> exatamente o que a caixa de aviso ao final desta página manda conferir, e foi ignorado. **A
> conferência não é opcional**, e o comando está lá embaixo.

"Fonte útil" é o tamanho que o texto assume ao encaixar a figura na mancha de 16 x 24 cm, limitado
pela largura ou pela altura, o que apertar primeiro. Abaixo de 6 pt não se lê impresso.

**Duas figuras exigem paisagem, a 13 e a 17.** A 17 é uma faixa de 105 x 37 cm, e em retrato a
largura a esmaga para 5,5 pt; girada, a dimensão longa ocupa a altura e sobe para 8,2 pt. A 13 é
quase quadrada (3918 x 2994 px) e sobe de 5,6 para 7,3 pt pelo mesmo motivo: a mancha é mais larga
do que alta quando girada, e a largura é o que aperta ali.

**As figuras posteriores deslocam em 11.** O capítulo 4 ia até a Figura 18 antes destas; com 17
figuras no lugar das 6 originais, a arquitetura (4.6) passa a começar na Figura 23 e a segurança
(4.7) na 29.

## Como as divisões foram feitas

| Figura original | Virou | Critério |
|---|---|---|
| 6 · Conceitual (20 entidades) | 6 e 7 | O ciclo produtivo, contra o ciclo do dinheiro |
| 8 · Cadastros (16 entidades) | 9, 10, 11 e 12 | Catálogo botânico, catálogo de custeio, endereço do viveiro, identidade das pessoas |
| 9 · Produção (14) | 13, 14, 15, 16 e 17 | O dia planejado, a regra que o gera, o dia realizado, o lote, o que se consome e se perde |
| 10 · Comercial (8) | 18 e 19 | Ciclo do pedido, contra a cotação que o complementa |
| 11 · Financeiro (14) | 20, 21 e 22 | As duas subseções do texto (extrato, custo ao preço), mais a classificação |

**Por que o conceitual foi dividido em 24/08/2026.** Ele resistiu à primeira rodada de divisões
como figura única, ao custo de virar uma faixa de 3,5:1 que só se lia em paisagem, a 8,2 pt. Com o
lote no escopo, passou a 20 entidades e 4,7:1: 3,8 pt em retrato e **5,7 pt mesmo em paisagem**,
abaixo do limite. Dividido em dois, cabe em retrato a 8,7 e 6,5 pt, sem desdobrável.

O corte é o mesmo que o texto do C6 já faz: um lado é o **ciclo produtivo**, da semente à muda
pronta, com o custo apurado na ponta; o outro é o **ciclo do dinheiro**, do custo ao preço, ao
pedido e ao lançamento. `CUSTO_PRODUCAO` aparece nas duas, e é de propósito: é a dobradiça entre
elas, o ponto em que o que se gastou vira o que se cobra.

> **A divisão não pode custar relacionamento.** A primeira versão da `fig06` deixou de fora
> `ESPECIE → PRODUCAO` e `ESPECIE → PERDA`, que o `C6` traz: com elas ausentes, a leitura do `C6`
> "a espécie participa de sete relacionamentos" não se comprovava em figura nenhuma, e era a
> própria centralidade da espécie que deixava de aparecer. As duas voltaram, e a ordem de
> declaração foi reescrita para evitar rótulos sobrepostos (a fonte útil caiu de 10,5 para 8,7 pt,
> ainda bem acima do limite). **Ao dividir uma figura, confira o total de relacionamentos das duas
> partes contra o original**, e não só o de entidades.
>
> **Aconteceu de novo em 26/08/2026**, com a `fig13`: a divisão perdeu `especies ||--o{ atribuicoes`
> e `recipientes ||--o{ atribuicoes`, e ninguém notou até a auditoria. Duas vezes é padrão, não
> descuido: **a conferência passou a ser um comando**, e não uma lembrança.

### Como conferir uma divisão

Do diretório do repositório, comparando o original com as partes que o substituíram:

```bash
git show HEAD:docs/engenharia/modelo-dados-pt/mmd/figNN-original.mmd | grep -c '||--'
cat docs/engenharia/modelo-dados-pt/mmd/figNN-parte-a.mmd \
    docs/engenharia/modelo-dados-pt/mmd/figNN-parte-b.mmd | grep -c '||--'
```

O segundo número tem de ser **maior ou igual** ao primeiro, e a diferença tem de ser explicável
uma a uma. Para ver quais sumiram em vez de só contar:

```bash
comm -23 \
  <(git show HEAD:docs/.../figNN-original.mmd | grep '||--' | sed 's/  */ /g;s/^ //' | sort) \
  <(cat docs/.../figNN-parte-*.mmd | grep '||--' | sed 's/  */ /g;s/^ //' | sort)
```

Saída vazia é o resultado esperado. Qualquer linha que apareça é um relacionamento perdido.

**Confira também contra o [`C6`](../C-modelagem/C6-modelo-entidade-relacionamento.md)**, e não só
contra o original: a divisão costuma acontecer junto com a entrada de entidade nova, e o que o `C6`
desenha e a figura não é a mesma falha por outro caminho.

## Correspondência de nomes de tabela

| Banco (código) | Diagrama (TCC) | Módulo |
|---|---|---|
| `users` | `usuarios` | Acesso |
| `sessions` | `sessoes` | Acesso |
| `login_events` | `eventos_login` | Acesso |
| `notifications` | `notificacoes` | Acesso |
| `settings` | `configuracoes` | Acesso |
| `species` | `especies` | Cadastros |
| `species_popular_names` | `especies_nomes_populares` | Cadastros |
| `species_photos` | `especies_fotos` | Cadastros |
| `containers` | `recipientes` | Cadastros |
| `inputs` | `insumos` | Cadastros |
| `input_price_history` | `insumos_historico_precos` | Cadastros |
| `customers` | `clientes` | Cadastros |
| `suppliers` | `fornecedores` | Cadastros |
| `supplier_species` | `fornecedores_especies` | Cadastros |
| `cadastro.parties` | `pessoas` | Cadastros |
| `cadastro.party_roles` | `pessoas_papeis` | Cadastros |
| `cadastro.addresses` | `enderecos` | Cadastros |
| `task_types` | `tipos_tarefa` | Cadastros |
| `areas` | `areas` | Cadastros |
| `beds` | `canteiros` | Cadastros |
| `work_shifts` | `turnos_trabalho` | Cadastros |
| `batches` | `lotes` | Produção |
| `batch_movements` | `movimentos_lote` | Produção |
| `input_usages` | `usos_insumo` | Produção |
| `input_stock_entries` | `entradas_estoque_insumo` | Produção |
| `input_stock_balance` *(visão)* | `saldo_estoque_insumo` | Produção |
| `seed_collection_costs` | `custos_coleta_sementes` | Produção |
| `task_executions` | `execucoes_tarefa` | Produção |
| `task_expenses` | `gastos_tarefa` | Produção |
| `loss_events` | `eventos_perda` | Produção |
| `stock_counts` | `contagens_estoque` | Produção |
| `week_plans` | `planos_semana` | Produção |
| `assignments` | `atribuicoes` | Produção |
| `assignment_members` | `atribuicoes_participantes` | Produção |
| `task_recurrences` | `recorrencias_tarefa` | Produção |
| `task_recurrence_members` | `recorrencias_participantes` | Produção |
| `batch_health` *(visão)* | `situacao_lote` | Produção |
| `orders` | `pedidos` | Comercial |
| `order_items` | `pedidos_itens` | Comercial |
| `order_item_allowed_species` | `pedidos_itens_especies_permitidas` | Comercial |
| `order_loads` | `pedidos_cargas` | Comercial |
| `order_load_items` | `pedidos_cargas_itens` | Comercial |
| `order_status_history` | `pedidos_historico_situacao` | Comercial |
| `supplier_quotes` | `cotacoes_fornecedor` | Comercial |
| `supplier_quote_items` | `cotacoes_fornecedor_itens` | Comercial |
| `labor_rates` | `taxas_mao_de_obra` | Financeiro |
| `fixed_costs` | `custos_fixos` | Financeiro |
| `production_costs` | `custos_producao` | Financeiro |
| `financeiro.accounts` | `contas` | Financeiro |
| `financeiro.cost_centers` | `centros_custo` | Financeiro |
| `financeiro.category_groups` | `grupos_categoria` | Financeiro |
| `financeiro.categories` | `categorias` | Financeiro |
| `financeiro.statement_imports` | `importacoes_extrato` | Financeiro |
| `financeiro.transactions` | `lancamentos` | Financeiro |
| `financeiro.transaction_splits` | `lancamentos_rateios` | Financeiro |
| `financeiro.classification_rules` | `regras_classificacao` | Financeiro |
| `financeiro.periods` | `periodos` | Financeiro |
| `sale_channels` | `canais_venda` | Financeiro |
| `sale_prices` | `precos_venda` | Financeiro |

Colunas que mudaram de sentido e não só de idioma, vale registrar:

- `input_usages.client_id` virou `usos_insumo.id_offline`: o `client_id` original é o identificador
  gerado no aparelho antes do envio (RNF-05), nada a ver com cliente. O mesmo vale para
  `task_executions.client_id` e `loss_events.client_id`, que viraram `execucoes_tarefa.id_offline`
  e `eventos_perda.id_offline`.
- `order_status_history.from_status` / `to_status` viraram `situacao_anterior` / `situacao_nova`,
  porque `status` foi traduzido como `situacao` em todo o modelo.
- `batches.parent_batch_id` virou `lotes.lote_origem_id`. "Pai" descreve a estrutura da árvore;
  "origem" descreve o que o viveiro faz, que é dizer de onde aquela leva veio.
- `batch_movements.from_bed_id` / `to_bed_id` viraram `canteiro_origem_id` / `canteiro_destino_id`,
  pelo mesmo critério das colunas de situação: preposição em inglês vira substantivo em português.
