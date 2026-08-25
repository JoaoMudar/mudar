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

Este dicionário descreve o **modelo especificado**, que é maior que o protótipo construído. Das 55
entidades, **44 existem no banco** (mais as duas visões, `species_unit_cost` e
`input_stock_balance`) e **11 estão especificadas e ainda não implementadas**. A distinção é
registrada entidade por entidade, e não é defeito de modelagem: o modelo responde à especificação
completa de requisitos, e a construção segue a priorização declarada em
[`B2`](../B-requisitos/B2-especificacao-requisitos.md).

| Módulo | No banco | Só especificadas |
|---|---:|---:|
| *(transversal)* Acesso | 5 | 0 |
| 1 · Cadastros | 16 | 0 |
| 2 · Produção | 12 | 0 |
| 3 · Comercial | 8 | 0 |
| 4 · Financeiro | 3 | 11 |
| **Total** | **44** | **11** |

As 11 pendentes são todas do Financeiro: `sale_channels`, `sale_prices` e as nove do esquema
`financeiro` (`accounts`, `cost_centers`, `category_groups`, `categories`, `statement_imports`,
`transactions`, `transaction_splits`, `classification_rules`, `periods`).

**A Produção deixou de ser o módulo mais especificado e menos construído em 24/08/2026**, quando as
migrations `20260824000001` a `20260824000007` criaram as dezesseis entidades do lote, da agenda,
do apontamento e do estoque de insumo. O que ainda não existe ali é **tela**: as tabelas estão no
banco, com a carga inicial dos vinte e dois tipos de tarefa e dos dois turnos, e a construção da
aplicação está planejada em [`plans/P14`](../../../plans/P14-producao-lotes-apontamento.md).

**Nove das 27 entraram em 24/08/2026**, com a revisão de escopo que trouxe o lote
([`A1`](../A-fundacao/A1-documento-de-visao.md) §7). A Produção passou a ser o módulo mais
especificado e o menos construído, dez de doze no papel: é o módulo cuja construção depende de a
equipe mudar de hábito, e não só de haver tela.

Quatro atributos de entidade já existente estão na mesma condição: `users.party_id`, o par
`order_items.unit_price` / `order_items.sale_price_id`, que depende de `sale_prices`, e o par
`input_usages.task_execution_id` / `input_usages.batch_id`.

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

## `settings`: parâmetro do sistema

Parâmetro escalar em chave e valor tipado. Existe para tirar do código e da variável de ambiente
o que **é regra de negócio e não infraestrutura**: quem decide o limiar de mortalidade, as
coordenadas do viveiro ou a margem mínima de revenda é a chefia, e hoje mudar qualquer um deles
exige uma implantação.

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `key` | text | ● | UK | Chave estável do parâmetro, em minúsculas com ponto: `producao.mortalidade_limite_pct` |
| `value` | text | ● | | Valor, sempre em texto |
| `value_type` | text | ● | | Tipo em **lista fechada**: `texto`, `numero`, `booleano`, `data`. Diz como interpretar `value` |
| `description` | text | ● | | O que o parâmetro governa, em português, para a tela de configurações |
| `updated_at` | timestamptz | ● | | Momento da última alteração |
| `updated_by` | uuid | ○ | FK → `users` | Quem alterou |

> **Onde está a fronteira entre `settings` e cadastro.** Parâmetro que é **um valor** mora aqui.
> Parâmetro que é **uma lista de coisas com atributos** vira entidade: foi o caso de
> `financeiro.cost_centers`, e é o caso do período de trabalho, que virou `work_shifts` no módulo
> 1 em vez de quatro chaves aqui. A regra de corte é a dos Cadastros: se apagar deixa um movimento
> passado sem sentido, é entidade.

> **`value` é texto e `value_type` diz como lê-lo.** A alternativa, uma coluna por tipo, deixaria
> três nulas em toda linha. O tipo declarado é o que permite a tela de configurações apresentar o
> campo certo e validar antes de gravar.

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

Vocabulário fechado da agenda e do apontamento (RF-70). **É o catálogo que comanda o formulário**:
os três `requires_*` e o `measurement_type` decidem o que a tela pede em cada tarefa (RF-82). O
tempo médio por unidade é o que liga a tarefa de campo ao custo de mão de obra.

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `name` | text | ● | | Nome da tarefa: semear, repicar, encher saquinho, limpar mato, separar mudas |
| `category` | text | ● | | Categoria em **lista fechada**: `semente`, `terra`, `plantio`, `manutencao`, `pos_morte`, `expedicao` (RN-80) |
| `measurement_type` | text | ● | | Forma de medição em **lista fechada**: `tempo`, `saco`, `tubete`. Decide se o encerramento pede contagem além do relógio (RN-81) |
| `requires_species` | boolean | ● | | Quando verdadeiro, a atribuição e o apontamento exigem espécie |
| `requires_container` | boolean | ● | | Quando verdadeiro, exigem recipiente |
| `requires_batch` | boolean | ● | | Quando verdadeiro, exigem lote, e com ele o canteiro (RN-82) |
| `avg_minutes_per_unit` | numeric | ○ | | Tempo médio por unidade; alimenta a estimativa de custo |
| `active` | boolean | ● | | Tipo em uso |

