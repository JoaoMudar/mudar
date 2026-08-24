# Apêndice B, Dicionário de dados

> Gerado a partir de `C-modelagem/C8-dicionario-de-dados.md`.
> **Não edite este arquivo**: edite o artefato de origem e rode `npm run docs:tcc`.

---

## Como ler

Uma tabela por entidade, na mesma ordem de [`C6`](C6-modelo-entidade-relacionamento.md): os
quatro módulos do sistema, com o Acesso à frente por atravessar os quatro.

| Coluna do dicionário | Significado |
|---|---|
| **Atributo** | Nome do campo no banco (inglês, conforme RNF-15) |
| **Tipo** | Tipo de dado e precisão |
| **Ob.** | ● obrigatório · ○ opcional |
| **Chave** | PK primária · FK estrangeira · UK única |
| **Descrição** | Significado em português, no vocabulário do [glossário](../A-fundacao/A2-glossario-dominio.md) |

**Convenções gerais**, aplicadas a todas as entidades e não repetidas em cada tabela:

- `id`: identificador universal, chave primária, gerado pelo próprio banco. A escolha por
  identificador universal em vez de sequencial permite gerar a chave no dispositivo antes da
  gravação, requisito do funcionamento sem conexão (RNF-05).
- `created_at`: momento da criação, preenchido automaticamente.
- `updated_at`: momento da última alteração, mantido automaticamente pelo banco.
- `active`: indicador de arquivamento. Registro inativo desaparece das listagens sem ser removido,
  preservando a integridade das referências históricas.
- Nome de entidade fora do esquema `public` vem qualificado (`cadastro.parties`,
  `financeiro.transactions`), na coluna Chave inclusive.
- A marca *Especificada, não implementada no protótipo* abaixo do título indica entidade que
  pertence ao modelo mas ainda não existe no banco; em entidade já existente, a mesma condição
  aparece como **Especificado, não implementado** na descrição do atributo.

---

## Recorte implementado

Este dicionário descreve o **modelo especificado**, que é maior que o protótipo construído. Das 46
entidades, **28 existem no banco** (mais a visão `species_unit_cost`) e **18 estão especificadas e
ainda não implementadas**. A distinção é registrada entidade por entidade, e não é defeito de
modelagem: o modelo responde à especificação completa de requisitos, e a construção segue a
priorização declarada em [`B2`](../B-requisitos/B2-especificacao-requisitos.md).

| Módulo | No banco | Só especificadas |
|---|---:|---:|
| *(transversal)* Acesso | 4 | 0 |
| 1 · Cadastros | 12 | 1 |
| 2 · Produção | 2 | 5 |
| 3 · Comercial | 8 | 0 |
| 4 · Financeiro | 2 | 12 |
| **Total** | **28** | **18** |

As 18 pendentes: `task_types`, `production_activities`, `loss_events`, `stock_counts`,
`week_plans`, `assignments`, `labor_rates`, `sale_channels`, `sale_prices` e as nove do esquema
`financeiro` (`accounts`, `cost_centers`, `category_groups`, `categories`, `statement_imports`,
`transactions`, `transaction_splits`, `classification_rules`, `periods`).

Dois atributos de entidade já existente estão na mesma condição: `users.party_id`, e o par
`order_items.unit_price` / `order_items.sale_price_id`, que depende de `sale_prices`.

---

# Acesso: transversal aos quatro módulos

## `users`: usuário do sistema

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `username` | text | ● | UK | Identificador de acesso, único |
| `display_name` | text | ● | | Nome exibido na interface |
| `password_hash` | text | ● | | Resumo criptográfico da senha. **A senha em si nunca é armazenada** (RNF-09) |
| `role` | enum | ● | | Perfil de acesso: `admin`, `chefia`, `gerencia`, `colaborador` |
| `must_change_password` | boolean | ● | | Obriga a definir senha própria no próximo acesso (RF-02) |
| `active` | boolean | ● | | Usuário habilitado |
| `failed_login_attempts` | integer | ● | | Tentativas malsucedidas consecutivas |
| `locked_until` | timestamptz | ○ | | Bloqueio temporário após tentativas sucessivas |
| `party_id` | uuid | ○ | FK → `cadastro.parties` | Pessoa do cadastro a que esta credencial pertence. **Especificado, não implementado.** **Opcional:** há funcionário sem login e administrador sem vínculo |

## `sessions`: sessão ativa

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `user_id` | uuid | ● | FK → `users` | Usuário da sessão |
| `token_hash` | text | ● | UK | Resumo do identificador de sessão. O valor original só existe no dispositivo (RNF-10) |
| `expires_at` | timestamptz | ● | | Expiração |
| `last_seen_at` | timestamptz | ● | | Último uso, para ordenar a lista de sessões |
| `ip` | text | ○ | | Endereço de origem, para identificar o aparelho |
| `user_agent` | text | ○ | | Descrição do dispositivo e navegador |

## `login_events`: auditoria de acesso

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `user_id` | uuid | ○ | FK → `users` | Usuário, quando o identificador informado existe |
| `username_attempted` | text | ● | | Identificador tentado. **Texto e não referência**, porque a tentativa contra usuário inexistente também precisa ser registrada |
| `success` | boolean | ● | | Resultado da tentativa |
| `ip` | text | ○ | | Endereço de origem |
| `user_agent` | text | ○ | | Dispositivo e navegador |

## `notifications`: notificação interna

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `user_id` | uuid | ● | FK → `users` | Destinatário |
| `type` | varchar(30) | ● | | Natureza do evento notificado |
| `title` | varchar(255) | ● | | Título |
| `message` | text | ○ | | Corpo |
| `link` | varchar(255) | ○ | | Destino ao acionar a notificação |
| `read` | boolean | ● | | Marcada como lida |

