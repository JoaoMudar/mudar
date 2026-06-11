# Prompt-mestre — Rede de Fornecedores de Mudas Nativas ("MudaMatch")

> Cole este documento inteiro num agente de código (Claude Code, Cursor, etc.) como briefing do projeto. Ele descreve o domínio, o modelo de dados, as features e como integrar tudo na stack existente. Implemente em fases, na ordem indicada, e abra um PR por fase.

---

## 0. Contexto do negócio (leia antes de codar)

Sou viveirista. Produzo árvores nativas, mas o clima limita as espécies que consigo cultivar na minha região. Recebo pedidos de clientes de outras regiões (litoral, outros estados, outro país) por espécies que **não** produzo. Hoje, quando isso acontece, eu: (a) dispenso o cliente, (b) procuro manualmente quem vende e repasso o contato, ou (c) compro de outro produtor e revendo. Esse processo é lento e desorganizado — não tenho fornecedores nem espécies mapeados, então quando finalmente acho quem tem a muda, o cliente já comprou em outro lugar.

**Objetivo do sistema:** transformar essa rede informal num banco de dados consultável + ferramenta de orçamento. Quando chegar um pedido, eu quero, em minutos: encontrar quem tem a espécie, ver quem está mais perto/mais barato, gerar um orçamento já com a minha margem, e confirmar com o cliente. É uma plataforma de **intermediação/revenda** de mudas nativas.

**Princípio de captação de dados (importante):** a coleta das listas de espécies dos fornecedores deve ser feita de forma **transparente e honesta** — me apresentando como viveirista montando uma rede de revenda/parceria que traz negócio para eles. **Não** implemente nenhuma estratégia enganosa (fingir ser estudante, fingir ser comprador, etc.). Além de antiético, queima reputação num setor pequeno. O enquadramento honesto converte melhor porque oferece valor recorrente ao fornecedor.

---

## 1. Stack-alvo (integrar, não recriar)

- **Next.js 16 + React 19 + TypeScript + Tailwind**
- **PostgreSQL** via driver `pg` (local) / **Neon serverless** (produção)
- **SQL puro em Server Actions** — sem ORM. Mantenha esse padrão: queries parametrizadas (`$1, $2…`), nunca string interpolation.
- **Vitest** para testes.

Requisitos de integração:
- Centralize o acesso ao banco num módulo único (ex.: `lib/db.ts`) que exponha um `query()` compatível tanto com `pg` local quanto com Neon serverless. Detecte o ambiente por env var.
- Toda mutação de dados via **Server Actions** (`'use server'`), com validação de input (Zod) na fronteira.
- Migrations versionadas em `/db/migrations` (arquivos `.sql` numerados). Inclua um script `npm run migrate`.
- Cada fase deve vir com testes Vitest (unit nas funções de cálculo, integração nas Server Actions com banco de teste).
- UI em Tailwind, componentes server-first; client components só onde houver interatividade (mapa, formulários).

---

## 2. Modelo de dados (Postgres)

Crie as migrations para o seguinte esquema. Use `uuid` como PK (`gen_random_uuid()`), `created_at`/`updated_at timestamptz`, e índices nas colunas de busca.