> **`unit_of_measure` saiu da entidade.** Era texto livre ("muda", "bandeja", "metro") e não
> decidia comportamento algum: quem decide o que a tela pede é `measurement_type`, que é lista
> fechada. Guardar os dois seria manter a mesma informação em dois graus de rigor, e na hora de
> programar o mais frouxo venceria. A entidade nunca chegou ao banco: a troca não custou migração.

> **Toda tarefa mede tempo.** O apontamento tem início e fim sempre (`task_executions`), e
> `measurement_type` só diz se **também** se conta quanto foi feito. Por isso os valores são
> `tempo`, `saco` e `tubete`, e não "tempo *ou* quantidade": a pergunta do viveiro é "quantos fez
> em quantas horas", e `saco` e `tubete` respondem as duas metades.

**Carga inicial: as 22 tarefas do viveiro.** O catálogo nasce preenchido, e não vazio, porque tipo
de tarefa digitado por quem monta a agenda produziria "limpar mato", "limpeza de mato" e "capina"
como três tarefas distintas, e a soma de horas por tarefa deixaria de existir.

| Categoria | Tarefas | Medição | Exige lote |
|---|---|---|:--:|
| `semente` | Colher semente · Beneficiar semente · Semear | tempo | não |
| `terra` | Fazer substrato | tempo | não |
| `terra` | Encher saquinho | saco | não |
| `terra` | Encher tubete | tubete | não |
| `plantio` | Encanteirar saco · Plantar no saquinho | saco | **sim** |
| `plantio` | Plantar no tubete | tubete | **sim** |
| `manutencao` | Classificar pós-germinação · Classificar seleção · Repicar · Limpar mato | tubete | **sim** |
| `manutencao` | Aplicação de adubo · Aplicação de fungicida · Irrigação | tempo | não |
| `pos_morte` | Limpar canteiro · Replantar no saco | tempo | **sim** |
| `pos_morte` | Limpar saco · Limpar tubete | tempo | não |
| `expedicao` | Separar mudas | tempo | **sim** |
| `expedicao` | Carregar | tempo | não |

> **Semear não exige lote, e plantar exige.** É o ponto em que a leva ganha endereço: a semente vai
> para bandeja de germinação, que não é canteiro. O lote nasce no plantio, e "classificar
> pós-germinação", que já exige lote, ocorre depois dele.

> **Classificar aparece duas vezes** porque são dois momentos com propósitos distintos:
> *pós-germinação* separa o que germinou do que não germinou, e *seleção* separa as maiores das
> menores quando trocam de bandeja. Ambas produzem perda no mesmo gesto (RN-90).

## `areas`: área do viveiro

Divisão física do viveiro, identificada por letra. É a primeira metade do endereço de uma muda
(RN-74).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `letter` | text | ● | UK | Letra da área: A, B, C. Única |
| `name` | text | ○ | | Nome pelo qual a equipe se refere a ela, quando houver |
| `notes` | text | ○ | | Observação |
| `active` | boolean | ● | | Área em uso |

## `beds`: canteiro

Subdivisão da área, numerada dentro dela. É a segunda metade do endereço, e o que a tarefa de campo
pede para ser executada.

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `area_id` | uuid | ● | FK → `areas` | Área a que pertence |
| `number` | integer | ● | UK | Número dentro da área. Restrição: maior que zero |
| `capacity` | integer | ○ | | Quantas mudas o canteiro comporta; serve de aviso ao criar lote, não de trava |
| `notes` | text | ○ | | Observação |
| `active` | boolean | ● | | Canteiro em uso |

> **A unicidade é do par (`area_id`, `number`), não do número sozinho.** A numeração recomeça em
> cada área: existe o canteiro 4 da área A e o canteiro 4 da área B, e são dois lugares diferentes.
> É o vocabulário que a equipe já usa apontando com o dedo.

> `capacity` não trava a criação de lote de propósito. O viveiro sabe apertar mais do que a conta
> quando precisa, e uma trava aqui faria a gerência registrar o lote no canteiro errado para
> conseguir registrá-lo.

