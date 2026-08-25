# B5: Matriz de rastreabilidade

> **Artefato:** Matriz de rastreabilidade · **Bloco:** B, Engenharia de requisitos
> **Destino no TCC:** Capítulo 4, seção 4.10 (recorte comentado) e Apêndice (integral)
> **Fundamentação:** Sommerville (2011) descreve a organização dos requisitos, inicialmente não
> estruturados, em conjuntos coerentes associados aos subsistemas da aplicação, e trata o
> gerenciamento de requisitos como atividade que exige rastrear as relações entre eles e os demais
> artefatos do projeto.

---

## 1. O que esta matriz faz

Liga cada requisito funcional aos quatro artefatos que o realizam:

```
Requisito (B2) → Caso de uso (C1, C2) → Entidade (C6, C8) → Acesso (D4) → Teste de aceite (E2)
```

**O valor da matriz não é a tabela: é o que ela revela ao ser construída.** Um requisito sem caso de
uso é funcionalidade sem quem a execute. Um requisito sem entidade é dado sem onde persistir. Um
requisito sem teste é promessa sem verificação. Nenhuma dessas lacunas aparece lendo os documentos
isoladamente; todas aparecem quando são confrontados linha a linha.

A seção 5 registra o que este confronto de fato produziu neste projeto.

---

## 2. Matriz: requisitos funcionais

As seções seguem os **quatro módulos** do sistema, na mesma ordem da
[`B2 §2`](B2-especificacao-requisitos.md), Acesso primeiro, por ser transversal. Os
identificadores não foram renumerados: a ordem numérica não acompanha a das seções, e
renumerar quebraria justamente a rastreabilidade que esta matriz existe para sustentar.

### 2.1 Acesso: transversal aos quatro módulos

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-01 | UC-01 | `users`, `sessions` | Autenticação | TA-01 |
| RF-02 | UC-02 | `users` | Autenticação | TA-02 |
| RF-03 | UC-04 | `sessions` | Sessões próprias | TA-05 |
| RF-04 | UC-04 | `login_events` | Auditoria de acesso | TA-06 |
| RF-05 | UC-03 | `users` | Usuários e perfis | TA-48 |
| RF-06 | UC-03 | *transversal* | Todos os recursos | TA-03 |
| RF-07 | UC-04 | `sessions` | Sessões próprias | TA-05 |

### 2.2 Módulo 1 · Cadastros

#### 2.2.1 Catálogo de produção

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-08 | UC-05 | `species`, `species_popular_names` | Espécies | TA-07 |
| RF-09 | UC-05 | `species_popular_names` | Espécies | TA-07 |
| RF-10 | UC-06 | `containers` | Recipientes | TA-49 |
| RF-11 | UC-07 | `inputs`, `input_price_history` | Insumos | TA-10 |
| RF-80 | UC-46 | `areas` | Áreas e canteiros | TA-59 |
| RF-81 | UC-46 | `beds`, `areas` | Áreas e canteiros | TA-59 |

#### 2.2.2 Pessoas: cliente, fornecedor, funcionário

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-36 | UC-21 | `customers` | Clientes | TA-20 |
| RF-37 | UC-22 | `customers` | Dados fiscais de cliente | TA-27 |
| RF-38 | UC-22 | `customers` | Dados fiscais de cliente | TA-21 |
| RF-39 | UC-23 | `customers` | Clientes | TA-54 |
| RF-40 | UC-22, UC-26 | `customers`, `orders` | Dados fiscais de cliente | TA-27 |
| RF-52 | UC-31 | `suppliers`, `supplier_species` | Fornecedores | - *(DV)* |
| RF-69 | UC-41 | `cadastro.parties`, `cadastro.party_roles` | Funcionários | TA-60 |