---

# Módulo 1 · Cadastros

## `species`: espécie *(entidade central)*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `common_name` | text | ● | | Nome popular principal |
| `scientific_name` | text | ○ | | Nome científico binomial, exigido em projetos de compensação ambiental (RNF-25) |
| `tags` | text[] | ● | | Características da espécie: nativa, exótica, frutífera, ornamental, madeireira, forrageira. **Múltiplas por espécie** |
| `germination_time_days` | integer | ○ | | Dias da semeadura à emergência |
| `growth_time_months` | integer | ○ | | Meses da plântula à muda pronta. Base da previsão de disponibilidade |
| `notes` | text | ○ | | Observações de manejo |
| `photo_url` | text | ○ | | Referência da fotografia, no formato `/api/fotos/<uuid>`, que aponta para `species_photos` |
| `active` | boolean | ● | | Espécie em catálogo |

> **Coluna legada.** O banco ainda tem `category`, classificação única que precedeu `tags`. Deixou
> de ser obrigatória e nenhuma consulta do sistema a usa; permanece apenas para não quebrar dados
> históricos, e sai numa migração futura. A classificação vigente é `tags`, que admite mais de uma
> característica por espécie.

## `species_popular_names`: nome popular adicional

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `species_id` | uuid | ● | FK → `species` | Espécie designada |
| `name` | text | ● | | Nome tal como escrito |
| `name_normalized` | text | ● | UK | Forma normalizada: sem acentos, minúscula, espaços colapsados. A unicidade garante que **um nome popular aponta para uma única espécie** |

## `species_photos`: fotografia da espécie

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador, e também o que aparece na URL `/api/fotos/<uuid>` |
| `bytes` | bytea | ● | | Conteúdo binário da imagem |
| `mime` | text | ● | | Tipo do arquivo, `image/webp` por padrão |
| `byte_size` | integer | ● | | Tamanho em bytes, para controle de ocupação |

> **Sem `species_id`, por decisão de projeto.** O envio da foto acontece antes da inserção da
> espécie, então a chave estrangeira não teria a que apontar no momento da gravação. A referência
> fica em `species.photo_url`. A imagem é guardada no banco e não em disco porque o sistema de
> arquivos da plataforma de publicação é somente leitura e descartado a cada implantação: em disco,
> a foto se perderia. Ver [`C6 §3.2`](C6-modelo-entidade-relacionamento.md).

## `containers`: recipiente

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `name` | text | ● | UK | Designação: tubete, 10x18, 17x22, 20x26, 28x32, balde |
| `volume_liters` | numeric(6,3) | ○ | | Volume do recipiente |
| `substrate_per_unit_liters` | numeric(6,3) | ○ | | Substrato consumido por unidade. Entrada direta do custeio |
| `unit_cost` | numeric(10,2) | ○ | | Custo do recipiente vazio |
| `active` | boolean | ● | | Em uso |

## `inputs`: insumo

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `name` | text | ● | | Designação comercial |
| `category` | enum | ● | | `substrato`, `adubo`, `defensivo`, `recipiente`, `outros` |
| `unit_of_measure` | text | ● | | Unidade de medida: kg, L, saco, unidade |
| `cost_per_unit` | numeric(10,2) | ○ | | Custo unitário vigente |
| `quantity_purchased` | numeric(10,2) | ○ | | Quantidade da última compra |
| `supplier` | text | ○ | | Fornecedor do insumo, em texto livre |
| `last_purchase_date` | date | ○ | | Data da última compra |
| `active` | boolean | ● | | Em uso |

## `input_price_history`: histórico de preço de insumo

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `input_id` | uuid | ● | FK → `inputs` | Insumo |
| `cost_per_unit` | numeric(10,2) | ● | | Custo vigente à época |
| `changed_at` | timestamptz | ● | | Momento da alteração |
| `notes` | text | ○ | | Motivo |

> Existe para impedir que a atualização de preço reescreva retroativamente o custo já apurado.
> anomalia de atualização que a normalização busca evitar.

## `customers`: cliente

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `name` | varchar(255) | ● | | Nome de tratamento. **Único campo exigido no cadastro rápido**, junto ao telefone |
| `phone` | varchar(20) | ○ | | Telefone, canal principal de contato |
| `person_type` | varchar(2) | ○ | | `pf` ou `pj`. Nulo indica cadastro simples ainda não completado |
| `document` | varchar(14) | ○ | UK parcial | CPF ou CNPJ, apenas dígitos. Único **quando informado** |
| `email` | varchar(255) | ○ | | Correio eletrônico |
| `legal_name` | varchar(255) | ○ | | Razão social, quando pessoa jurídica |
| `trade_name` | varchar(255) | ○ | | Nome fantasia |
| `state_registration` | varchar(20) | ○ | | Inscrição estadual |
| `ie_exempt` | boolean | ○ | | Isento de inscrição estadual |
| `zip_code` | varchar(8) | ○ | | Código postal |
| `street` | varchar(255) | ○ | | Logradouro |
| `address_number` | varchar(20) | ○ | | Número |
| `complement` | varchar(255) | ○ | | Complemento |
| `neighborhood` | varchar(100) | ○ | | Bairro |
| `city` | varchar(100) | ○ | | Município |
| `state` | varchar(2) | ○ | | Unidade federativa |
| `notes` | text | ○ | | Observações |
| `active` | boolean | ○ | | Cliente ativo |
| `party_id` | uuid | ○ | FK → `cadastro.parties` | Identidade do cadastro único. **Opcional:** o cadastro legado é anterior ao esquema `cadastro`, e a ligação foi feita por preenchimento retroativo |