## `work_shifts`: turno de trabalho

O **período de trabalho** (RF-83). Existe para tirar de dentro do código o número que a RN-48
trazia no próprio enunciado: um turno valia quatro horas por convenção, e convenção que muda com a
estação e com a combinação da equipe é dado, não constante (RN-85).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `code` | text | ● | UK | Código estável: `manha`, `tarde` |
| `name` | text | ● | | Nome exibido |
| `start_time` | time | ● | | Hora de início |
| `end_time` | time | ● | | Hora de término. Restrição: posterior a `start_time` |
| `sort_order` | integer | ● | | Ordem de exibição no dia |
| `active` | boolean | ● | | Turno em uso |

> **A duração do turno é derivada**, `end_time` menos `start_time`, e não campo. Guardá-la
> permitiria que ela divergisse dos horários que a própria linha declara.

> **`code` é estável e `name` é editável.** A agenda e o apontamento referenciam o turno por
> `shift_id`, mas relatório e carga inicial precisam de um identificador que sobreviva a alguém
> renomear "Manhã" para "Manhã (verão)".

# Módulo 2 · Produção

## `batches`: lote

**A leva de mudas da mesma espécie, no mesmo recipiente, plantada junta e ocupando um canteiro**
(RN-75). É a entidade que diz *onde* a muda está e *de que leva* ela veio: até 24/08/2026 o modelo
respondia o que a muda era e não onde estava. A revisão de escopo está justificada em
[`A1`](../A-fundacao/A1-documento-de-visao.md) §7.

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `code` | text | ● | UK | Código legível, gerado pelo sistema: ano, área, canteiro e sequência |
| `species_id` | uuid | ● | FK → `species` | Espécie da leva |
| `container_id` | uuid | ● | FK → `containers` | Recipiente, que define o porte da muda |
| `bed_id` | uuid | ○ | FK → `beds` | Canteiro ocupado. Nulo quando o lote está encerrado |
| `parent_batch_id` | uuid | ○ | FK → `batches` | Lote de origem, quando este nasceu de uma repicagem (RN-77) |
| `initial_quantity` | integer | ● | | Quantidade que entrou. Restrição: maior que zero |
| `current_quantity` | integer | ● | | Saldo vivo. Restrição de banco: não negativo (RN-78). **Mantido pela aplicação** na mesma transação do movimento |
| `stage` | text | ● | | Fase em **lista fechada**: `semeado`, `germinado`, `repicado`, `crescimento`, `rustificacao`, `pronto`, `encerrado` |
| `planted_at` | date | ● | | Data em que a leva foi plantada no canteiro |
| `expected_ready_at` | date | ○ | | **Derivado**: `planted_at` mais o tempo de produção da espécie. Fica nulo quando a espécie não o tem cadastrado |
| `closed_at` | timestamptz | ○ | | Momento do encerramento; a partir dele o lote sai da ocupação |
| `notes` | text | ○ | | Observação |

> **Um lote ocupa um canteiro** (RN-76). Leva que não cabe em um canteiro é outro lote, e não o
> mesmo lote espalhado. A alternativa, uma entidade de ocupação com quantidade por canteiro,
> custaria um nível de indireção em toda tela que pede lote, para representar o que dois lotes já
> representam. E a pergunta da operação é "o que tem neste canteiro", que um lote por canteiro
> responde sem junção.

> **`bed_id` é opcional apenas para o lote encerrado.** Enquanto aberto, todo lote tem canteiro:
> lote sem lugar é a situação que a entidade existe para eliminar. Ao encerrar, o canteiro é
> liberado para o próximo (RN-79), e o histórico do lote permanece consultável pelos movimentos.

> **`current_quantity` é a única quantidade materializada do modelo, e a exceção é declarada.** O
> saldo poderia ser somado de `batch_movements` a cada leitura, como o estoque de espécie faz. Aqui
> não: a tela de ocupação lê o saldo de todos os lotes abertos de uma vez, no celular, em rede
> instável. **Quem o mantém é a aplicação**, na mesma transação que grava o movimento, e não um
> gatilho: a migration cria a restrição de não negativo e deixa a atualização com quem já está
> dentro da transação. `batch_movements` é a fonte que o audita, e divergência entre os dois é
> defeito detectável, não ambiguidade de modelo.

> **`parent_batch_id` é o que a repicagem produz.** A muda que passa do tubete para o saco mudou de
> recipiente, e recipiente define produto, custo e preço: comercialmente, virou outra coisa. Por
> isso a repicagem não move o lote, baixa parte do de origem e cria um novo apontando para ele.
> Percorrer a cadeia responde **de cada mil sementes semeadas, quantas mudas chegaram à venda**,
> que é a pergunta que o viveiro nunca pôde responder.

