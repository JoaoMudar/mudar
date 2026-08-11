# C6 — Modelo Entidade-Relacionamento

> **Artefato:** MER conceitual, lógico e físico · **Bloco:** C — Modelagem
> **Destino no TCC:** Capítulo 4, seção 4.4 — Modelagem de dados
> **Fundamentação:** Elmasri e Navathe (2011) definem o modelo Entidade-Relacionamento como modelo
> conceitual de alto nível que abstrai objetos do mundo real em entidades descritas por atributos.
> A progressão conceitual → lógico → físico e os critérios de normalização seguem os mesmos autores.

---

## 1. Estratégia de modelagem

**A espécie é a entidade central.** Custo, preço, estoque, perda, item de pedido e oferta de
fornecedor referenciam-na por chave estrangeira. Essa centralidade não é preferência de projeto: é a
tradução direta da regra de negócio de que tudo no viveiro gira em torno da espécie.

O modelo é apresentado em **sete áreas**. Um diagrama único com as 39 entidades seria ilegível em
página impressa, e a divisão por área corresponde aos subsistemas dos requisitos, o que preserva a
correspondência com [`B2`](../B-requisitos/B2-especificacao-requisitos.md).

| Área | Entidades | Papel |
|---|---|---|
| **Acesso** | 4 | Autenticação, sessão, auditoria e notificação |
| **Núcleo e custeio** | 9 | Catálogo e apuração de custo — fundação de todo o resto |
| **Operação** | 3 | Produção, perdas e contagem de estoque |
| **Comercial** | 7 | Cliente, pedido, item, carga |
| **Precificação** | 2 | Canal de venda e preço vigente |
| **Fornecedores** | 4 | Rede externa e cotação |
| **Financeiro** | 10 | Extrato como fonte da verdade |
| **Total** | **39** | |

Convenções adotadas, conforme Elmasri e Navathe (2011): tabelas nomeadas no **plural**, chaves
primárias e estrangeiras declaradas explicitamente, e identificadores universais como chave
primária — o que permite gerar a chave no cliente antes da gravação, requisito do funcionamento sem
conexão (RNF-05).

---

## 2. Modelo conceitual — visão geral

Apenas entidades e relacionamentos, sem atributos. É a visão que responde "de que o sistema trata".

```mermaid
erDiagram
  ESPECIE      ||--o{ CUSTO_PRODUCAO : "tem custo em"
  RECIPIENTE   ||--o{ CUSTO_PRODUCAO : "determina"
  INSUMO       ||--o{ CUSTO_PRODUCAO : "compõe"

  ESPECIE      ||--o{ PRODUCAO    : "é produzida em"
  ESPECIE      ||--o{ PERDA       : "sofre"

  ESPECIE      ||--o{ PRECO       : "é precificada em"
  CANAL_VENDA  ||--o{ PRECO       : "aplica margem a"
  PRECO        ||--o{ ITEM_PEDIDO : "sugere valor de"

  ESPECIE      ||--o{ ITEM_PEDIDO : "é vendida em"
  RECIPIENTE   ||--o{ ITEM_PEDIDO : "define porte de"
  CLIENTE      ||--o{ PEDIDO      : "faz"
  PEDIDO       ||--o{ ITEM_PEDIDO : "compõe-se de"
  PEDIDO       ||--o{ CARGA       : "é entregue em"

  ESPECIE      ||--o{ COTACAO     : "é cotada em"
  FORNECEDOR   ||--o{ COTACAO     : "responde"
  COTACAO      }o--o| PEDIDO      : "complementa"

  USUARIO      ||--o{ PEDIDO      : "registra"
  CONTA        ||--o{ LANCAMENTO  : "movimenta"
  CENTRO_CUSTO ||--o{ LANCAMENTO  : "destina"
  PEDIDO       ||--o| LANCAMENTO  : "é conciliado com"
```

O diagrama conceitual apresenta **dezoito entidades**, e não as trinta e nove do modelo completo.
A redução é deliberada: Sommerville (2011) observa que a ausência de detalhe excessivo é
característica central do modelo, cujo objetivo é destacar o mais relevante e não especificar por
inteiro. Entidades associativas, de histórico e de auditoria aparecem apenas nos modelos lógicos por
área, na seção seguinte.