> **Todos os campos fiscais são opcionais.** É decisão de projeto, não omissão: exigi-los no cadastro
> rápido interromperia o registro do pedido durante a negociação. A complementação ocorre no
> fechamento, e apenas quando há nota fiscal a emitir (RF-40).

## `suppliers`: fornecedor

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `name` | text | ● | | Nome do viveiro ou produtor |
| `contact_name` | text | ○ | | Pessoa de contato |
| `whatsapp` | varchar(20) | ○ | | Número de mensageria, apenas dígitos |
| `phone` | varchar(20) | ○ | | Telefone secundário |
| `email` | text | ○ | | Correio eletrônico |
| `instagram` | text | ○ | | Perfil em rede social |
| `city` | text | ○ | | Município |
| `state` | varchar(2) | ○ | | Unidade federativa. **Sem valor padrão**: fornecedor é de qualquer estado |
| `reliability_score` | smallint | ○ | | Grau de confiabilidade, de 0 a 5 |
| `status` | varchar(20) | ● | | `lead`, `active`, `inactive`, `do_not_contact` |
| `last_contacted_at` | timestamptz | ○ | | Último contato |
| `lat` | numeric(9,6) | ○ | | Latitude, obtida por geocodificação sob demanda |
| `lng` | numeric(9,6) | ○ | | Longitude |
| `geocoded_at` | timestamptz | ○ | | Momento da tentativa de geocodificação. Preenchido com coordenadas nulas significa **não localizado**, e evita nova tentativa automática |
| `active` | boolean | ● | | Registro arquivado por exclusão lógica |
| `notes` | text | ○ | | Observações |
| `party_id` | uuid | ○ | FK → `cadastro.parties` | Identidade do cadastro único, com a mesma opcionalidade de `customers.party_id` |

> **`active` e `status` são informações distintas**, não redundância acidental: `active` falso é
> arquivamento do registro; `status` inativo é fornecedor que parou de vender, mas cujo histórico
> interessa. `do_not_contact` registra **oposição do titular** ao contato comercial e o exclui de
> qualquer cotação: ver [`E5`](../E-qualidade/E5-mapeamento-lgpd.md).

## `supplier_species`: oferta do fornecedor

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `supplier_id` | uuid | ● | FK → `suppliers` | Fornecedor |
| `species_id` | uuid | ● | FK → `species` | Espécie ofertada, do catálogo canônico |
| `size` | text | ○ | | Porte ofertado, em texto livre |
| `container` | text | ○ | | Embalagem do fornecedor, em **texto livre**, raiz nua, lata, saco de um metro |
| `unit_price` | numeric(10,2) | ○ | | Preço unitário informado |
| `min_quantity` | integer | ○ | | Quantidade mínima de compra |
| `availability` | varchar(15) | ● | | `in_stock`, `on_order`, `unknown` |
| `source` | varchar(15) | ● | | Origem do dado: `manual`, `paste`, `quote` |
| `notes` | text | ○ | | Observações da oferta |

> **Sem restrição de unicidade por fornecedor e espécie:** o mesmo fornecedor oferece a espécie em
> portes e preços diferentes, e cada combinação é uma oferta distinta.

## `cadastro.parties`: identidade

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `kind` | varchar(2) | ○ | | **Natureza da pessoa**: `pf` ou `pj`. NULL quando não informado, o cadastro simples legado não preenchia, e presumir pessoa física para uma prefeitura seria pior que registrar a ausência |
| `document` | varchar(14) | ○ | | CPF ou CNPJ, só dígitos. UNIQUE parcial `WHERE document IS NOT NULL` |
| `name` | text | ● | | Nome usual: o que aparece nas listas |
| `legal_name` | text | ○ | | Razão social (PJ) |
| `trade_name` | text | ○ | | Nome fantasia (PJ) |
| `email`, `phone`, `whatsapp` | text/varchar | ○ | | Contato. `whatsapp` só dígitos |
| `notes` | text | ○ | | Observações |
| `active` | boolean | ● | | Soft-delete, padrão do sistema |

> **Correção de 11/08/2026.** Este dicionário descrevia `kind` como *natureza do vínculo*
> (cliente, fornecedor, funcionário). Estava errado: um `kind` único não representa o caso que
> motivou a tabela: a mesma pessoa que vende muda e também compra. O vínculo passou para
> `party_roles`, que admite N papéis por identidade; `kind` ficou com a natureza da pessoa.
> Fonte canônica: [`docs/rotinas/4-financeiro/01-cadastro-unico.md`](../../rotinas/4-financeiro/01-cadastro-unico.md).

## `cadastro.party_roles`: papéis da identidade

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `party_id` | uuid | ● | PK, FK → `cadastro.parties` | Identidade |
| `role` | varchar(20) | ● | PK | `cliente`, `fornecedor`, `funcionario`, `socio`, `familiar`, `banco`, `governo`, `contador`, `outro` |

> `funcionario` aqui é **vínculo empregatício**, e não nível de acesso. O nível de acesso é
> `users.role`, cujo valor foi renomeado para `colaborador` na migration `20260810000001`
> justamente para desfazer essa ambiguidade.

## `cadastro.addresses`: endereços da identidade

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `party_id` | uuid | ● | FK → `cadastro.parties` | Identidade |
| `label` | varchar(20) | ● | | `principal`, `entrega`, `cobranca` ou `outro`, endereço de cobrança diferente do de entrega não cabia como coluna em `customers` |
| `zip_code`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `ibge_code` | | ○ | | Endereço. `number` corresponde a `customers.address_number` |
| `lat`, `lng`, `geocoded_at` | numeric/timestamptz | ○ | | Coordenadas do mapa de fornecedores (P11 F4) |
| `is_primary` | boolean | ● | | UNIQUE parcial: no máximo um principal por identidade |

