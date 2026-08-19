# Rotina: Cadastros (cadastro único)

> Rotina **agrupadora**. Não tem processo próprio, reúne, num lugar só, tudo que é
> *cadastro* (o que é estável e se repete) e separa do que é *movimento* (o que acontece
> uma vez e vira histórico).
>
> Decisões desta rotina em [`plans/P13-producao-agenda-cadastros.md`](../../../plans/P13-producao-agenda-cadastros.md).

## O problema

Os cadastros nasceram espalhados, cada um junto da rotina que precisou dele primeiro:

| Cadastro | Onde está hoje | Quem criou |
|---|---|---|
| Espécies | `/admin/especies` | P1 Custeio |
| Recipientes | `/admin/recipientes` | P1 Custeio |
| Insumos | `/admin/insumos` | P1 Custeio |
| Clientes | `/clientes` | Rotina Pedidos |
| Fornecedores | `/fornecedores` | P11 Cotação |
| Funcionários | **não existe** | - |
| Tipos de tarefa | **não existe** | - |

Três consequências:

1. **Ninguém sabe onde cadastrar.** Espécie fica em `/admin`, cliente não. A divisão é
   histórica, não lógica.
2. **`/admin` virou depósito.** Mistura cadastro de domínio (espécie) com administração de
   sistema (usuários, permissões): coisas de natureza e de risco diferentes.
3. **Funcionário não tem cadastro.** É o buraco que impede a agenda de pessoal e o custo de
   mão de obra.

## A solução

Uma área `/cadastros` que agrupa as telas. **É agrupador de navegação, não migração de
banco**: as tabelas continuam onde estão. Nenhuma tela, Server Action ou teste atual quebra.

A lista de telas de cada módulo vive em `src/lib/modules.ts`, que é o que o painel inicial e
as abas leem: e o que o teste `src/lib/__tests__/modules.test.ts` confere contra as rotas
que existem de fato.

```
/cadastros
├── pessoas           ← UMA lista, filtrada por papel
│   ├── [id]          ← a ficha: identidade + histórico dos dois lados
│   ├── cliente       → /clientes       (a tela do papel, URL antiga)
│   ├── fornecedor    → /fornecedores   (a tela do papel, URL antiga)
│   └── funcionário   → sem tela ainda  (P13 T13.3 e T13.7)
├── espécies          (veio de /admin/especies)
├── recipientes       (veio de /admin/recipientes)
├── insumos           (veio de /admin/insumos)
└── tipos de tarefa   ← NOVO
```

**Pessoas é uma entrada só, não duas.** Com abas irmãs de Clientes e Fornecedores, o Márcio
Kuhar (que vende muda e às vezes compra) aparecia duas vezes, que é exatamente o problema
que `cadastro.parties` foi criada para resolver. A lista mostra a pessoa uma vez, com um selo
por papel; **o selo é o link** para a tela daquele papel.

**A ficha é a identidade; a tela do papel é o papel.** Na lista, o **nome** abre
`/cadastros/pessoas/[id]`: quem é a pessoa e o histórico dos dois lados. O **selo** abre a tela
do papel, onde se editam os campos que são dele. A ficha não edita nada.

**O que a ficha ainda não responde, e por quê.** A pergunta que motivou o cadastro único.
*quanto compramos e quanto vendemos para esta pessoa*: **não tem resposta em dinheiro hoje**:
`order_items` não tem coluna de preço e `orders` não tem total, então o pedido registra o que
saiu, não por quanto. A ficha mostra **volume** na venda (mudas e número de pedidos) e o valor
**cotado e escolhido** na compra (que é intenção, não pagamento) e diz isso na tela, porque
número inventado é pior que número ausente.

O valor vem quando `financeiro.transactions` existir (P12 Fase 2). E vem **do extrato**, não do
pedido: a transação aponta para a mesma `party_id`, com `amount` assinado, e aí a resposta é
uma soma que não se importa com papel algum. Foi por isso que unir valeu: sem `parties`, a
pergunta exigiria casar `customers` com `suppliers` por nome a cada consulta.

> ⚠️ **Antes da Fase 2 do P12, corrigir `mergeParties`**: ele apaga a party redundante
> repointando só `customers` e `suppliers`, e vai deixar transação órfã ou quebrar na FK.
> Detalhes em [`divida-tecnica.md`](../../divida-tecnica.md) §8.

**A leitura não é uniforme, e a lista respeita isso.** `cliente:ler` é de chefia, gerência e
admin; `fornecedor:ler` é só de chefia e admin (D4 §2). Os papéis são filtrados **no
servidor** (`getPeople` em `src/app/cadastros/pessoas/actions.ts`), e o filtro que vem da tela
só pode estreitar: nunca ampliar. Uma gerência que abre o Márcio Kuhar vê o selo de cliente
e não fica sabendo que ele também é fornecedor.

**Funcionário já é opção, sem ser tela.** O papel existe no CHECK de `cadastro.party_roles`
desde a migration `20260811000004`, e o recurso `funcionario` entrou na matriz de permissões.
O filtro aparece e devolve lista vazia até a **T13.3** (`users.party_id`) e a **T13.7** (CRUD)
serem feitas: vazio honesto vale mais que botão que não leva a lugar nenhum.

`/admin` fica só com o que é administração de sistema: **usuários, permissões e sessões**.