Quatro leituras que o modelo conceitual já entrega:

- **A espécie participa de seis relacionamentos**, em cinco áreas distintas — custeio, operação,
  precificação, comercial e fornecedores. É a confirmação estrutural da centralidade declarada no
  §3.4 da metodologia: nenhuma outra entidade aparece em mais de duas áreas.
- **Produção e perda são simétricas em torno da espécie.** Uma soma, a outra subtrai, e o estoque é
  a diferença — razão pela qual ele não aparece no modelo como entidade.
- **O custo e o preço estão em cadeia, não em paralelo.** O custo de produção alimenta o preço, que
  sugere o valor do item de pedido. É a tradução no modelo de dados do objetivo central do trabalho:
  substituir a precificação intuitiva por uma derivada do custo apurado.
- **O pedido conecta-se ao lançamento financeiro.** É o vínculo que permite responder "esse pedido
  foi pago?" — pergunta que hoje não tem resposta sem sentar e somar.
- **A cotação liga fornecedor e pedido.** Representa a decisão de complementar com muda de terceiro
  aquilo que a produção própria não atende, sem que o pedido do cliente precise ser recusado.

---

## 3. Modelo lógico por área

### 3.1 Acesso

```mermaid
erDiagram
  users {
    uuid    id PK
    text    username UK
    text    display_name
    text    password_hash
    enum    role
    boolean must_change_password
    boolean active
    int     failed_login_attempts
    timestamptz locked_until
  }
  sessions {
    uuid id PK
    uuid user_id FK
    text token_hash UK
    timestamptz expires_at
    text ip
    text user_agent
  }
  login_events {
    uuid id PK
    uuid user_id FK
    text username_attempted
    boolean success
    text ip
    text user_agent
  }
  notifications {
    uuid id PK
    uuid user_id FK
    text type
    text title
    text message
    boolean read
  }

  users ||--o{ sessions     : "mantém"
  users ||--o{ login_events : "gera"
  users ||--o{ notifications: "recebe"
```

Três decisões de modelagem que respondem a requisitos não funcionais de segurança:

- **A senha nunca é armazenada** — apenas seu resumo criptográfico (`password_hash`, RNF-09). O
  mesmo vale para o identificador de sessão (`token_hash`, RNF-10).
- **`login_events` registra a tentativa, não apenas o sucesso** — daí `username_attempted` ser texto
  e não chave estrangeira: uma tentativa contra usuário inexistente também precisa ser registrada
  (RF-04), e é justamente ela que evidencia ataque.
- **`ip` e `user_agent` na sessão** existem para que o usuário identifique o aparelho na lista de
  sessões ativas e encerre um celular perdido (RF-07).

### 3.2 Núcleo e custeio

```mermaid
erDiagram
  species {
    uuid id PK
    text common_name
    text scientific_name
    text_array tags
    int  germination_time_days
    int  growth_time_months
    text photo_url
    boolean active
  }
  species_popular_names {
    uuid id PK
    uuid species_id FK
    text name
    text name_normalized UK
  }
  containers {
    uuid id PK
    text name UK
    numeric volume_liters
    numeric substrate_per_unit_liters
    numeric unit_cost
  }
  inputs {
    uuid id PK
    text name
    enum category
    text unit_of_measure
    numeric cost_per_unit
    numeric quantity_purchased
    date last_purchase_date
  }
  input_price_history {
    uuid id PK
    uuid input_id FK
    numeric cost_per_unit
    timestamptz changed_at
  }
  input_usages {
    uuid id PK
    uuid input_id FK
    uuid species_id FK
    uuid container_id FK
    numeric quantity
    date usage_date
  }
  fixed_costs {
    uuid id PK
    enum category
    numeric monthly_amount
    date reference_month
  }
  seed_collection_costs {
    uuid id PK
    uuid species_id FK
    text collection_region
    numeric distance_km
    numeric fuel_cost
    numeric labor_hours
    numeric total_cost
    int seeds_collected_qty
    numeric cost_per_seed
  }
  production_costs {
    uuid id PK
    uuid species_id FK
    uuid container_id FK
    numeric substrate_cost
    numeric seed_cost
    numeric labor_cost
    numeric total_variable_cost
    timestamptz calculated_at
  }

  species    ||--o{ species_popular_names : "conhecida como"
  species    ||--o{ seed_collection_costs : "coletada em"
  species    ||--o{ production_costs      : "custa"
  containers ||--o{ production_costs      : "determina"
  species    ||--o{ input_usages          : "consome"
  containers ||--o{ input_usages          : "contextualiza"
  inputs     ||--o{ input_usages          : "é aplicado"
  inputs     ||--o{ input_price_history   : "histórico de"
```