## `task_types`: tipo de tarefa

*Especificada, não implementada no protótipo.*

Vocabulário fechado da agenda de pessoal (RF-70). O tempo médio por unidade é o que liga a tarefa
de campo ao custo de mão de obra.

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `name` | text | ● | | Nome da tarefa: semeadura, repicagem, irrigação, adubação, separação |
| `category` | text | ● | | Agrupamento para leitura da agenda |
| `requires_species` | boolean | ● | | Quando verdadeiro, a atribuição exige espécie |
| `requires_container` | boolean | ● | | Quando verdadeiro, a atribuição exige recipiente |
| `unit_of_measure` | text | ○ | | Unidade do que se produz na tarefa (muda, bandeja, metro) |
| `avg_minutes_per_unit` | numeric | ○ | | Tempo médio por unidade; alimenta a estimativa de custo |
| `active` | boolean | ● | | Tipo em uso |

# Módulo 2 · Produção

## `input_usages`: consumo de insumo

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `input_id` | uuid | ● | FK → `inputs` | Insumo aplicado |
| `species_id` | uuid | ● | FK → `species` | Espécie que o recebeu |
| `container_id` | uuid | ● | FK → `containers` | Recipiente em que foi aplicado |
| `quantity` | numeric(10,3) | ● | | Quantidade consumida. Restrição: maior que zero |
| `usage_date` | date | ● | | Data do consumo |
| `notes` | text | ○ | | Observação |
| `client_id` | uuid | ○ | UK | Chave gerada **pelo aparelho** antes do primeiro envio e mantida em todos os reenvios. É o que torna o registro idempotente (RNF-05) |

> Alimentado pelo formulário de campo do colaborador (RF-14). É a entidade de maior volume de
> escrita do sistema e a que mais depende do funcionamento sem conexão.

> **Como o funcionamento sem conexão não duplica consumo.** Quando o envio falha, o formulário
> guarda o registro no aparelho e reenvia depois. Sem uma chave gerada na origem, o caso "o servidor
> gravou mas a resposta se perdeu" seria indistinguível de "não gravou", e o reenvio criaria uma
> segunda linha. Consumo duplicado inflaciona o custo por espécie, que é exatamente o número que o
> sistema existe para apurar. `client_id` é essa chave, e a restrição de unicidade sobre ela faz o
> reenvio ser ignorado em vez de duplicado. É nulo nos registros que não vêm do formulário de campo,
> como carga inicial e importação, e a unicidade do banco admite vários nulos.

## `seed_collection_costs`: custo de coleta de sementes

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `species_id` | uuid | ● | FK → `species` | Espécie coletada |
| `collection_region` | text | ○ | | Região da coleta |
| `distance_km` | numeric(8,2) | ○ | | Distância percorrida |
| `fuel_cost` | numeric(10,2) | ○ | | Combustível |
| `labor_hours` | numeric(8,2) | ○ | | Horas empregadas |
| `labor_cost_per_hour` | numeric(10,2) | ○ | | Custo da hora |
| `total_cost` | numeric(12,2) | ● | | Custo total da coleta |
| `seeds_collected_qty` | integer | ○ | | Sementes obtidas |
| `cost_per_seed` | numeric(10,4) | ○ | | **Derivado**: custo total dividido pelas sementes obtidas. Mantido pelo banco |
| `collection_date` | date | ● | | Data da coleta |

## `production_activities`: atividade de produção

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `assignment_id` | uuid | ○ | FK → `assignments` | Tarefa planejada que gerou a atividade. **Opcional:** atividade avulsa não nasce da agenda |
| `species_id` | uuid | ● | FK → `species` | Espécie produzida |
| `container_id` | uuid | ● | FK → `containers` | Recipiente utilizado |
| `activity_type` | text | ● | | Atividade em lista fechada: `semeadura`, `repicagem`, `irrigacao`, `adubacao`, `rustificacao` |
| `quantity` | integer | ● | | Quantidade de mudas envolvidas. Restrição: maior que zero |
| `activity_date` | date | ● | | Data da atividade |
| `performed_by` | uuid | ● | FK → `users` | Quem executou |
| `notes` | text | ○ | | Observação |

> Registros de `semeadura` e `repicagem` são os que **somam ao estoque**; irrigação, adubação e
> rustificação são atividades de manejo que não alteram quantidade (RN-57).

## `loss_events`: perda

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `species_id` | uuid | ● | FK → `species` | Espécie perdida |
| `container_id` | uuid | ● | FK → `containers` | Recipiente |
| `quantity` | integer | ● | | Quantidade perdida. Restrição: maior que zero |
| `cause` | text | ● | | Causa em **lista fechada**: `seca`, `praga`, `geada`, `manuseio`, `outro` |
| `loss_date` | date | ● | | Data da constatação |
| `reported_by` | uuid | ● | FK → `users` | Quem registrou |
| `notes` | text | ○ | | Observação |

> **Quatro campos no formulário de campo**, e não cinco: espécie, recipiente, quantidade e causa. A
> data assume o dia corrente e o autor vem da sessão. Registrar o local da perda dentro do viveiro
> melhoraria a análise e foi descartado: ver a nota de projeto em
> [`C2`, UC-17](C2-especificacao-casos-de-uso.md).
>
> A causa é lista fechada porque causa digitada à mão inviabiliza a análise por causa, que é
> justamente o que o indicador de mortalidade precisa produzir.