- **`suppliers`** — fornecedores/produtores: `id`, `name`, `legal_name`, `phone`, `whatsapp`, `email`, `instagram`, `website`, `address`, `city`, `state`, `country`, `latitude`, `longitude`, `notes`, `reliability_score` (0–5, editável), `last_contacted_at`, `status` (enum: `lead`, `active`, `inactive`, `do_not_contact`).
- **`species`** — catálogo canônico de espécies: `id`, `scientific_name`, `common_names` (text[]), `category` (ex.: nativa, frutífera, ornamental), `notes`. Use isto para **normalizar** nomes (o "cambuí" de um fornecedor = "cambuK" de outro). Inclua uma tabela de apelidos/sinônimos se necessário.
- **`supplier_species`** — o que cada fornecedor tem: `id`, `supplier_id`, `species_id`, `size` (ex.: 30cm, 1m), `container` (saquinho, tubete…), `unit_price`, `min_quantity`, `availability` (enum: `in_stock`, `on_order`, `unknown`), `last_updated_at`, `source` (de onde veio o dado: mensagem, planilha, manual).
- **`my_species`** — o que EU produzo (subset que dispensa intermediação).
- **`clients`** — `id`, `name`, `phone`, `whatsapp`, `email`, `city`, `state`, `country`, `latitude`, `longitude`, `notes`.
- **`requests`** (pedidos do cliente): `id`, `client_id`, `status` (enum: `new`, `sourcing`, `quoted`, `confirmed`, `fulfilled`, `lost`), `created_at`, `notes`. Itens em **`request_items`**: `id`, `request_id`, `species_id`, `quantity`, `size_pref`, `notes`.
- **`quotes`** (orçamentos): `id`, `request_id`, `status` (`draft`, `sent`, `accepted`, `rejected`), `markup_pct` ou `markup_fixed`, `freight_estimate`, `total_cost`, `total_price`, `margin`, `valid_until`, `created_at`. Itens em **`quote_items`** ligando `supplier_species` escolhido → `quantity`, `unit_cost`, `unit_price`, `chosen_supplier_id`.
- **`outreach`** (campanhas de captação): `id`, `supplier_id`, `channel` (enum: `whatsapp`, `email`, `instagram`, `manual`), `template_id`, `sent_at`, `responded_at`, `status` (`queued`, `sent`, `responded`, `bounced`, `opted_out`), `raw_response` (text — a lista crua que o fornecedor mandou).

---

## 3. Funcionalidades (implementar em fases)

### Fase 1 — Fundação de dados + CRUD
Migrations, `lib/db.ts`, e telas/Server Actions de CRUD para `suppliers`, `species`, `supplier_species`, `clients`. Import de fornecedores via CSV (eu já tenho contatos espalhados). Busca e filtro por espécie, cidade, estado.

### Fase 2 — Mapa e geolocalização
- **Geocoding** de fornecedores e clientes a partir do endereço/cidade (provedor configurável via env — ex.: Nominatim/OpenStreetMap grátis, ou Google/Mapbox). Cacheie `latitude`/`longitude` no banco para não re-geocodificar.
- **Cálculo de distância** entre cliente e fornecedores. Comece com **Haversine** (rápido, sem custo) em SQL ou TS; deixe a interface preparada para trocar por distância rodoviária real (rota) depois.
- **Mapa interativo** (Leaflet/react-leaflet recomendado — grátis) mostrando fornecedores como pins, com filtro "tem a espécie X". Ao selecionar um pedido, destacar os fornecedores que atendem e ordenar por distância.
- Função `findSuppliersForSpecies(speciesId, clientLatLng)` retornando fornecedores ordenáveis por distância **e** por preço, para eu decidir o trade-off (ex.: "cambuK a 50 km um pouco mais caro vs. 200 km mais barato").

### Fase 3 — Pedidos, sourcing e orçamento
- Tela de novo pedido: seleciono cliente + espécies + quantidades. Normalização de nome de espécie (autocomplete sobre `species` + sinônimos).
- **Sourcing automático:** para cada item do pedido, listar `supplier_species` disponíveis com distância e preço. Permitir escolher o fornecedor por item (ou sugerir o melhor por uma regra configurável: menor custo total = preço da muda + frete estimado por distância).
- **Motor de orçamento:** dado o custo dos fornecedores, aplicar **margem** (percentual ou fixo, por item ou global), somar frete, e produzir `total_cost`, `total_price`, `margin`. Isto deve ser uma função pura, bem testada no Vitest (vários cenários de markup, múltiplos fornecedores, frete).
- **Geração do orçamento para o cliente** em formato limpo (HTML/PDF) com itens, prazo de validade, e um resumo que **não** expõe meus custos/fornecedores.

