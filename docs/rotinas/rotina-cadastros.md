# Rotina: Cadastros (cadastro único)

> Rotina **agrupadora**. Não tem processo próprio — reúne, num lugar só, tudo que é
> *cadastro* (o que é estável e se repete) e separa do que é *movimento* (o que acontece
> uma vez e vira histórico).
>
> Decisões desta rotina em [`plans/P13-producao-agenda-cadastros.md`](../../plans/P13-producao-agenda-cadastros.md).

## O problema

Os cadastros nasceram espalhados, cada um junto da rotina que precisou dele primeiro:

| Cadastro | Onde está hoje | Quem criou |
|---|---|---|
| Espécies | `/admin/especies` | P1 Custeio |
| Recipientes | `/admin/recipientes` | P1 Custeio |
| Insumos | `/admin/insumos` | P1 Custeio |
| Clientes | `/clientes` | Rotina Pedidos |
| Fornecedores | `/fornecedores` | P11 Cotação |
| Funcionários | **não existe** | — |
| Tipos de tarefa | **não existe** | — |

Três consequências:

1. **Ninguém sabe onde cadastrar.** Espécie fica em `/admin`, cliente não. A divisão é
   histórica, não lógica.
2. **`/admin` virou depósito.** Mistura cadastro de domínio (espécie) com administração de
   sistema (usuários, permissões) — coisas de natureza e de risco diferentes.
3. **Funcionário não tem cadastro.** É o buraco que impede a agenda de pessoal e o custo de
   mão de obra.

## A solução

Uma área `/cadastros` que agrupa as telas. **É agrupador de navegação, não migração de
banco** — as tabelas continuam onde estão. Nenhuma tela, Server Action ou teste atual quebra.

```
/cadastros
├── espécies          (existe — move de /admin/especies)
├── recipientes       (existe — move de /admin/recipientes)
├── insumos           (existe — move de /admin/insumos)
├── clientes          (existe — /clientes continua funcionando)
├── fornecedores      (existe — /fornecedores continua funcionando)
├── funcionários      ← NOVO
└── tipos de tarefa   ← NOVO
```

`/admin` fica só com o que é administração de sistema: usuários, sessões, custos fixos,
coleta de sementes.

### A regra que decide o que entra

> **É cadastro se, ao apagá-lo, um movimento passado ficar sem sentido.**

Espécie, cliente, funcionário e tipo de tarefa passam no teste. Pedido, tarefa atribuída,
lançamento financeiro e registro de perda **não** — são movimento, vivem nas suas rotinas.

Por isso **"tarefas" no cadastro é o catálogo de tipos** (semeadura, repicagem, irrigação,
limpeza de canteiro), não as tarefas atribuídas a alguém. As atribuídas são movimento e
ficam na [agenda de pessoal](rotina-producao/01-agenda-de-pessoal.md).

## Identidade única de pessoas

Clientes, fornecedores e funcionários são **a mesma coisa vista de ângulos diferentes**:
uma pessoa. O schema `cadastro.parties` (P12 Fase 1) já resolve isso — uma identidade,
N papéis.

```
cadastro.parties          quem é (PF/PJ, documento, contato)
cadastro.party_roles      cliente · fornecedor · funcionario · socio · familiar · banco · governo
cadastro.addresses        endereços
```

Três consequências práticas:

- **Márcio Kuhar é um cadastro só** — vende muda (fornecedor) e às vezes compra (cliente).
- **Funcionário existe sem login.** `users` passa a ser só credencial, com FK opcional para
  a party. Amélia e Jaison aparecem na agenda e no financeiro mesmo sem nunca abrir o app.
- **O financeiro tem para onde apontar.** Pagamento de diária aponta para a party do
  funcionário, não para um texto digitado.

> **Espécies, recipientes, insumos e tipos de tarefa não são pessoas** — não entram em
> `parties`. Continuam nas suas tabelas. O que os une a clientes e fornecedores é a
> navegação, não o schema.

## Cadastro de funcionário (novo)

Campos mínimos — o formulário tem que caber numa tela de celular:

| Campo | Obrigatório | Nota |
|---|---|---|
| Nome | sim | vira `parties.name` |
| Telefone / WhatsApp | não | |
| Papel operacional | sim | chefia · gerência · colaborador |
| Vínculo | sim | fixo · diarista |
| Ativo | sim | soft-delete; inativo some da agenda mas o histórico fica |
| Documento, endereço | não | preenchidos quando o financeiro precisar |

**Não há valor/hora individual.** O custo de mão de obra usa um valor-hora **médio da
equipe** — decisão registrada na [agenda de pessoal](rotina-producao/01-agenda-de-pessoal.md)
e que preserva a resolução de conflito do documento de requisitos (B2 §4).

## Cadastro de tipos de tarefa (novo)

O que faz a agenda ser rápida de preencher: sem digitação livre, só escolha da lista.

| Campo | Nota |
|---|---|
| Nome | "Semeadura", "Repicagem", "Irrigação", "Limpeza de canteiro", "Carregamento" |
| Categoria | produção · manutenção · pedido · outro |
| Exige espécie? | semeadura sim; limpeza de canteiro não |
| Exige recipiente? | repicagem sim; irrigação não |
| Unidade de medida | mudas · bandejas · m² · horas — o que se conta ao concluir |
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

Colaborador **não acessa** `/cadastros` — só consome as listas dentro dos formulários dele.

## Relação com as outras rotinas

Cadastros não consome nada: é a base de todas as outras.

| Consome | Para quê |
|---|---|
| Produção | espécie, recipiente, funcionário, tipo de tarefa |
| Pedidos | cliente, espécie, recipiente |
| Estoque / Perdas | espécie, recipiente, funcionário |
| Financeiro | party (funcionário, fornecedor, cliente, banco) |
| Custeio / Precificação | espécie, recipiente, insumo, tempo médio do tipo de tarefa |