#### 2.2.3 Classificação financeira: centro de custo

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-77 | UC-45 | `financeiro.cost_centers` | Centros de custo | TA-56 |
| RF-78 | UC-45 | `financeiro.cost_centers`, `financeiro.transactions` | Centros de custo | TA-57 |
| RF-79 | UC-45 | `financeiro.cost_centers`, `financeiro.transactions` | Centros de custo | TA-58 |

#### 2.2.4 Trabalho: tipo de tarefa e período de trabalho

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-70 | UC-42 | `task_types` | Tarefas | TA-61 |
| RF-82 | UC-42, UC-51 | `task_types` | Tarefas | TA-61 |
| RF-83 | UC-54 | `work_shifts` | Período de trabalho | TA-62 |

### 2.3 Módulo 2 · Produção

#### 2.3.1 Registro de campo

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-13 | UC-09 | `seed_collection_costs` | Coleta de sementes | - *(DV)* |
| RF-14 | UC-10 | `input_usages` | Consumo de insumo | TA-08 |
| RF-19 | UC-12 | `task_executions` | Atividades de produção | TA-50 |
| RF-20 | UC-13, UC-40 | `assignments`, `assignment_members` | Atividades de produção | - *(DV)* |
| RF-21 | UC-14 | `batches`, `species` | Atividades de produção | - *(DV)* |
| RF-71 | UC-43 | `week_plans`, `assignments` | Tarefas | TA-69 |
| RF-72 | UC-43 | `week_plans`, `assignments` | Tarefas | TA-71 |
| RF-73 | UC-43 | `week_plans` | Tarefas | TA-72 |
| RF-74 | UC-44 | `assignments`, `task_executions` | Tarefas | TA-73 |
| RF-75 | UC-43 | `assignments`, `task_executions` | Tarefas | TA-79 |
| RF-92 | UC-43 | `assignment_members` | Tarefas | TA-69 |
| RF-93 | UC-43 | `assignments` | Tarefas | TA-70 |
| RF-94 | UC-50 | `task_executions`, `assignment_members` | Apontamento | TA-74 |
| RF-95 | UC-50 | `task_executions` | Apontamento | TA-74 |
| RF-96 | UC-52 | `task_executions` | Apontamento | TA-76 |
| RF-97 | UC-50 | `task_executions` | Apontamento | TA-75 |
| RF-98 | UC-51 | `task_executions`, `task_types` | Apontamento | TA-77 |
| RF-99 | UC-51 | `task_executions`, `batches` | Apontamento | TA-78 |
| RF-100 | UC-51, UC-52 | `task_executions`, `work_shifts`, `labor_rates` | Apontamento | TA-79, TA-80 |
| RF-101 | UC-53 | `input_usages`, `task_executions` | Estoque de insumo | TA-81 |
| RF-102 | UC-55 | `input_stock_balance` *(visão)* | Estoque de insumo | TA-81 |
| RF-103 | UC-55 | `input_stock_balance` *(visão)* | Estoque de insumo | - *(DV)* |
| RF-104 | UC-53 | `task_expenses` | Gastos de tarefa | TA-83, TA-84 |
| RF-105 | UC-51 | `input_usages`, `input_stock_balance` | Estoque de insumo | TA-82 |
| RF-106 | UC-56 | `input_stock_entries` | Estoque de insumo | TA-85 |
| RF-107 | UC-51 | `task_executions`, `assignment_members` | Apontamento | TA-77, TA-86 |

#### 2.3.2 Estoque

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-22 | UC-15 | *derivada*: `batches`, `task_executions`, `loss_events`, `order_items` | Estoque | **TA-51** |
| RF-23 | UC-16 | `stock_counts` | Estoque | TA-52 |
| RF-24 | UC-15 | *derivada* | Estoque | - *(DV)* |
| RF-25 | UC-16 | `stock_counts` | Estoque | - *(P)* |