## `stock_counts`: contagem física de estoque

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `species_id` | uuid | ● | FK → `species` | Espécie contada |
| `container_id` | uuid | ● | FK → `containers` | Recipiente |
| `counted_quantity` | integer | ● | | Quantidade efetivamente contada |
| `counted_at` | date | ● | | Data da contagem |
| `counted_by` | uuid | ● | FK → `users` | Quem contou |

> **Não armazena o estoque**: armazena o evento de contagem. O estoque permanece derivado de
> produção menos perdas menos saídas; quando a contagem diverge do calculado, prevalece a contagem, e
> a divergência é ela própria informação: indica registro de produção ou de perda não realizado.

---

## `week_plans`: semana de trabalho

*Especificada, não implementada no protótipo.*

A semana é a unidade real de decisão do viveiro (RF-71, RF-73). Fechada, não se altera: sem isso
o custo do período mudaria depois de apurado (RN-50).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `week_start` | date | ● | UK | Segunda-feira da semana; única |
| `status` | text | ● | | `rascunho`, `publicada`, `fechada` |
| `published_by` | uuid | ○ | FK → `users` | Quem publicou a semana para a equipe |
| `closed_at` | timestamptz | ○ | | Momento do fechamento; a partir dele a semana é imutável |

## `assignments`: atribuição de tarefa

*Especificada, não implementada no protótipo.*

A célula da grade: uma pessoa, um dia, um turno, um tipo de tarefa. É daqui que saem as horas
(RF-71), e um turno vale quatro horas por convenção (RN-48).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `week_plan_id` | uuid | ● | FK → `week_plans` | Semana a que pertence |
| `party_id` | uuid | ● | FK → `cadastro.parties` | Quem executa: pessoa com papel `funcionario`, com ou sem usuário |
| `work_date` | date | ● | | Dia da tarefa |
| `shift` | text | ● | | `manha` ou `tarde`. Nunca hora marcada (RN-48) |
| `task_type_id` | uuid | ● | FK → `task_types` | Tipo de tarefa |
| `species_id` | uuid | ○ | FK → `species` | Espécie, quando o tipo de tarefa a exigir |
| `container_id` | uuid | ○ | FK → `containers` | Recipiente, quando o tipo de tarefa o exigir |
| `planned_quantity` | integer | ○ | | Quantidade planejada, quando aplicável |
| `is_recurring` | boolean | ● | | Tarefa fixa: renasce em toda semana nova (RF-72) |
| `status` | text | ● | | `planejada`, `confirmada`, `nao_confirmada`: a última é a que o fechamento assume como realizada (RN-51) |
| `notes` | text | ○ | | Observação livre; único campo aberto da agenda |

# Módulo 3 · Comercial

## `orders`: pedido

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `order_number` | serial | ● | | Número sequencial legível, usado na comunicação com o cliente |
| `customer_id` | uuid | ● | FK → `customers` | Cliente |
| `sale_channel` | varchar(50) | ● | | Canal de venda. Determina a margem aplicada |
| `status` | varchar(30) | ● | | Estado no ciclo. Lista fechada: ver abaixo |
| `needs_invoice` | boolean | ● | | Exige nota fiscal. Definido no fechamento |
| `delivery_date` | date | ○ | | Data prevista de entrega |
| `notes` | text | ○ | | Observações |
| `created_by` | uuid | ● | FK → `users` | Autor do registro |
| `price_approved_by` | uuid | ○ | FK → `users` | Chefia que aprovou o preço antes do fechamento (RF-44). **Especificado, não implementado.** |
| `price_approved_at` | timestamptz | ○ | | Momento da aprovação. Nulo enquanto o pedido não teve o preço aprovado. **Especificado, não implementado.** |

**Estados admitidos:** `cadastrado`, `verificando_disponibilidade`, `verificado`,
`pendente_alteracao`, `aprovado`, `separando`, `pronto_envio`, `cancelado`.

## `order_items`: item de pedido

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `order_id` | uuid | ● | FK → `orders` | Pedido |
| `species_id` | uuid | ○ | FK → `species` | Espécie. **Nulo em item genérico** |
| `container_id` | uuid | ● | FK → `containers` | Recipiente solicitado |
| `quantity` | integer | ● | | Quantidade pedida. Restrição: maior que zero |
| `is_generic` | boolean | ● | | Item sem espécie definida |
| `parent_item_id` | uuid | ○ | FK → `order_items` | Item genérico que este especializa |
| `specification` | text | ○ | | Exigência de qualidade do cliente. Único texto livre do fluxo de pedido |
| `sale_price_id` | uuid | ○ | FK → `sale_prices` | Preço vigente tomado como base. Dele saem o valor sugerido e o piso contra o qual o acordado é validado. **Especificado, não implementado.** |
| `unit_price` | numeric(10,2) | ○ | | **Preço unitário acordado com o cliente.** Pode diferir do sugerido e nunca desce abaixo do piso (RN-59, RF-33). Nulo enquanto o item não foi precificado. **Especificado, não implementado.** |
| `is_available` | boolean | ○ | | Resultado da verificação. **Nulo significa não verificado** |
| `available_quantity` | integer | ○ | | Quantidade efetivamente disponível, quando parcial |
| `available_container_id` | uuid | ○ | FK → `containers` | Recipiente realmente disponível, quando difere do solicitado |
| `availability_notes` | text | ○ | | Justificativa da verificação: por que faltou, ou o que foi oferecido no lugar |

**Restrições de integridade:**

- Item genérico não pode ter espécie.
- Item específico precisa ter espécie, salvo quando é filho de um genérico.
- Preço acordado não pode ser menor que o piso do preço vigente referenciado (RF-33).