**Por que `species_popular_names` é entidade separada.** O nome popular é atributo **multivalorado**
— a mesma espécie tem vários nomes regionais, e a busca precisa encontrá-la por qualquer um (RF-09).
Elmasri e Navathe tratam esse caso explicitamente: atributo multivalorado não cabe em coluna única, e
repetir a espécie por nome violaria a primeira forma normal. A restrição de unicidade sobre o nome
normalizado garante o outro lado da regra: **um nome popular aponta para uma única espécie**.

**Por que `input_price_history` existe.** Sem ela, atualizar o preço de um insumo reescreveria o
custo de todas as espécies retroativamente — o custo apurado em março passaria a refletir o preço de
agosto. É a anomalia de atualização que a normalização busca evitar, e a solução é preservar o
histórico em vez de sobrescrever (RF-11).

**`total_variable_cost` e `cost_per_seed` são atributos derivados**, calculados a partir dos demais e
mantidos pelo próprio banco. Armazená-los é desnormalização deliberada: evita recalcular a soma a
cada leitura de relatório, sem risco de divergência, porque o banco não permite gravá-los
diretamente.

### 3.3 Operação — produção, perdas e estoque

```mermaid
erDiagram
  production_activities {
    uuid id PK
    uuid species_id FK
    uuid container_id FK
    text activity_type
    int quantity
    date activity_date
    uuid performed_by FK
    text notes
  }
  loss_events {
    uuid id PK
    uuid species_id FK
    uuid container_id FK
    int quantity
    text cause
    date loss_date
    uuid reported_by FK
    text notes
  }
  stock_counts {
    uuid id PK
    uuid species_id FK
    uuid container_id FK
    int counted_quantity
    date counted_at
    uuid counted_by FK
  }

  species    ||--o{ production_activities : "é produzida em"
  containers ||--o{ production_activities : "recebe"
  species    ||--o{ loss_events           : "sofre"
  containers ||--o{ loss_events           : "contextualiza"
  species    ||--o{ stock_counts          : "é contada em"
  containers ||--o{ stock_counts          : "contextualiza"
```

**O estoque não é entidade.** É quantidade **derivada**: produção registrada, menos perdas, menos o
que saiu em pedidos aprovados. Modelá-lo como entidade criaria duas verdades sobre o mesmo número —
a calculada e a armazenada — que divergiriam ao primeiro registro esquecido. A decisão está declarada
desde o [glossário](../A-fundacao/A2-glossario-dominio.md), na lista de termos deliberadamente não
adotados.

**`stock_counts` não contradiz isso.** Não armazena o estoque: armazena o **evento de contagem
física**, com data e responsável. Quando a contagem diverge do calculado, prevalece a contagem — e a
divergência fica registrada, porque ela própria é informação: indica registro de produção ou de perda
que não foi feito.

**A causa da perda é lista fechada** — seca, praga, geada, manuseio, outro. Não é campo de texto por
decisão explícita: causa digitada à mão inviabiliza a análise por causa, que é justamente o que o
indicador de mortalidade precisa produzir.

**`quantity` em `loss_events` é a unidade de mortalidade.** A taxa é a razão entre a soma das perdas e
a soma da produção do período, por espécie — e é dela que decorre o alerta acima de 20%, que é regra
de negócio e não configuração de painel.

### 3.4 Comercial