#### 2.3.3 Perdas

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-26 | UC-17 | `loss_events` | Perdas | TA-13, TA-14 |
| RF-27 | UC-18 | `loss_events` | Perdas | TA-53 |
| RF-28 | UC-18 | `loss_events`, `batches` | Análise de perdas | TA-15 |
| RF-29 | UC-18 | `loss_events`, `notifications` | Análise de perdas | TA-15, TA-16 |
| RF-30 | UC-18 | `loss_events`, `species_unit_cost` | Análise de perdas | - *(DV)* |

#### 2.3.4 Lotes, áreas e canteiros

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-84 | UC-47 | `batches`, `beds` | Lotes | TA-63 |
| RF-85 | UC-49 | `batches`, `beds`, `areas` | Lotes | TA-64 |
| RF-86 | UC-48 | `batches`, `batch_movements` | Lotes | TA-65, TA-66 |
| RF-87 | UC-49 | `batch_movements` | Lotes | TA-65 |
| RF-88 | UC-48 | `batches`, `batch_movements` | Lotes | TA-67 |
| RF-89 | UC-49 | `batches`, `beds` | Lotes | TA-64 |
| RF-90 | UC-47 | `batches`, `species` | Lotes | TA-63 |
| RF-91 | UC-17, UC-16 | `batches`, `loss_events`, `stock_counts` | Lotes | TA-66, TA-68 |

### 2.4 Módulo 3 · Comercial

#### 2.4.1 Pedidos

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-41 | UC-24 | `orders`, `order_items` | Pedidos | TA-22 |
| RF-42 | UC-25 | `order_items` | Verificação de disponibilidade | TA-24 |
| RF-43 | UC-25 | `order_items` | Verificação de disponibilidade | TA-24 |
| RF-44 | UC-26 | `orders`, `order_items` | Aprovação de pedido | TA-26 |
| RF-45 | UC-26 | `orders` | Pedidos | TA-27 |
| RF-46 | UC-26 | `order_loads`, `order_load_items` | Cargas | TA-26 |
| RF-47 | UC-27 | `order_load_items` | Separação de carga | TA-28 |
| RF-48 | UC-28 | `order_status_history` | Pedidos | TA-29 |
| RF-49 | UC-28 | `notifications` | Pedidos | - *(DV)* |
| RF-66 | UC-24 | `order_items`, `order_item_allowed_species` | Pedidos | TA-23 |
| RF-67 | UC-24 | `order_item_allowed_species` | Pedidos | TA-23 |
| RF-68 | UC-25 | `order_items` | Verificação de disponibilidade | TA-25 |

#### 2.4.2 Cotação com fornecedores

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-53 | UC-32 | `supplier_quotes`, `supplier_quote_items` | Cotações | TA-30, TA-31 |
| RF-54 | UC-33 | `supplier_quote_items` | Escolha de proposta | TA-32 |
| RF-55 | UC-34 | `suppliers` | Fornecedores | - *(P)* |

#### 2.4.3 Entregas

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-50 | UC-29 | `order_loads` | Entregas | - *(DV)* |
| RF-51 | UC-30 | `order_loads` | Entregas | TA-55 |

### 2.5 Módulo 4 · Financeiro

#### 2.5.1 Custos e custeio

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-12 | UC-08 | `fixed_costs` | Custos fixos | TA-12 |
| RF-15 | UC-11 | `production_costs` | Custo unitário | **TA-09** |
| RF-16 | UC-11 | `fixed_costs`, `species_unit_cost` | Custo unitário | TA-12 |
| RF-17 | UC-11 | `species_unit_cost` | Custo unitário | TA-09 |
| RF-18 | UC-11 | `production_costs` | Custo unitário | TA-11 |
| RF-76 | UC-11 | `labor_rates`, `assignments`, `species_unit_cost` | Custo unitário | TA-80 |

#### 2.5.2 Precificação

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-31 | UC-19 | `sale_channels` | Margem por canal | TA-17 |
| RF-32 | UC-20 | `sale_prices` | Preço de venda | TA-17 |
| RF-33 | UC-20, UC-26 | `sale_prices`, `order_items` | Preço de venda | TA-18 |
| RF-34 | UC-20 | `sale_prices` | Preço de venda | - *(DV)* |
| RF-35 | UC-20 | `sale_prices`, `order_items`, `species_unit_cost` | Preço de venda | **TA-19** |