> **O valor negociado fica no item, não no pedido:** cada espécie e recipiente tem preço próprio, e
> um pedido mistura vários. Também não se copia aqui o valor sugerido nem o piso: `sale_prices`
> guarda vigência fechada, então a referência à linha vigente recupera os dois sem duplicar dado
> (RN-58). É essa referência que sustenta o relatório de custo contra preço praticado (RF-35).

**Os quatro estados de disponibilidade**, e como se distinguem:

| Estado | `is_available` | `available_quantity` | `available_container_id` |
|---|:--:|:--:|:--:|
| Não verificado | nulo | nulo | nulo |
| Disponível | verdadeiro | nulo | nulo |
| Parcial | falso | 1 até a quantidade pedida | recipiente real |
| Indisponível | falso | 0 | nulo |

## `order_item_allowed_species`: espécies aceitas em item genérico

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `order_item_id` | uuid | ● | PK, FK → `order_items` | Item genérico |
| `species_id` | uuid | ● | PK, FK → `species` | Espécie aceita pelo cliente |

> Tabela associativa de chave composta. **Ausência de linhas significa aberto**, qualquer espécie
> atende o item.

## `order_loads`: carga

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `order_id` | uuid | ● | FK → `orders` | Pedido |
| `load_number` | integer | ● | | Número da carga dentro do pedido |
| `status` | varchar(20) | ● | | `pendente`, `separando`, `pronto` |
| `notes` | text | ○ | | Observações |

**Restrição de unicidade:** número de carga único dentro do pedido.

## `order_load_items`: item de carga

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `load_id` | uuid | ● | FK → `order_loads` | Carga |
| `order_item_id` | uuid | ● | FK → `order_items` | Item do pedido |
| `quantity` | integer | ● | | Quantidade nesta carga. Permite dividir um item entre viagens |
| `is_separated` | boolean | ● | | Separação física concluída |

## `order_status_history`: histórico de estados

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `order_id` | uuid | ● | FK → `orders` | Pedido |
| `from_status` | varchar(30) | ○ | | Estado anterior. Nulo no primeiro registro |
| `to_status` | varchar(30) | ● | | Estado novo |
| `changed_by` | uuid | ● | FK → `users` | Autor da transição |
| `notes` | text | ○ | | Justificativa |

---

## `supplier_quotes`: cotação

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `request_group_id` | uuid | ● | | Agrupa as cotações de uma mesma consulta a vários fornecedores |
| `supplier_id` | uuid | ● | FK → `suppliers` | Fornecedor consultado |
| `order_id` | uuid | ○ | FK → `orders` | Pedido de cliente que a originou. Nulo em cotação avulsa |
| `channel` | varchar(15) | ● | | `whatsapp`, `email`, `instagram`, `manual` |
| `message_text` | text | ● | | Mensagem exatamente como enviada. Auditoria do contato |
| `status` | varchar(15) | ● | | `queued`, `sent`, `responded`, `no_reply`, `cancelled` |
| `sent_at` | timestamptz | ○ | | Momento do envio |
| `responded_at` | timestamptz | ○ | | Momento da resposta |
| `raw_response` | text | ○ | | Resposta recebida, como transcrita |
| `created_by` | uuid | ● | FK → `users` | Autor da cotação |
| `notes` | text | ○ | | Observações da cotação |

## `supplier_quote_items`: item de cotação

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `quote_id` | uuid | ● | FK → `supplier_quotes` | Cotação |
| `species_id` | uuid | ● | FK → `species` | Espécie cotada |
| `order_item_id` | uuid | ○ | FK → `order_items` | Item do pedido que originou a cotação |
| `quantity` | integer | ● | | Quantidade solicitada |
| `size` | text | ○ | | Porte desejado |
| `quoted_unit_price` | numeric(10,2) | ○ | | Preço unitário informado pelo fornecedor |
| `is_chosen` | boolean | ● | | Proposta vencedora para a espécie, dentro da consulta |
| `sale_unit_price` | numeric(10,2) | ○ | | Preço de revenda ao cliente, validado contra o piso mínimo |
| `response_notes` | text | ○ | | Observações da resposta |

---Esquema separado do restante do sistema, por decisão de segurança (ver [`C6`, §3.5](C6-modelo-entidade-relacionamento.md)).

# Módulo 4 · Financeiro

## `fixed_costs`: custo fixo mensal

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `category` | enum | ● | | `salarios`, `energia`, `agua`, `manutencao`, `combustivel`, `depreciacao`, `outros` |
| `monthly_amount` | numeric(12,2) | ● | | Valor do mês |
| `reference_month` | date | ● | | Mês de referência, sempre o primeiro dia |
| `notes` | text | ○ | | Observação |

## `production_costs`: custo variável por espécie e recipiente

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `species_id` | uuid | ● | FK → `species` | Espécie |
| `container_id` | uuid | ● | FK → `containers` | Recipiente |
| `substrate_cost` | numeric(10,2) | ● | | Custo do substrato |
| `seed_cost` | numeric(10,2) | ● | | Custo da semente |
| `input_costs_json` | jsonb | ● | | Demais insumos aplicados, com quantidade e custo por insumo |
| `labor_minutes` | numeric(8,2) | ● | | Minutos de mão de obra |
| `labor_rate_id` | uuid | ○ | FK → `labor_rates` | Valor-hora do período que produziu o custo de mão de obra, guardado para responder qual taxa gerou este número (RN-53). **Especificado, não implementado.** |
| `labor_cost` | numeric(10,2) | ● | | Custo da mão de obra |
| `total_variable_cost` | numeric(12,2) | ● | | **Derivado**: soma de substrato, semente e mão de obra |
| `calculated_at` | timestamptz | ● | | Momento do último cálculo |