## `batch_movements`: movimento de lote

O razão que explica o saldo do lote. Toda alteração de `batches.current_quantity` tem uma linha
aqui, com motivo e origem.

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `batch_id` | uuid | ● | FK → `batches` | Lote movimentado |
| `movement_type` | text | ● | | Motivo em **lista fechada**: `entrada`, `perda`, `repicagem_saida`, `repicagem_entrada`, `venda`, `ajuste_contagem`, `transferencia` |
| `quantity` | integer | ● | | Quantidade movimentada, com sinal: positiva na entrada, negativa na saída |
| `movement_date` | date | ● | | Data do movimento |
| `from_bed_id` | uuid | ○ | FK → `beds` | Canteiro de origem, só em `transferencia` |
| `to_bed_id` | uuid | ○ | FK → `beds` | Canteiro de destino, só em `transferencia` |
| `task_execution_id` | uuid | ○ | FK → `task_executions` | Apontamento que o originou, quando veio de uma tarefa |
| `loss_event_id` | uuid | ○ | FK → `loss_events` | Perda que o originou |
| `stock_count_id` | uuid | ○ | FK → `stock_counts` | Contagem física que o originou |
| `recorded_by` | uuid | ● | FK → `users` | Quem registrou |
| `notes` | text | ○ | | Observação |

> **As três origens são exclusivas entre si e todas opcionais.** Movimento sem origem é o ajuste
> manual da gerência, que existe e precisa caber. Prendê-lo a uma origem obrigatória faria a
> correção de um erro de digitação ser impossível sem inventar uma perda que não houve.

> **A repicagem grava dois movimentos**, `repicagem_saida` no lote de origem e `repicagem_entrada`
> no de destino, e a diferença entre eles, quando houver, é uma `perda` no lote de origem (RN-90).
> A soma "repicadas mais perdidas" tem de igualar a quantidade que saiu: sem isso a diferença
> viraria evaporação silenciosa, e a mortalidade ficaria subestimada exatamente na etapa que mais
> mata.

> **`transferencia` muda o canteiro sem mudar o lote.** É o caso em que a mesma leva é remanejada
> de lugar sem trocar de recipiente, e por isso não gera lote filho: quem muda é o endereço, não a
> identidade. `quantity` é zero nesse movimento, e `from_bed_id` e `to_bed_id` carregam o que
> mudou.

## `input_usages`: consumo de insumo

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `input_id` | uuid | ● | FK → `inputs` | Insumo aplicado |
| `task_execution_id` | uuid | ○ | FK → `task_executions` | Apontamento em que o insumo foi gasto |
| `batch_id` | uuid | ○ | FK → `batches` | Lote que o recebeu |
| `species_id` | uuid | ○ | FK → `species` | Espécie que o recebeu. Dispensável quando há lote, que a determina |
| `container_id` | uuid | ○ | FK → `containers` | Recipiente em que foi aplicado. Dispensável quando há lote |
| `quantity` | numeric(10,3) | ● | | Quantidade consumida. Restrição: maior que zero |
| `usage_date` | date | ● | | Data do consumo |
| `notes` | text | ○ | | Observação |
| `client_id` | uuid | ○ | UK | Chave gerada **pelo aparelho** antes do primeiro envio e mantida em todos os reenvios. É o que torna o registro idempotente (RNF-05) |

> Alimentado pelo formulário de campo do colaborador (RF-14) e, a partir desta revisão, também
> pelo encerramento da tarefa (RF-101). É a entidade de maior volume de escrita do sistema e a que
> mais depende do funcionamento sem conexão.

> **`species_id` e `container_id` afrouxaram para opcionais.** Eram obrigatórios porque não havia
> outro jeito de saber onde o insumo foi aplicado. Com lote, os dois vêm dele, e pedi-los de novo
> seria pedir duas vezes o mesmo dado. Continuam existindo para o registro avulso, que é como a
> tela de campo funciona hoje e continua funcionando. A migração é aditiva: as linhas existentes
> permanecem com os dois preenchidos.

> **Um dos dois lados tem de existir**: ou o lote, ou o par espécie e recipiente. Consumo sem
> destino não entra no custeio, e é o custeio que a entidade existe para alimentar.