#### 2.5.3 Extratos, classificação e fechamento

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-56 | UC-35 | `statement_imports`, `transactions` | Financeiro | TA-33, TA-34 |
| RF-57 | UC-36 | `transactions`, `cost_centers`, `categories`, `parties` | Financeiro | TA-35 |
| RF-58 | UC-36 | `classification_rules` | Financeiro | TA-35 |
| RF-59 | UC-36 | `transactions` | Financeiro | TA-36 |
| RF-60 | UC-37 | `periods` | Financeiro | TA-37 |
| RF-61 | UC-37, UC-38 | `periods` | Financeiro | TA-38 |
| RF-62 | UC-38 | *transversal* | Financeiro | TA-04 |

#### 2.5.4 Indicadores

| RF | Caso de uso | Entidade | Recurso em D4 | Teste |
|---|---|---|---|---|
| RF-63 | UC-39 | *derivada* de todas as áreas | Indicadores | TA-39 |
| RF-64 | UC-39 | *derivada* | Indicadores | TA-40 |
| RF-65 | UC-39 | *derivada* | Indicadores | TA-40 |

---

## 3. Matriz: requisitos não funcionais

Requisitos não funcionais não se ligam a caso de uso ou entidade: são propriedades do sistema como um
todo. Rastreiam-se ao artefato que os realiza e ao teste que os verifica.

| RNF | Realizado em | Teste |
|---|---|---|
| RNF-01 a RNF-04 | Projeto de interface; [`F3`](../F-ux/F3-plano-avaliacao-usabilidade.md) | TA-41, TA-42, TA-13 |
| RNF-05 | [`D1`](../D-arquitetura/D1-arquitetura-c4.md), fila local de sincronização | TA-14, TA-45 |
| RNF-06, RNF-07 | [`D1`](../D-arquitetura/D1-arquitetura-c4.md), camada de apresentação | TA-43, TA-44 |
| RNF-08 | [`A2`](../A-fundacao/A2-glossario-dominio.md), vocabulário canônico | TA-41; critério de aprendizado em F3 |
| RNF-09, RNF-10 | [`C8`](../C-modelagem/C8-dicionario-de-dados.md), `password_hash`, `token_hash` | TA-47 |
| RNF-11, RNF-13 | [`D3`](../D-arquitetura/D3-diagrama-implantacao.md), fronteiras entre nós | - *(inspeção)* |
| RNF-12 | [`D4`](../D-arquitetura/D4-matriz-rbac.md) §4, verificação na operação | TA-03, TA-46 |
| RNF-14 | [`E6`](../E-qualidade/E6-plano-backup-recuperacao.md) | Teste de restauração semestral |
| RNF-15 a RNF-22 | Convenções do projeto; verificação automática antes do envio | Suíte automatizada |
| RNF-23 | [`E5`](../E-qualidade/E5-mapeamento-lgpd.md) | - *(auditoria documental)* |
| RNF-24, RNF-25 | [`C8`](../C-modelagem/C8-dicionario-de-dados.md), campos fiscais e nome científico | TA-27 |
| RNF-26 | [`D3`](../D-arquitetura/D3-diagrama-implantacao.md) | TA-43 |

---

## 4. Rastreabilidade inversa: dos artefatos aos requisitos

O sentido inverso responde à outra pergunta: existe algo **construído sem requisito que o
justifique**?

| Artefato | Elementos | Sem requisito de origem |
|---|---|---|
| Casos de uso (C1) | 56 | Nenhum |
| Entidades (C6, C8) | 55 | Nenhuma |
| Recursos de acesso (D4) | 39 | Nenhum: `Funcionários` e `Tarefas` ganharam RF-69 a RF-76 em 19/08/2026, e `Centros de custo` nasceu com RF-77 a RF-79 |
| Casos de aceite (E2) | 85 | Nenhum |
| Indicadores (G2) | 9 | Nenhum: todos derivam de RF-63 a RF-65 |