**Custos fixos e coleta de sementes não entram em Cadastros**, nenhum dos dois passa na regra
de corte abaixo. Custo fixo é valor que muda todo mês e que o extrato bancário vai passar a
alimentar (P12), então foi para `/financeiro/custos-fixos`. Coleta de sementes é atividade de
campo, então foi para `/producao/coleta-sementes`.

**Fornecedor é cadastro; cotação é movimento.** Os dois dividem a URL `/fornecedores`, mas o
cadastro da rede é um papel de Pessoas neste módulo e a cotação (`/fornecedores/cotar`, `/cotacoes`,
`/mapa`, `/dashboard`) pertence ao Comercial. O agrupamento é de navegação: as rotas ficaram
onde estavam porque `notifications.link` guarda caminho gravado no banco.

### A regra que decide o que entra

> **É cadastro se, ao apagá-lo, um movimento passado ficar sem sentido.**

Espécie, cliente, funcionário e tipo de tarefa passam no teste. Pedido, tarefa atribuída,
lançamento financeiro e registro de perda **não**, são movimento, vivem nas suas rotinas.

Por isso **"tarefas" no cadastro é o catálogo de tipos** (semeadura, repicagem, irrigação,
limpeza de canteiro), não as tarefas atribuídas a alguém. As atribuídas são movimento e
ficam na [agenda de pessoal](../2-producao/01-agenda-de-pessoal.md).

## Identidade única de pessoas

Clientes, fornecedores e funcionários são **a mesma coisa vista de ângulos diferentes**:
uma pessoa. O schema `cadastro.parties` (P12 Fase 1) já resolve isso, uma identidade,
N papéis.

```
cadastro.parties          quem é (PF/PJ, documento, contato)
cadastro.party_roles      cliente · fornecedor · funcionario · socio · familiar · banco · governo
cadastro.addresses        endereços
```

Três consequências práticas:

- **Márcio Kuhar é um cadastro só**: vende muda (fornecedor) e às vezes compra (cliente).
- **Funcionário existe sem login.** `users` passa a ser só credencial, com FK opcional para
  a party. Amélia e Jaison aparecem na agenda e no financeiro mesmo sem nunca abrir o app.
- **O financeiro tem para onde apontar.** Pagamento de diária aponta para a party do
  funcionário, não para um texto digitado.

A tela que materializa isso é `/cadastros/pessoas`, que lê `cadastro.parties` via
`listParties` (`src/lib/parties.ts`). As telas de papel continuam sendo onde se editam os
campos **do papel**: dados fiscais e CNPJ no cliente; espécies, confiabilidade e
geocodificação no fornecedor: porque é isso que a divisão
`parties` × `customers`/`suppliers` estabelece.

> **Espécies, recipientes, insumos e tipos de tarefa não são pessoas**: não entram em
> `parties`. Continuam nas suas tabelas. O que os une a clientes e fornecedores é a
> navegação, não o schema.

## Cadastro de funcionário (novo)

Campos mínimos: o formulário tem que caber numa tela de celular:

| Campo | Obrigatório | Nota |
|---|---|---|
| Nome | sim | vira `parties.name` |
| Telefone / WhatsApp | não | |
| Papel operacional | sim | chefia · gerência · colaborador |
| Vínculo | sim | fixo · diarista |
| Ativo | sim | soft-delete; inativo some da agenda mas o histórico fica |
| Documento, endereço | não | preenchidos quando o financeiro precisar |

**Não há valor/hora individual.** O custo de mão de obra usa um valor-hora **médio da
equipe**: decisão registrada na [agenda de pessoal](../2-producao/01-agenda-de-pessoal.md)
e que preserva a resolução de conflito do documento de requisitos (B2 §4).

## Cadastro de tipos de tarefa (novo)

O que faz a agenda ser rápida de preencher: sem digitação livre, só escolha da lista.

| Campo | Nota |
|---|---|
| Nome | "Semeadura", "Repicagem", "Irrigação", "Limpeza de canteiro", "Carregamento" |
| Categoria | produção · manutenção · pedido · outro |
| Exige espécie? | semeadura sim; limpeza de canteiro não |
| Exige recipiente? | repicagem sim; irrigação não |
| Unidade de medida | mudas · bandejas · m² · horas: o que se conta ao concluir |
| Tempo médio por unidade | alimenta o custeio (P1) e a estimativa da agenda |
| Ativo | soft-delete |

Este cadastro é o que liga a agenda ao custo: `tempo médio × quantidade × valor-hora médio`.

## Telas por perfil

| Etapa | Perfil |
|---|---|
| Cadastrar/editar espécie, recipiente, insumo | Gerência |
| Cadastrar/editar cliente | Chefia / Gerência |
| Cadastrar/editar fornecedor | Chefia |
| Cadastrar/editar funcionário | Chefia |
| Cadastrar/editar tipo de tarefa | Gerência |
| Consultar qualquer cadastro | Chefia / Gerência |

Colaborador **não acessa** `/cadastros`: só consome as listas dentro dos formulários dele.

## Relação com as outras rotinas

Cadastros não consome nada: é a base de todas as outras.

| Consome | Para quê |
|---|---|
| Produção | espécie, recipiente, funcionário, tipo de tarefa |
| Pedidos | cliente, espécie, recipiente |
| Estoque / Perdas | espécie, recipiente, funcionário |
| Financeiro | party (funcionário, fornecedor, cliente, banco) |
| Custeio / Precificação | espécie, recipiente, insumo, tempo médio do tipo de tarefa |