```mermaid
erDiagram
  customers {
    uuid id PK
    text name
    text phone
    text person_type
    text document UK
    text legal_name
    text state_registration
    text zip_code
    text city
    text state
  }
  orders {
    uuid id PK
    serial order_number
    uuid customer_id FK
    text sale_channel
    text status
    boolean needs_invoice
    date delivery_date
    uuid created_by FK
  }
  order_items {
    uuid id PK
    uuid order_id FK
    uuid species_id FK
    uuid container_id FK
    int  quantity
    boolean is_generic
    uuid parent_item_id FK
    text specification
    boolean is_available
    int  available_quantity
    uuid available_container_id FK
  }
  order_item_allowed_species {
    uuid order_item_id PK
    uuid species_id PK
  }
  order_loads {
    uuid id PK
    uuid order_id FK
    int  load_number
    text status
  }
  order_load_items {
    uuid id PK
    uuid load_id FK
    uuid order_item_id FK
    int  quantity
    boolean is_separated
  }
  order_status_history {
    uuid id PK
    uuid order_id FK
    text from_status
    text to_status
    uuid changed_by FK
  }

  customers   ||--o{ orders               : "faz"
  orders      ||--o{ order_items          : "compõe-se de"
  orders      ||--o{ order_loads          : "divide-se em"
  orders      ||--o{ order_status_history : "percorre"
  order_loads ||--o{ order_load_items     : "contém"
  order_items ||--o{ order_load_items     : "é separado em"
  order_items ||--o{ order_item_allowed_species : "restringe-se a"
  order_items ||--o{ order_items          : "especializa (genérico)"
```

**O item genérico é o ponto mais sutil do modelo.** Um item de pedido pode não ter espécie:
`is_generic` verdadeiro e `species_id` nulo representam "500 mudas nativas", sem escolha das
espécies. Três consequências estruturais:

1. **`species_id` é opcional**, ao contrário do que a centralidade da espécie sugeriria. A restrição
   de integridade garante a coerência: item genérico **não pode** ter espécie, e item específico
   **precisa** ter — salvo quando é filho de um genérico.
2. **`parent_item_id` é auto-relacionamento.** Ao decidir com que espécies atender o item genérico, o
   sistema cria itens filhos que o especializam, preservando o item original tal como o cliente o
   pediu.
3. **`order_item_allowed_species` é tabela associativa** que materializa a lista fechada de espécies
   aceitas (RF-67). Ausência de linhas significa **aberto** — qualquer espécie atende.

**Por que a carga é entidade e não atributo do pedido.** Um pedido grande sai em mais de uma viagem,
e cada viagem tem estado próprio de separação. Modelar como atributo obrigaria a repetir o pedido por
viagem, ou a perder o controle da separação parcial.

**A disponibilidade parcial ocupa três colunas** — `is_available`, `available_quantity` e
`available_container_id` — porque são quatro estados distintos, não dois: disponível, parcial,
indisponível e ainda não verificado. Um único campo booleano confundiria "não tem" com "ninguém
olhou ainda", que são operacionalmente opostos.

### 3.5 Fornecedores

```mermaid
erDiagram
  suppliers {
    uuid id PK
    text name
    text contact_name
    text whatsapp
    text city
    text state
    smallint reliability_score
    text status
    numeric lat
    numeric lng
    timestamptz geocoded_at
  }
  supplier_species {
    uuid id PK
    uuid supplier_id FK
    uuid species_id FK
    text size
    text container
    numeric unit_price
    int min_quantity
    text availability
  }
  supplier_quotes {
    uuid id PK
    uuid request_group_id
    uuid supplier_id FK
    uuid order_id FK
    text channel
    text message_text
    text status
    timestamptz sent_at
    timestamptz responded_at
    uuid created_by FK
  }
  supplier_quote_items {
    uuid id PK
    uuid quote_id FK
    uuid species_id FK
    uuid order_item_id FK
    int quantity
    numeric quoted_unit_price
    boolean is_chosen
    numeric sale_unit_price
  }

  suppliers ||--o{ supplier_species    : "oferece"
  suppliers ||--o{ supplier_quotes     : "é consultado por"
  supplier_quotes ||--o{ supplier_quote_items : "detalha"
```

**`container` do fornecedor é texto livre**, e não chave estrangeira para `containers`. A distinção é
deliberada e vale registrá-la: a tabela de recipientes modela a **produção interna**, com volume e
consumo de substrato usados no custeio. O fornecedor externo usa embalagem arbitrária — raiz nua,
lata, saco de um metro — que não tem custo de substrato a apurar. Forçá-lo na lista interna
corromperia a base do custeio para representar um dado que não a alimenta.