**Restrição de unicidade:** uma única linha por combinação de espécie e recipiente.

## `species_unit_cost`: visão de custo unitário *(não é tabela)*

Visão que compõe o custo variável apurado com o rateio do custo fixo mensal, entregando o **custo
unitário por espécie e recipiente** consumido pelo relatório de margem (RF-17). Não armazena dados:
é derivação sobre `production_costs`, `species`, `containers` e `fixed_costs`.

| Atributo exposto | Origem |
|---|---|
| `species_id`, `common_name`, `scientific_name` | `species` |
| `container_id`, `container_name` | `containers` |
| `substrate_cost`, `seed_cost`, `labor_cost`, `total_variable_cost` | `production_costs` |
| `total_fixed_cost_month` | soma de `fixed_costs` do mês corrente |
| `fixed_cost_allocated` | rateio do custo fixo sobre as combinações ativas |
| `unit_cost_estimated` | custo variável somado ao rateio |

---

## `labor_rates`: valor-hora do período

*Especificada, não implementada no protótipo.*

Um registro por mês: folha dividida por horas (RN-53). Guarda o custo da hora **da equipe**, nunca
o salário individual.

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `year` | integer | ● | | Ano de referência |
| `month` | integer | ● | | Mês de referência |
| `payroll_total` | numeric(14,2) | ● | | Total da folha do mês, vindo do financeiro |
| `hours_total` | numeric(10,2) | ● | | Horas apuradas na agenda do mês |
| `hourly_rate` | numeric(12,4) | ● | | Derivado: `payroll_total / hours_total` |

## `financeiro.accounts`: conta

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `code` | text | ● | UK | Código curto da conta |
| `name` | text | ● | | Designação |
| `holder` | text | ● | | Titular |
| `kind` | text | ● | | `corrente`, `pagamento`, `caixa` |
| `opening_balance` | numeric(14,2) | ● | | Saldo no marco zero |
| `opening_balance_date` | date | ● | | Data do saldo inicial |

> Inclui uma conta de **dinheiro em espécie**, para que a regra "nenhum lançamento sem conta" não
> empurre o gasto em dinheiro para fora do sistema.

## `financeiro.cost_centers`: centro de custo

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `code` | text | ● | UK | Código |
| `name` | text | ● | | Designação |
| `nature` | text | ● | | `negocio` ou `pessoal` |
| `active` | boolean | ● | | Oferecido em novos lançamentos |

> **É o centro de custo que separa negócio de pessoal.** Não há campo de natureza no lançamento.
> a natureza deriva do centro. Foi a natureza digitada linha a linha que produziu, na planilha
> anterior, classificação errada nos dois sentidos.

## `financeiro.category_groups` e `financeiro.categories`: classificação

*Especificada, não implementada no protótipo.*

| `financeiro.category_groups` | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `name` | text | ● | | Nome do grupo |

| `financeiro.categories` | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `group_id` | uuid | ● | FK → `financeiro.category_groups` | Grupo |
| `name` | text | ● | | Nome da categoria |
| `direction` | text | ● | | `saida`, `entrada` ou `ambos`. Restringe o que a lista oferece conforme o sinal do valor |

## `financeiro.statement_imports`: importação de extrato

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `account_id` | uuid | ● | FK → `financeiro.accounts` | Conta do extrato |
| `source_format` | text | ● | | Formato do arquivo |
| `file_name` | text | ● | | Nome do arquivo |
| `file_hash` | text | ● | | Resumo do conteúdo, para detectar reimportação |
| `period_start` / `period_end` | date | ● | | Intervalo coberto |
| `rows_total` | integer | ● | | Linhas lidas |
| `rows_new` | integer | ● | | Linhas inéditas |
| `rows_duplicated` | integer | ● | | Linhas já existentes, descartadas |
| `imported_by` | uuid | ● | FK → `users` | Autor da importação |

## `financeiro.transactions`: lançamento *(entidade central do financeiro)*

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `account_id` | uuid | ● | FK → `financeiro.accounts` | Conta. **Nada existe sem conta** |
| `import_id` | uuid | ○ | FK → `financeiro.statement_imports` | Lote de importação. Nulo se lançado manualmente |
| `posted_at` | date | ● | | Quando o banco moveu. **Nunca editado** |
| `competence_date` | date | ● | | Mês a que o gasto pertence. Assume a data de movimentação por padrão |
| `amount` | numeric(14,2) | ● | | Valor. **Negativo é saída, positivo é entrada** |
| `description_raw` | text | ● | | Descrição do banco. **Nunca editada: é a prova** |
| `fitid` | text | ○ | | Identificador do movimento no arquivo do banco |
| `dedupe_key` | text | ● | | Chave de deduplicação, quando o formato não traz identificador |
| `balance_after` | numeric(14,2) | ○ | | Saldo após o movimento, quando informado |
| `kind` | text | ● | | `despesa`, `receita`, `transferencia`, `aporte`, `retirada`, `estorno` |
| `installment_number` | smallint | ○ | | Número da parcela |
| `installment_total` | smallint | ○ | | Total de parcelas |
| `installment_total_amount` | numeric(14,2) | ○ | | Valor cheio da compra parcelada |
| `category_id` | uuid | ○ | FK → `financeiro.categories` | Categoria |
| `cost_center_id` | uuid | ○ | FK → `financeiro.cost_centers` | Centro de custo. Nulo quando há rateio |
| `party_id` | uuid | ○ | FK → `cadastro.parties` | Contraparte |
| `transfer_pair_id` | uuid | ○ | FK → `financeiro.transactions` | Perna oposta da transferência entre contas próprias |
| `order_id` | uuid | ○ | FK → `orders` | Pedido conciliado, quando entrada |
| `supplier_quote_id` | uuid | ○ | FK → `supplier_quotes` | Cotação conciliada, quando saída |
| `status` | text | ● | | `a-classificar`, `classificado`, `conciliado`, `ignorado` |
| `classified_by` | uuid | ○ | FK → `users` | Autor da classificação |
| `classified_at` | timestamptz | ○ | | Momento da classificação |

