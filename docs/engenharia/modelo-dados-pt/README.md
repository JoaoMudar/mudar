# Modelo de dados em português (versão para o TCC)

Mesmo modelo de [`../C-modelagem/C6-modelo-entidade-relacionamento.md`](../C-modelagem/C6-modelo-entidade-relacionamento.md),
com tabelas e colunas nomeadas em português. A estrutura (entidades, cardinalidades, chaves,
caixas vazias para entidade de outro módulo) é idêntica: muda a nomenclatura e o recorte das figuras.

**Os módulos grandes foram divididos.** Um diagrama de 20 entidades com 10 atributos cada tem
cerca de 200 linhas de texto, que não cabem legíveis em uma página A4: a fonte cai para 3 pt.
Cada módulo foi quebrado nas subseções que o próprio texto do C6 já usa, de modo que toda figura
fica acima de 6 pt na mancha de 16 cm. São 12 figuras no lugar de 6.

Fonte Mermaid em `mmd/`, PNGs em `img/`, layout em `mermaid-config.json` (`nodeSpacing` 30 e
`rankSpacing` 45 no lugar dos padrões 140 e 80 do Mermaid, que são a causa do espalhamento).
Para regerar uma figura:

```
npx -y @mermaid-js/mermaid-cli -i mmd/fig06-conceitual.mmd -o img/fig06-conceitual.png -c mermaid-config.json -s 3 -b white
```

O `-s 3` renderiza a 3x: no Word a imagem entra reduzida e continua nítida na impressão.

## Figuras

| Fig. | Arquivo | Conteúdo | Fonte útil |
|---:|---|---|---|
| 6 | `fig06-conceitual` | Modelo conceitual, visão geral (18 entidades) | 5,1 pt · **usar paisagem** (8,2 pt) |
| 7 | `fig07-acesso` | Acesso, transversal aos quatro módulos | 10,1 pt |
| 8 | `fig08-cadastros-especie` | Cadastros: a espécie e seus nomes | 15,8 pt |
| 9 | `fig09-cadastros-insumo-recipiente` | Cadastros: recipiente, insumo e tipo de tarefa | 7,4 pt |
| 10 | `fig10-cadastros-pessoas` | Cadastros: identidade única e papéis | 6,2 pt |
| 11 | `fig11-producao-agenda` | Produção: agenda e execução | 8,4 pt |
| 12 | `fig12-producao-campo` | Produção: consumo, perda e contagem | 6,5 pt |
| 13 | `fig13-comercial-pedido` | Comercial: pedido, item e carga | 7,3 pt |
| 14 | `fig14-comercial-cotacao` | Comercial: cotação com fornecedor | 12,4 pt |
| 15 | `fig15-financeiro-extrato` | Financeiro: o extrato como fonte da verdade | 6,4 pt |
| 16 | `fig16-financeiro-classificacao` | Financeiro: categoria, centro de custo e regra | 9,0 pt |
| 17 | `fig17-financeiro-custo-preco` | Financeiro: do custo ao preço | 7,1 pt |

"Fonte útil" é o tamanho que o texto assume ao encaixar a figura na mancha de 16 x 24 cm, limitado
pela largura ou pela altura, o que apertar primeiro. Abaixo de 6 pt não se lê impresso.

**A Figura 6 é uma faixa larga e baixa (3,5:1).** Em página retrato fica em 5,1 pt. Em página
paisagem, ou girada 90 graus, a dimensão longa passa a ocupar a altura e a fonte sobe para 8,2 pt.

**As figuras posteriores deslocam em 6.** O capítulo 4 vai hoje até a Figura 18; com estas 12 no
lugar das 6 originais, a arquitetura (4.6) passa a começar na Figura 18 e a segurança (4.7) na 24.

## Como as divisões foram feitas

| Figura original | Virou | Critério |
|---|---|---|
| 8 · Cadastros (13 entidades) | 8, 9 e 10 | Catálogo botânico, catálogo de custeio, identidade das pessoas |
| 9 · Produção (7) | 11 e 12 | O que se planeja e executa, contra o que se consome e se perde |
| 10 · Comercial (8) | 13 e 14 | Ciclo do pedido, contra a cotação que o complementa |
| 11 · Financeiro (14) | 15, 16 e 17 | As duas subseções do texto (extrato, custo ao preço), mais a classificação |

## Correspondência de nomes de tabela

| Banco (código) | Diagrama (TCC) | Módulo |
|---|---|---|
| `users` | `usuarios` | Acesso |
| `sessions` | `sessoes` | Acesso |
| `login_events` | `eventos_login` | Acesso |
| `notifications` | `notificacoes` | Acesso |
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
| `input_usages` | `usos_insumo` | Produção |
| `seed_collection_costs` | `custos_coleta_sementes` | Produção |
| `production_activities` | `atividades_producao` | Produção |
| `loss_events` | `eventos_perda` | Produção |
| `stock_counts` | `contagens_estoque` | Produção |
| `week_plans` | `planos_semana` | Produção |
| `assignments` | `atribuicoes` | Produção |
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

Duas colunas mudaram de sentido e não só de idioma, vale registrar:

- `input_usages.client_id` virou `usos_insumo.id_offline`: o `client_id` original é o identificador
  gerado no aparelho antes do envio (RNF-05), nada a ver com cliente.
- `order_status_history.from_status` / `to_status` viraram `situacao_anterior` / `situacao_nova`,
  porque `status` foi traduzido como `situacao` em todo o modelo.