**Duas entidades merecem nota:** `notifications` e `order_status_history` atendem a requisitos de
prioridade *deveria ter* (RF-49 e RF-48). São, portanto, as primeiras candidatas a corte caso o prazo
aperte: e a matriz é o que torna essa decisão informada em vez de arbitrária.

---

## 5. O que a construção desta matriz revelou

Esta seção é o resultado principal do artefato. As quatro lacunas abaixo **não eram visíveis** nos
documentos lidos isoladamente; apareceram ao confrontá-los. As três primeiras foram fechadas; a
quarta (§5.5) continua aberta.

### 5.1 Cinco requisitos sem entidade: precificação

Ao ligar RF-31 a RF-35 ao modelo de dados, verificou-se que **não havia onde persistir preço de venda,
margem por canal ou piso mínimo**. O único preço modelado era o de revenda de muda de terceiro, que
atende ao fornecedor e não à produção própria.

**Correção:** acrescentadas as entidades `sale_channels` e `sale_prices`, com vigência histórica para
que o preço praticado no passado não seja reescrito pelo preço de hoje.

> Sem esta descoberta, o sistema teria margem calculável mas não armazenável, e o relatório de margem
> (objetivo central do trabalho) não teria fonte.

**Segunda passagem, correção completada.** Ao confrontar o modelo com o banco já construído,
verificou-se que as duas entidades novas guardam o preço **sugerido vigente**, e que o **valor
efetivamente acordado** continuava sem onde ser gravado, ainda que RN-59 o admita diferente do
sugerido e que RF-33, RF-35 e RF-44 tratem de preço praticado. `order_items` recebeu `unit_price`
e `sale_price_id`, e `orders` recebeu `price_approved_by` e `price_approved_at`. É a razão de RF-33,
RF-35 e RF-44 citarem `order_items` na coluna de entidade.

### 5.2 Doze requisitos sem entidade: produção, perdas e estoque

Lacuna maior que a anterior. Os requisitos RF-19 a RF-30, registro de produção, registro de perdas,
apuração de estoque e taxa de mortalidade: **não tinham nenhuma entidade correspondente** no modelo.

A gravidade é dupla: a taxa de mortalidade atende ao objetivo específico de definir indicadores de
desempenho, e o alerta acima de 20% é regra de negócio declarada desde o início do projeto. Ambos
dependiam de dados que o modelo não previa armazenar.

**Correção:** acrescentadas `task_executions` (então `production_activities`), `loss_events` e `stock_counts`, formando a área
de Operação do modelo. O estoque permanece **quantidade derivada**, e `stock_counts` registra o
evento de contagem física, não o estoque em si.

### 5.3 Oito requisitos *deve ter* sem teste de aceite

Confrontados os requisitos com os casos de aceite, oito de prioridade *deve ter* não tinham
verificação: RF-05, RF-10, RF-19, RF-22, RF-23, RF-27, RF-39 e RF-51.

**Correção:** acrescentados os casos TA-48 a TA-55 em
[`E2`](../E-qualidade/E2-casos-de-teste-de-aceite.md). Entre eles, **TA-51** confronta o estoque
calculado pelo sistema com uma contagem manual, verificação que valida a decisão de manter o estoque
como quantidade derivada.

### 5.4 Síntese

| Lacuna | Requisitos afetados | Correção |
|---|---:|---|
| Sem entidade: precificação | 5 | 2 entidades acrescentadas |
| Sem entidade: operação | 12 | 3 entidades acrescentadas |
| Sem teste de aceite | 8 | 8 casos acrescentados |
| **Total de requisitos que estavam sem realização completa** | **25 de 76** | |