> **Como o funcionamento sem conexão não duplica consumo.** Quando o envio falha, o formulário
> guarda o registro no aparelho e reenvia depois. Sem uma chave gerada na origem, o caso "o servidor
> gravou mas a resposta se perdeu" seria indistinguível de "não gravou", e o reenvio criaria uma
> segunda linha. Consumo duplicado inflaciona o custo por espécie, que é exatamente o número que o
> sistema existe para apurar. `client_id` é essa chave, e a restrição de unicidade sobre ela faz o
> reenvio ser ignorado em vez de duplicado. É nulo nos registros que não vêm do formulário de campo,
> como carga inicial e importação, e a unicidade do banco admite vários nulos.

## `input_stock_entries`: entrada de estoque de insumo

O que **entra** no estoque de insumo. A saída é o próprio `input_usages`, e o saldo é a visão
`input_stock_balance`: não há campo de saldo em `inputs` (RN-88).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `input_id` | uuid | ● | FK → `inputs` | Insumo |
| `entry_type` | text | ● | | Motivo em **lista fechada**: `compra`, `ajuste`, `perda` |
| `quantity` | numeric(12,3) | ● | | Quantidade, com sinal: negativa em `perda` e em ajuste para baixo |
| `unit_cost` | numeric(12,4) | ○ | | Custo unitário da entrada, quando `compra` |
| `entry_date` | date | ● | | Data da entrada |
| `transaction_id` | uuid | ○ | FK → `financeiro.transactions` | Lançamento que a pagou, quando conciliado. **Especificado, não implementado**: a coluna entra junto com o esquema `financeiro`, como `task_expenses.cost_center_id` |
| `recorded_by` | uuid | ● | FK → `users` | Quem registrou |
| `notes` | text | ○ | | Observação |

> **Só entradas, e a razão é evitar duplicação.** O desenho alternativo, um razão único com
> entradas e saídas, obrigaria cada `input_usages` a gerar uma segunda linha dizendo o mesmo, e as
> duas divergiriam ao primeiro registro que falhasse pela metade. Aqui `input_usages` é a saída, e
> não há espelho.

> **`inputs.quantity_purchased` fica obsoleta e não é removida.** Ela guarda a última compra, e
> sobrescrevê-la a cada compra apagava o histórico. A migração é aditiva, e a coluna permanece até
> que as telas que a leem passem a usar a visão.

## `input_stock_balance`: saldo de insumo *(não é tabela)*

Visão derivada: soma de `input_stock_entries` menos soma de `input_usages`, por insumo (RF-102).

| Atributo | Origem |
|---|---|
| `input_id` | `inputs.id` |
| `input_name` | `inputs.name` |
| `unit_of_measure` | `inputs.unit_of_measure` |
| `total_in` | Soma de `input_stock_entries.quantity` |
| `total_used` | Soma de `input_usages.quantity` |
| `balance` | `total_in` menos `total_used` |
| `last_entry_date` | Maior `entry_date` do insumo |

> **Saldo negativo é permitido e sinalizado, não recusado** (RF-105). O saldo depende de toda
> compra ter sido lançada, e o histórico do viveiro diz que nem toda foi: recusar o consumo real
> por causa de uma compra não lançada faria o campo parar de registrar consumo, que é o dado mais
> caro de obter. **O negativo aqui é o alerta** de que falta lançar compra.

> **É a segunda visão do modelo**, ao lado de `species_unit_cost`, e pelo mesmo motivo: o número é
> derivado e guardá-lo criaria uma segunda verdade sobre ele.

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

## `task_executions`: apontamento de tarefa

**O realizado, contra `assignments`, que é o planejado.** Uma linha por funcionário e por tarefa,
com hora de início e de fim: é dela que saem as horas do período (RF-100) e é ela que sustenta o
cartão do funcionário na agenda do dia (RF-94).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `assignment_id` | uuid | ○ | FK → `assignments` | Tarefa planejada que a originou. **Opcional:** apontamento avulso não nasce da agenda |
| `task_type_id` | uuid | ● | FK → `task_types` | Tipo de tarefa executado |
| `party_id` | uuid | ● | FK → `cadastro.parties` | Quem executou: pessoa com papel `funcionario`, com ou sem usuário |
| `work_date` | date | ● | | Dia de trabalho a que o apontamento pertence |
| `started_at` | timestamptz | ● | | Momento em que a tarefa começou |
| `ended_at` | timestamptz | ○ | | Momento em que terminou. **Nulo significa tarefa em curso** |
| `batch_id` | uuid | ○ | FK → `batches` | Lote trabalhado, quando o tipo de tarefa o exigir (RN-82) |
| `species_id` | uuid | ○ | FK → `species` | Espécie, quando o tipo de tarefa a exigir e não houver lote |
| `container_id` | uuid | ○ | FK → `containers` | Recipiente, nas mesmas condições |
| `quantity` | integer | ○ | | Quantos foram feitos. Pedido apenas quando a medição for `saco` ou `tubete` (RN-81) |
| `status` | text | ● | | Situação em **lista fechada**: `em_andamento`, `concluida`, `interrompida` |
| `recorded_by` | uuid | ● | FK → `users` | Quem registrou o apontamento, distinto de quem o executou |
| `notes` | text | ○ | | Observação |
| `client_id` | uuid | ○ | UK | Chave gerada **pelo aparelho** antes do primeiro envio. Torna o reenvio idempotente (RNF-05) |