**Restrições de unicidade**: o que torna a reimportação segura: identificador do movimento único por
conta, quando existir; chave de deduplicação única por conta, sempre. Reimportar o mesmo arquivo não
cria nada.

**Por que o sinal no valor em vez de uma coluna de direção:** é como o extrato entrega, e faz a soma
dos valores do período ser o saldo diretamente.

## `financeiro.transaction_splits`: rateio

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `transaction_id` | uuid | ● | FK → `financeiro.transactions` | Lançamento rateado |
| `cost_center_id` | uuid | ● | FK → `financeiro.cost_centers` | Centro que recebe a parte |
| `category_id` | uuid | ○ | FK → `financeiro.categories` | Categoria da parte. Nulo herda a do lançamento |
| `amount` | numeric(14,2) | ● | | Valor da parte |

**Invariante:** havendo rateio, a soma das partes iguala o valor do lançamento. Validada na camada de
aplicação, onde a mensagem de erro é legível e o comportamento é verificável por teste automatizado.

## `financeiro.classification_rules`: regra de classificação

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `pattern` | text | ● | | Trecho ou expressão a reconhecer na descrição |
| `match_type` | text | ● | | `contains` ou `regex` |
| `account_id` | uuid | ○ | FK → `financeiro.accounts` | Restringe a regra a uma conta |
| `category_id` | uuid | ○ | FK → `financeiro.categories` | Categoria a aplicar |
| `cost_center_id` | uuid | ○ | FK → `financeiro.cost_centers` | Centro a aplicar |
| `party_id` | uuid | ○ | FK → `cadastro.parties` | Contraparte a aplicar |
| `priority` | integer | ● | | Ordem de avaliação |
| `hits` | integer | ● | | Quantas vezes já se aplicou |
| `active` | boolean | ● | | Regra em uso |

> É a entidade que faz a fila de pendências **encolher** a cada mês, em vez de crescer: cada
> classificação manual vira regra para as próximas.

## `financeiro.periods`: fechamento mensal

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `account_id` | uuid | ● | FK → `financeiro.accounts` | Conta |
| `year` / `month` | integer | ● | | Período |
| `status` | text | ● | | `aberto` ou `fechado` |
| `closing_balance` | numeric(14,2) | ○ | | Saldo conferido no fechamento |
| `closed_by` | uuid | ○ | FK → `users` | Autor do fechamento |
| `closed_at` | timestamptz | ○ | | Momento do fechamento |

> Mês fechado não aceita alteração, e **só mês fechado vira indicador** (RF-61). Período incompleto
> exibe travessão, não número: comparar um mês parcial com um mês cheio inventa variação.

---

## `sale_channels`: canal de venda

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `code` | text | ● | UK | Código curto: atacado, compensacao, paisagismo, prefeitura, varejo |
| `name` | text | ● | | Designação apresentada ao usuário |
| `default_margin_pct` | numeric(6,3) | ● | | Margem padrão aplicada sobre o custo unitário |
| `min_margin_pct` | numeric(6,3) | ● | | Margem mínima admitida. Base do cálculo do piso |
| `active` | boolean | ● | | Canal em uso |

> A margem é atributo do canal, não do preço: alterá-la deve refletir-se em todos os preços do canal.

## `sale_prices`: preço de venda vigente

*Especificada, não implementada no protótipo.*

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `species_id` | uuid | ● | FK → `species` | Espécie |
| `container_id` | uuid | ● | FK → `containers` | Recipiente. Junto à espécie, identifica o produto |
| `channel_id` | uuid | ● | FK → `sale_channels` | Canal de venda |
| `unit_cost_snapshot` | numeric(10,2) | ● | | **Custo unitário vigente quando o preço foi definido.** Permite responder qual era a margem no momento da venda |
| `margin_pct` | numeric(6,3) | ● | | Margem efetivamente aplicada, que pode diferir da padrão do canal |
| `unit_price` | numeric(10,2) | ● | | Preço unitário sugerido |
| `floor_price` | numeric(10,2) | ● | | Piso mínimo. Abaixo dele a venda é recusada, não apenas alertada |
| `valid_from` | date | ● | | Início da vigência |
| `valid_to` | date | ○ | | Fim da vigência. Nulo indica preço vigente |
| `defined_by` | uuid | ● | FK → `users` | Quem definiu o preço |

**Restrição de unicidade:** um único preço vigente por espécie, recipiente e canal, garantida pela
ausência de sobreposição entre períodos de vigência.

> O preço efetivamente acordado é registrado no item do pedido (`order_items.unit_price`), e pode
> diferir do sugerido dentro do limite do piso. Esta entidade é fonte de sugestão e de validação, nunca de imposição.

---

## Resumo

| Módulo | Entidades | Observação |
|---|---:|---|
| *(transversal)* Acesso | 4 | |
| 1 · Cadastros | 13 | inclui `task_types` e o esquema `cadastro` (`parties`, `party_roles`, `addresses`) |
| 2 · Produção | 7 | consumo, coleta, atividade, perda, contagem |
| 3 · Comercial | 8 | pedido, item, carga, cotação |
| 4 · Financeiro | 14 | nove entidades no esquema `financeiro`, mais custeio e preço em `public` |
| **Total** | **46** | mais `species_unit_cost`, que é visão e não tabela |