**Um em cada três requisitos estava incompleto em algum elo da cadeia.** Nenhum deles era
identificável pela leitura dos documentos separadamente: todos os artefatos pareciam corretos por
si. É a razão pela qual a matriz de rastreabilidade é construída por último e, ainda assim, altera
os artefatos que a antecedem.

### 5.5 A lacuna de teste da agenda, fechada em 24/08/2026

*Esta seção registrava sete requisitos* deve ter *sem caso de aceite: RF-69 a RF-74 e RF-76, toda
a agenda de pessoal e o custo de mão de obra. Enquanto durou, o subsistema não tinha critério de
aprovação declarado: podia ser construído, não podia ser aceito.*

**Fechada com a rotina de produção.** A [`E2` §5.1](../E-qualidade/E2-casos-de-teste-de-aceite.md)
passou a trazer 27 casos (TA-59 a TA-85) que cobrem os sete antigos e os requisitos novos, e a
matriz acima já os referencia.

**Fica registrado o que a lacuna ensinou**, porque o padrão tende a se repetir: os sete nasceram
juntos, em 19/08/2026, quando a agenda entrou em `B2` sem passar por `E2`. Requisito escrito numa
rodada e testado noutra é requisito que fica sem teste, porque a segunda rodada nunca é
convocada por nada. A ordem de trabalho adotada em 24/08 corrige isso: **`E2` entra na mesma
passada que `B2`**, antes de `B5`, e é a `B5` que confere se sobrou algum descoberto.

**Cinco lacunas continuam abertas**, e são de natureza diferente: RN-58, RN-62, RN-68, RN-69 e
RN-70 são regras catalogadas sem requisito que as cumpra, listadas em
[`B3` §6.3](B3-regras-de-negocio.md). Regra sem requisito é lacuna de especificação; requisito sem
teste era lacuna de verificação. A primeira ainda está aberta.

---

## 6. Estado final da cobertura

| Verificação | Resultado |
|---|---|
| Requisitos funcionais com caso de uso | **107 de 107** |
| Requisitos funcionais com entidade ou derivação declarada | **107 de 107** |
| Requisitos funcionais com regra de acesso definida | **107 de 107** |
| Requisitos de prioridade *deve ter* com teste de aceite | **84 de 84** |
| Requisitos *deveria ter* / *poderia ter* sem teste | 12: deliberado |
| Casos de uso sem requisito de origem | 0 |
| Entidades sem requisito de origem | 0 |

Dezoito requisitos estão sem caso de aceite próprio, e as duas ausências têm naturezas opostas.
**Doze** são de prioridade inferior a *deve ter*: decisão declarada, não omissão, o critério de
aprovação de subsistema em [`E2`](../E-qualidade/E2-casos-de-teste-de-aceite.md) exige
verificação apenas dos *deve ter*, e estender a cobertura consumiria tempo de usuário, o recurso
mais escasso do projeto ([`E3`, R-04](../E-qualidade/E3-analise-de-riscos.md)).

Os outros **seis são *deve ter* cobertos pelo passo de conferência de outro caso**, e a coluna
Teste desta matriz aponta qual: RF-79 por TA-58, RF-82 por TA-61, RF-85 e RF-89 por TA-64, RF-87
por TA-65 e RF-88 por TA-67. A `E2` §13 registra a mesma correspondência. É diferença que vale
declarar, porque a lacuna que a §5.5 descreve era de outra ordem, sete *deve ter* **sem cobertura
alguma**, e essa foi fechada.

---

## 7. Manutenção

A matriz só permanece útil se acompanhar as alterações. A regra:

- **Requisito novo** entra primeiro em [`B2`](B2-especificacao-requisitos.md), depois aqui, e só
  então nos demais artefatos.
- **Requisito removido** não tem seu identificador reaproveitado: a linha permanece, marcada como
  removida, para que referências antigas continuem resolvendo.
- **Entidade ou caso de uso novo** exige apontar qual requisito o justifica. Não havendo, ou o
  requisito está faltando em B2, ou o elemento não deveria existir.
