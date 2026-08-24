# Modelo de dados em português (versão para o TCC)

Mesmos seis diagramas de [`../C-modelagem/C6-modelo-entidade-relacionamento.md`](../C-modelagem/C6-modelo-entidade-relacionamento.md),
com tabelas e colunas nomeadas em português. A estrutura (entidades, cardinalidades, chaves,
caixas vazias para entidade de outro módulo) é idêntica: muda só a nomenclatura.

Fonte Mermaid em `mmd/`, PNGs em `img/`. Para regerar:

```
npx -y @mermaid-js/mermaid-cli -i mmd/fig06-conceitual.mmd -o img/fig06-conceitual.png -w 1400 -b white
```

| Figura | Arquivo | Conteúdo |
|---|---|---|
| 6 | `fig06-conceitual` | Modelo conceitual, visão geral (18 entidades) |
| 7 | `fig07-acesso` | Acesso, transversal aos quatro módulos |
| 8 | `fig08-cadastros` | Módulo 1, Cadastros |
| 9 | `fig09-producao` | Módulo 2, Produção |
| 10 | `fig10-comercial` | Módulo 3, Comercial |
| 11 | `fig11-financeiro` | Módulo 4, Financeiro |

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