> **Substituiu `production_activities`, e não é renomeação cosmética.** A entidade anterior
> registrava um fato consumado (espécie, recipiente, quantidade, data) e o classificava por
> `activity_type`, uma segunda lista fechada que duplicava o catálogo de `task_types`: manter as
> duas garantiria que divergiriam. A nova registra um **intervalo de trabalho de uma pessoa**,
> classificado pelo próprio catálogo. Nunca chegou ao banco: a troca não custou migração de dado.

> **Uma pessoa faz uma tarefa por vez** (RN-83), e o banco garante isso com **índice único parcial
> sobre `party_id` onde `ended_at` é nulo**. Não é validação de aplicação de propósito: duas telas
> abertas ao mesmo tempo a burlariam, e dois apontamentos abertos contariam a mesma hora duas
> vezes, inflando o custo de mão de obra, que é o número que o sistema existe para apurar.

> **Começar outra tarefa encerra a anterior**, na mesma transação e sem perguntar. O gesto de
> começar já declara que saiu da anterior; pedir confirmação acrescentaria um toque a algo que se
> repete dezenas de vezes por dia. A alternativa, exigir encerrar antes de começar, produziria
> tarefas eternamente abertas justamente nos dias corridos.

> **`quantity` é opcional e quem decide é o catálogo.** Tarefa medida por tempo encerra sem número
> algum; tarefa medida por saco ou tubete pede a contagem. E mesmo nessas, deixar em branco é
> aceito, com o apontamento marcado como sem contagem: hora sem contagem vale mais do que nenhum
> registro.

> **`recorded_by` e `party_id` são pessoas diferentes, e a distinção é o ponto.** Quem opera a tela
> é uma pessoa só, coordenando a equipe inteira de um aparelho: é ela quem marca que Rogério saiu
> da repicagem e foi para a irrigação. `party_id` é Rogério; `recorded_by` é quem clicou.

## `assignment_members`: participante da tarefa

Quem foi escalado numa atribuição. Existe porque uma tarefa admite vários executores, e o mesmo
turno admite duas tarefas com grupos diferentes (RN-84).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `assignment_id` | uuid | ● | PK, FK → `assignments` | Atribuição |
| `party_id` | uuid | ● | PK, FK → `cadastro.parties` | Funcionário escalado |

> **`assignments` perdeu `party_id` para cá.** Com a pessoa dentro da própria atribuição, escalar
> quatro funcionários na mesma tarefa criaria quatro atribuições idênticas, e a tarefa deixaria de
> ser uma coisa só para virar quatro coisas parecidas: metade da equipe enchendo saquinho enquanto
> a outra repica é a norma do viveiro, não a exceção.

> **A tabela não guarda hora.** Quem sai da tarefa em momento diferente do grupo é registrado em
> `task_executions`, uma linha por pessoa: aqui fica só o planejado.

## `task_expenses`: gasto extra da tarefa

Despesa incorrida na execução e não coberta pelos insumos: frete de uma carga de terra, diária de
maquinário, compra de emergência (RF-104).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `task_execution_id` | uuid | ○ | FK → `task_executions` | Apontamento em que o gasto ocorreu |
| `assignment_id` | uuid | ○ | FK → `assignments` | Atribuição, quando o gasto é do grupo e não de um executor |
| `description` | text | ● | | O que foi gasto |
| `amount` | numeric(12,2) | ● | | Valor. Restrição: maior que zero |
| `expense_date` | date | ● | | Data do gasto |
| `cost_center_id` | uuid | ○ | FK → `financeiro.cost_centers` | Centro de custo, quando classificado |
| `recorded_by` | uuid | ● | FK → `users` | Quem registrou |
| `notes` | text | ○ | | Observação |

> **É custo direto do lote, não custo fixo rateado** (RN-89): quem pagou por ele foi aquela leva, e
> diluí-lo no rateio geral esconderia justamente a leva cara. O lote vem por
> `task_execution_id`, e não por coluna própria, para que não existam dois caminhos até ele.