**`request_group_id` sem tabela-mãe.** Um disparo de cotação para cinco fornecedores gera cinco
registros que compartilham o mesmo identificador de grupo. Não há entidade "consulta" porque ela não
teria atributo próprio algum — seria uma tabela de uma coluna. O agrupamento é feito na leitura.

**`status` do fornecedor contempla "não contatar"**, que é registro de **oposição do titular** ao
tratamento de seus dados para contato comercial, e não um estado operacional. Ver
[`E5`](../E-qualidade/E5-mapeamento-lgpd.md).

### 3.6 Financeiro

O subsistema financeiro é modelado em **esquema próprio**, separado do restante. A separação é de
segurança, não de organização: a base mistura gasto do viveiro com gasto pessoal da família e da
clínica, e a fronteira de esquema torna a restrição de acesso estrutural em vez de apenas
procedimental.

```mermaid
erDiagram
  accounts {
    uuid id PK
    text code UK
    text name
    text holder
    text kind
    numeric opening_balance
    date opening_balance_date
  }
  cost_centers {
    uuid id PK
    text code UK
    text name
    text nature
    boolean active
  }
  category_groups {
    uuid id PK
    text name
  }
  categories {
    uuid id PK
    uuid group_id FK
    text name
    text direction
  }
  parties {
    uuid id PK
    text kind
    text document
    text name
    text legal_name
    text trade_name
    text email
    text phone
    text whatsapp
    bool active
  }
  party_roles {
    uuid party_id FK
    text role
  }
  addresses {
    uuid id PK
    uuid party_id FK
    text label
    text zip_code
    text street
    text number
    text city
    text state
    numeric lat
    numeric lng
    bool is_primary
  }
  statement_imports {
    uuid id PK
    uuid account_id FK
    text file_name
    text file_hash
    date period_start
    date period_end
    int rows_total
    int rows_new
    int rows_duplicated
    uuid imported_by FK
  }
  transactions {
    uuid id PK
    uuid account_id FK
    uuid import_id FK
    date posted_at
    date competence_date
    numeric amount
    text description_raw
    text fitid
    text dedupe_key
    text kind
    uuid category_id FK
    uuid cost_center_id FK
    uuid party_id FK
    uuid transfer_pair_id FK
    uuid order_id FK
    text status
  }
  transaction_splits {
    uuid id PK
    uuid transaction_id FK
    uuid cost_center_id FK
    uuid category_id FK
    numeric amount
  }
  classification_rules {
    uuid id PK
    text pattern
    text match_type
    uuid category_id FK
    uuid cost_center_id FK
    int priority
    int hits
  }
  periods {
    uuid id PK
    uuid account_id FK
    int year
    int month
    text status
    numeric closing_balance
    uuid closed_by FK
  }

  accounts        ||--o{ transactions        : "movimenta"
  accounts        ||--o{ statement_imports   : "recebe"
  accounts        ||--o{ periods             : "fecha em"
  statement_imports ||--o{ transactions      : "origina"
  categories      ||--o{ transactions        : "qualifica"
  cost_centers    ||--o{ transactions        : "destina"
  parties         ||--o{ transactions        : "participa de"
  category_groups ||--o{ categories          : "agrupa"
  transactions    ||--o{ transaction_splits  : "rateia-se em"
  cost_centers    ||--o{ transaction_splits  : "recebe parte de"
  transactions    ||--o| transactions        : "pareia (transferência)"
```

Quatro decisões de modelagem com justificativa:

- **Nenhum lançamento sem conta.** Não há lançamento órfão: o gasto em dinheiro entra por uma conta
  chamada *caixa*, que também é conta. É essa obrigatoriedade que faz o saldo calculado ter de bater
  com o saldo do banco.
- **Duas datas, não uma.** `posted_at` é quando o banco moveu e nunca é editado; `competence_date` é
  o mês a que o gasto pertence economicamente. Saldo apura-se pela primeira, custo pela segunda.
  Registrar apenas uma tornaria irreversível a perda: reconstruir a competência anos depois é
  impossível.