### Fase 4 — Captação multicanal (outreach honesto)
- **Templates** de mensagem (tabela `templates`) para WhatsApp, e-mail e Instagram, com o enquadramento honesto: "viveirista montando rede de revenda, quero comprar/revender suas mudas — me manda sua lista de espécies, tamanhos e preços". Variáveis: `{nome_fornecedor}`, `{minha_assinatura}`, etc.
- **Fila de envio** (`outreach`) com registro de quem foi contatado, quando, e status. Respeitar `last_contacted_at` para não spammar; respeitar `status = do_not_contact`/`opted_out`.
- **Parsing das respostas:** quando o fornecedor responde com uma lista (texto livre, foto de tabela, planilha), uma rotina assistida por LLM converte `raw_response` em linhas de `supplier_species` (espécie normalizada + tamanho + preço), com revisão humana antes de gravar.
- **Importante sobre WhatsApp/Instagram:** não automatize envios em massa de forma que viole os Termos de Uso dessas plataformas ou arrisque banimento da minha conta. Implemente como **"semi-automático"**: o sistema prepara a mensagem personalizada e a fila; o envio em massa em WhatsApp deve usar canal oficial (WhatsApp Business API/Cloud API) **ou** ser disparado manualmente por mim a partir dos rascunhos. E-mail pode ser automatizado (SMTP/serviço transacional) com opt-out. Deixe isso explícito na arquitetura.

### Fase 5 — Dashboard e confirmação rápida
- Visão geral: pedidos por status (kanban `new → sourcing → quoted → confirmed`), orçamentos pendentes, margem total do mês, fornecedores mais usados, cobertura de espécies no mapa.
- **Confirmação:** botão para enviar orçamento ao cliente e, na aceitação, gerar o pedido de compra para o(s) fornecedor(es) escolhido(s) com a mensagem pronta. Atualização de status em um clique.

---

## 4. Cálculos-chave (especificar e testar)

- **Distância:** Haversine entre dois `(lat, lng)`. Assinatura pura, testes com pares conhecidos.
- **Frete estimado:** função configurável `R$/km` (parametrizável por porte/quantidade), começando simples.
- **Custo total por fornecedor para um item:** `preço_unitário * qtd + frete(distância, qtd)`.
- **Preço de venda:** aplicar margem → `preço_venda = custo * (1 + markup_pct)` ou `custo + markup_fixo`. Garantir margem mínima configurável; alertar se um item ficar abaixo dela.
- **Seleção ótima de fornecedor por item:** menor custo total, com a distância e a reputação (`reliability_score`) como critérios de desempate visíveis para eu escolher manualmente.

Todas essas funções devem ser puras, isoladas em `lib/pricing.ts` / `lib/geo.ts`, e cobertas por Vitest.

---

## 5. Considerações legais e de qualidade

- **LGPD:** dados de fornecedores/clientes são pessoais. Inclua base de contato legítima, opt-out funcional em outreach, e não compartilhe dados entre terceiros sem consentimento.
- **Termos das plataformas:** ver Fase 4 — nada de automação que arrisque banimento ou viole ToS de WhatsApp/Instagram.
- **Normalização de espécies** é o calcanhar de Aquiles do projeto (nomes populares variam muito por região). Invista em sinônimos e em revisão humana no parsing.
- **Segurança:** queries parametrizadas sempre; validação Zod na entrada das Server Actions; secrets só em env vars.
- **Entregáveis por fase:** migrations + Server Actions + UI + testes Vitest + um PR descritivo.

---

## 6. O que eu quero que você faça agora

1. Confirme que entendeu o domínio e a stack.
2. Proponha a estrutura de pastas e o conteúdo de `lib/db.ts` compatível com `pg` local + Neon.
3. Gere as migrations da Fase 1 e os primeiros CRUDs com testes.
4. Pare ao fim de cada fase para revisão antes de seguir.

Faça perguntas se algo estiver ambíguo, mas assuma defaults sensatos (Leaflet/OSM para mapa, Nominatim para geocoding, Haversine para distância inicial) e siga.