> **Um dos dois vínculos tem de existir.** Gasto sem tarefa não é gasto de tarefa: é lançamento do
> Financeiro, e o lugar dele é `financeiro.transactions`.

## `loss_events`: perda

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `batch_id` | uuid | ○ | FK → `batches` | Lote que sofreu a perda. Determina espécie, recipiente e canteiro |
| `species_id` | uuid | ○ | FK → `species` | Espécie perdida. Dispensável quando há lote |
| `container_id` | uuid | ○ | FK → `containers` | Recipiente. Dispensável quando há lote |
| `quantity` | integer | ● | | Quantidade perdida. Restrição: maior que zero e não maior que o saldo do lote (RN-78) |
| `cause` | text | ● | | Causa em **lista fechada**: `seca`, `praga`, `geada`, `manuseio`, `outro` |
| `loss_date` | date | ● | | Data da constatação |
| `reported_by` | uuid | ● | FK → `users` | Quem registrou |
| `client_id` | uuid | ○ | UK | Identificador gerado no aparelho antes do envio, mesmo padrão de `input_usages` (RNF-05). Perda duplicada infla a mortalidade, que dispara alerta a 20% |
| `notes` | text | ○ | | Observação |

> **Continuam quatro campos no formulário de campo**, e agora são lote, quantidade, causa e
> observação. A data assume o dia corrente e o autor vem da sessão.
>
> **É a resolução da nota de projeto de [`C2`, UC-17](C2-especificacao-casos-de-uso.md), e não a
> reversão dela.** Aquele caso rejeitava pedir o *local* da perda por ser o quinto campo que faria
> o colaborador deixar de registrar. Com lote, o local **vem de graça**: um campo deixou de ser
> "espécie" e "recipiente" para ser "lote", que carrega os dois **e mais o canteiro**. O
> colaborador passou a informar menos, e o sistema a saber mais.
>
> **A perda gera um movimento no lote**, em `batch_movements`, e é isso que faz a mortalidade
> passar a ser calculável **por leva**, e não só por espécie: é onde a regra dos 20% (RN-17) ganha
> poder de apontar qual plantio deu errado.
>
> A causa é lista fechada porque causa digitada à mão inviabiliza a análise por causa, que é
> justamente o que o indicador de mortalidade precisa produzir.

## `stock_counts`: contagem física de estoque

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `batch_id` | uuid | ○ | FK → `batches` | Lote contado. Determina espécie, recipiente e canteiro |
| `species_id` | uuid | ○ | FK → `species` | Espécie contada. Dispensável quando há lote |
| `container_id` | uuid | ○ | FK → `containers` | Recipiente. Dispensável quando há lote |
| `counted_quantity` | integer | ● | | Quantidade efetivamente contada. Restrição: não negativa |
| `counted_at` | date | ● | | Data da contagem |
| `counted_by` | uuid | ● | FK → `users` | Quem contou |
| `notes` | text | ○ | | Observação |

> **Não armazena o estoque**: armazena o evento de contagem. O estoque permanece derivado de
> produção menos perdas menos saídas; quando a contagem diverge do calculado, prevalece a contagem, e
> a divergência é ela própria informação: indica registro de produção ou de perda não realizado.

> **`batch_id` entrou porque se conta um canteiro, não uma espécie.** Ninguém percorre o viveiro
> somando ipês espalhados por seis canteiros: conta-se canteiro por canteiro, que é a leva. A
> divergência entre o contado e o saldo do lote gera um movimento `ajuste_contagem` em
> `batch_movements`, e é assim que a contagem prevalece sem que exista um segundo lugar guardando
> estoque.

---

## `week_plans`: semana de trabalho

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

A célula da grade: um dia, um turno, um tipo de tarefa e o grupo escalado. É daqui que saem as
horas dos dias sem apontamento (RF-100), e a duração do turno vem de `work_shifts` (RN-48, RN-85).

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `week_plan_id` | uuid | ● | FK → `week_plans` | Semana a que pertence |
| `work_date` | date | ● | | Dia da tarefa |
| `shift_id` | uuid | ● | FK → `work_shifts` | Turno. Nunca hora marcada no planejamento (RN-48) |
| `task_type_id` | uuid | ● | FK → `task_types` | Tipo de tarefa |
| `species_id` | uuid | ○ | FK → `species` | Espécie, quando o tipo de tarefa a exigir |
| `container_id` | uuid | ○ | FK → `containers` | Recipiente, quando o tipo de tarefa o exigir |
| `batch_id` | uuid | ○ | FK → `batches` | Lote, quando o tipo de tarefa o exigir (RN-82) |
| `planned_quantity` | integer | ○ | | Quantidade planejada, quando aplicável |
| `is_recurring` | boolean | ● | | Tarefa fixa: renasce em toda semana nova (RF-72) |
| `status` | text | ● | | `planejada`, `confirmada`, `nao_confirmada`: a última é a que o fechamento assume como realizada (RN-51) |
| `notes` | text | ○ | | Observação livre; único campo aberto da agenda |