- **`description_raw` nunca é editado.** É a prova de que a linha veio do banco e não da memória de
  alguém — a diferença exata entre este modelo e a planilha que ele substitui.
- **O rateio é entidade separada.** O caso comum usa o centro de custo direto no lançamento; o rateio
  existe para o caso real da energia de um imóvel que serve a dois fins. A invariante — a soma das
  partes iguala o total — é validada na camada de aplicação, onde a mensagem de erro é legível e o
  comportamento é testável.

---

## 4. Nota de normalização

O esquema está em **terceira forma normal**, com duas desnormalizações deliberadas e declaradas:
os atributos derivados de custo (§3.2) e a redundância entre `active` e `status` em fornecedores, que
distinguem arquivamento de registro (soft-delete) de estado comercial — informações diferentes que um
único campo não expressaria.

A demonstração formal da progressão 1FN → 2FN → 3FN, com as anomalias de inserção, exclusão e
atualização evitadas em cada passo, **não integra o conjunto de artefatos selecionados**
(corresponderia ao item C7 do catálogo). O que se registra aqui são as decisões, não a derivação.

---

## 5. Precificação

A precificação é a ponte entre o custeio e o comercial: consome o custo unitário apurado e entrega o
preço praticado no pedido. Duas entidades a compõem.

```mermaid
erDiagram
  sale_channels {
    uuid id PK
    text code UK
    text name
    numeric default_margin_pct
    numeric min_margin_pct
    boolean active
  }
  sale_prices {
    uuid id PK
    uuid species_id FK
    uuid container_id FK
    uuid channel_id FK
    numeric unit_cost_snapshot
    numeric margin_pct
    numeric unit_price
    numeric floor_price
    date valid_from
    date valid_to
    uuid defined_by FK
  }

  sale_channels ||--o{ sale_prices : "aplica margem a"
```

**Por que o canal é entidade e não texto.** A margem é atributo do canal, não do preço: alterar a
margem do atacado deve refletir-se em todos os preços daquele canal, e um canal escrito como texto
em cada linha tornaria essa alteração uma varredura sujeita a erro. É a mesma anomalia de atualização
que motiva a separação em qualquer normalização.

**Por que o preço tem vigência.** `valid_from` e `valid_to` delimitam o período em que o preço vale.
Sobrescrever o preço destruiria a informação de quanto se vendeu a quanto, e o relatório de margem
passaria a comparar a venda de março com o custo de agosto. É a razão que motiva
`input_price_history`, aplicada ao outro lado da equação.

**Por que o custo é fotografado no preço.** `unit_cost_snapshot` guarda o custo unitário vigente no
momento em que o preço foi definido. Sem ele, a margem registrada e a margem recalculada divergiriam
a cada alteração de custo, e não seria possível responder "qual era a margem quando eu vendi".

**Por que o piso é coluna e não constante.** O piso mínimo varia por canal e por espécie: uma espécie
de ciclo longo tem piso diferente de uma pioneira. Fixá-lo em configuração única obrigaria a escolher
entre um piso alto demais para umas e baixo demais para outras.

### Relação com o restante do modelo

```mermaid
erDiagram
  species     ||--o{ sale_prices : "é precificada"
  containers  ||--o{ sale_prices : "define porte de"
  sale_prices ||--o{ order_items : "sugere preço a"
```

O item de pedido registra o preço **efetivamente acordado**, que pode diferir do sugerido dentro do
limite do piso. A entidade de preço é fonte de sugestão e de validação, nunca de imposição — a
negociação existe e o modelo precisa acomodá-la sem perder o controle da margem.

---

## 6. Observação sobre a origem deste artefato

As duas entidades da seção anterior não constavam da primeira versão deste modelo. Foram
acrescentadas ao se verificar que os requisitos **RF-31 a RF-35** — margem por canal, preço sugerido,
piso mínimo e relatório de margem — não tinham onde persistir: o único preço de venda modelado era o
de revenda de muda de terceiro, que atende ao fornecedor e não à produção própria.

O registro fica aqui porque ilustra a função da matriz de rastreabilidade
([`B5`](../B-requisitos/B5-matriz-rastreabilidade.md)): cinco requisitos sem entidade correspondente
são um defeito de especificação que só aparece quando requisito e modelo são confrontados
sistematicamente.