> **`party_id` saiu para `assignment_members`.** Quem executa deixou de ser coluna e virou lista:
> uma tarefa admite vários executores (RN-84). Ver a entidade para o porquê.

> **`shift` deixou de ser texto e virou chave estrangeira.** O par `manha`/`tarde` continua sendo o
> vocabulário, mas a hora de início e de fim mora agora em `work_shifts`, e é dela que sai a
> duração. O valor de quatro horas saiu do enunciado da RN-48 e virou parâmetro (RN-85).

> **`work_date` mais `shift_id` continuam sendo a unidade de planejamento**, e não `started_at`.
> Hora marcada é do apontamento, que é execução; a agenda planeja por turno porque é assim que o
> viveiro pensa a semana, e pedir horário exato no planejamento garantiria agenda não preenchida.

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

Um registro por mês: folha dividida por horas (RN-53). Guarda o custo da hora **da equipe**, nunca
o salário individual.

| Atributo | Tipo | Ob. | Chave | Descrição |
|---|---|:--:|:--:|---|
| `id` | uuid | ● | PK | Identificador |
| `reference_month` | date | ● | UK | Mês de referência, no primeiro dia do mês. Um registro por mês |
| `total_payroll` | numeric(12,2) | ● | | Total da folha do mês, vindo do financeiro. Restrição: maior que zero |
| `total_hours` | numeric(10,2) | ● | | Horas apuradas na agenda do mês. Restrição: maior que zero |
| `rate_per_hour` | numeric(12,4) | ● | | **Derivado e mantido pelo banco**: `total_payroll / total_hours` |

> **O mês é uma data, e não o par ano e mês.** Um `date` no primeiro dia do mês ordena, compara e
> entra em intervalo sem conversão, e a chave única sobre ele já impede o segundo registro do mesmo
> mês, que duas colunas independentes só impediriam com restrição composta.

> **`rate_per_hour` é coluna gerada**, calculada pelo banco a cada gravação. Não é a exceção que
> `batches.current_quantity` declara: aqui o valor não é mantido pela aplicação, é derivado na
> própria linha e não tem como divergir das duas que o produzem.

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
| `code` | text | ● | UK | Código, derivado do nome. **Imutável**: é por ele que a carga inicial e as regras de classificação apontam |
| `name` | text | ● | | Designação |
| `nature` | text | ● | | `negocio` ou `pessoal`. Escolhida na criação, **imutável** depois de existir lançamento no centro (RN-73) |
| `active` | boolean | ● | | Oferecido em novos lançamentos |
| `created_at` | timestamptz | ● | | Momento do cadastro |
| `created_by` | uuid | ○ | FK → `users` | Autor do cadastro (RN-46). Nulo nos cinco da carga inicial |
| `deactivated_at` | timestamptz | ○ | | Quando saiu das escolhas de lançamento novo |

> **É o centro de custo que separa negócio de pessoal.** Não há campo de natureza no lançamento.
> a natureza deriva do centro. Foi a natureza digitada linha a linha que produziu, na planilha
> anterior, classificação errada nos dois sentidos.

> **É cadastro, não carga inicial fechada.** A tabela nasce com cinco centros (viveiro, sítio,
> clínica, casa, floricultura) e é mantida pela chefia em `/cadastros/centros-de-custo` (RF-77 a
> RF-79). **Exclusão não existe**: o centro extinto é inativado, porque o lançamento já classificado
> guarda o seu centro para sempre (RN-72). `active = false` significa uma coisa só: fora das escolhas
> de lançamento novo, presente em todo o resto, inclusive na reclassificação de lançamento antigo.

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
| *(transversal)* Acesso | 5 | inclui `settings`, os parâmetros do sistema |
| 1 · Cadastros | 16 | inclui `task_types`, o endereço do viveiro (`areas`, `beds`), `work_shifts` e o esquema `cadastro` (`parties`, `party_roles`, `addresses`) |
| 2 · Produção | 12 | lote, movimento, agenda, apontamento, consumo, coleta, perda, contagem |
| 3 · Comercial | 8 | pedido, item, carga, cotação |
| 4 · Financeiro | 14 | nove entidades no esquema `financeiro`, mais custeio e preço em `public` |
| **Total** | **55** | mais `species_unit_cost` e `input_stock_balance`, que são visões e não tabelas |



