# Rotina de Clientes — Visão Geral

## Contexto de Negócio

O Viveiro Mudar sempre vendeu via WhatsApp sem cadastro estruturado de clientes.
Quando a rotina de Pedidos foi digitalizada, o cliente passou a ser criado **inline**
no formulário de pedido: a chefia digita o nome, e o `createCustomer()` grava um
registro mínimo em `customers` (`name`, `phone`, `city`, `state`, `notes`, `active`).

Esse cadastro rápido é proposital e deve ser preservado — Gilberto não pode perder
tempo preenchendo formulário fiscal toda vez que recebe um pedido pelo WhatsApp.

O que muda: o sistema vai **emitir Nota Fiscal** no futuro. NF exige dados fiscais
completos do destinatário (tipo de pessoa, documento, endereço, e-mail). Esta rotina
estrutura esses dados **sem** quebrar o fluxo simples, cobrando completude **apenas**
quando o pedido realmente precisar de NF.

## Perfis e Acesso

| Perfil | Acesso à área `/clientes` | Papel |
|--------|---------------------------|-------|
| Admin | Sim | Tudo |
| Chefia | Sim | Cadastra/edita clientes, decide NF no fechamento |
| Gerência | Sim | Cadastra/edita clientes (apoio) |
| Colaborador | Não | — |

A área `/clientes` é **top-level** (rota própria, fora de Administração), com card
próprio na home — mesmo gate de visibilidade da seção Pedidos (`admin`/`chefia`/`gerência`).

## Dois níveis de cadastro

### Cadastro simples (o que existe hoje)
- Apenas `name` (telefone opcional). É o estado de:
  - todo cliente legado (criado antes desta rotina);
  - todo cliente criado inline no pedido sem NF.
- Campos fiscais ficam `NULL`. **Continua válido e suficiente para pedidos sem NF.**

### Cadastro completo (fiscalmente)
- Tem todos os campos exigidos para emitir NF (ver "Gate fiscal" abaixo).
- Pode ser preenchido a qualquer momento na área `/clientes`, ou no momento do
  fechamento de um pedido que precise de NF (complementação inline).

## Pessoa Física (PF) × Pessoa Jurídica (PJ)

O tipo de pessoa (`person_type`) define os campos obrigatórios para NF:

| | PF | PJ |
|---|----|----|
| Documento | CPF (11 dígitos) | CNPJ (14 dígitos) |
| Nome | nome completo (`name`) | razão social (`legal_name`) + nome fantasia (`trade_name`) |
| Inscrição Estadual | — | IE **ou** marcação "isento de IE" |
| Endereço + e-mail | obrigatórios | obrigatórios |

`person_type = NULL` significa cadastro legado/simples (ainda não classificado).

## Gate fiscal — regra de completude

Regra adotada: **mínimo legal brasileiro + e-mail obrigatório**. Um cliente é
"fiscalmente completo" (`isFiscallyComplete`) quando:

- **Comum (PF e PJ)**: e-mail válido + endereço completo (CEP, logradouro, número,
  bairro, cidade, UF válida).
- **PF**: `person_type='pf'`, `name` preenchido, `document` = CPF válido.
- **PJ**: `person_type='pj'`, `legal_name` preenchido, `document` = CNPJ válido,
  `state_registration` informado **ou** `ie_exempt = true`.

> A completude **não** é constraint do banco — o banco continua permissivo para não
> quebrar o cadastro simples. O gate é cobrado na aplicação, somente quando há NF.

## Fluxo completo

```
[A. CADASTRO RÁPIDO]   Chefia digita nome no pedido (como hoje)
       │               createCustomer() grava cliente mínimo
       ▼
[B. COMPLEMENTAÇÃO]    (opcional, a qualquer momento)
       │               Área /clientes: alterna PF/PJ, preenche documento,
       │               endereço e e-mail. Salva mesmo incompleto (rascunho).
       ▼
[C. FECHAMENTO]        Chefia aprova o pedido e responde "Precisa de NF?"
       │
       ├─ Não  ──►  needs_invoice=false. Aprova como hoje. NENHUMA checagem fiscal.
       │
       └─ Sim  ──►  needs_invoice=true. Servidor revalida isFiscallyComplete:
                      • completo   ──► aprova
                      • incompleto ──► abre painel inline de complementação
                                       (mesmo formulário fiscal) → salva → aprova
```

## Estados de completude (não são status no banco, são derivados)

| Estado | Como é detectado | Onde aparece |
|--------|------------------|--------------|
| Simples / legado | `person_type IS NULL` | badge cinza "simples" na lista |
| Incompleto | `person_type` definido mas `isFiscallyComplete = false` | selo "fiscal incompleto" |
| Completo | `isFiscallyComplete = true` | selo verde "fiscal completo" |

## Arquivos de Implementação (ordem de execução)

1. `01-banco-de-dados.md` — Migração aditiva: campos fiscais em `customers` + `orders.needs_invoice`.
2. `02-validacoes.md` — Lib pura `src/lib/customers.ts` (validadores + completude) e testes.
3. `03-area-clientes.md` — Área `/clientes`: server actions, CRUD, formulário fiscal, card na home.
4. `04-integracao-pedidos-nf.md` — Flag `needs_invoice`, pergunta de NF no fechamento, complementação inline.
5. `05-testes.md` — Testes automatizados + roteiro manual.
6. `06-futuro-emissao-nf-api.md` — Fora de escopo: o que fica pronto e o que falta para emitir NF de verdade.

## Decisões técnicas (resumo)

- **Migração aditiva e retrocompatível**: todos os campos fiscais `NULL`-able; nenhum
  cliente existente quebra. Documento com índice **único parcial** (`WHERE document IS NOT NULL`).
- **`src/lib/customers.ts` espelha `src/lib/orders.ts`**: helpers puros, sem `'use server'`,
  importáveis por Server Actions e Client Components, testáveis isoladamente.
- **Casa canônica das actions de cliente** passa a ser `src/app/clientes/actions.ts`.
  `getCustomers/searchCustomers/createCustomer` saem de `pedidos/actions.ts` e são
  importadas de lá (sem duplicação). O `createCustomer` simples continua funcionando
  porque os campos fiscais são nullable.
- **Soft-delete via `active`**, espelhando `toggleUsuarioAtivo` (`src/app/admin/usuarios/actions.ts`).
- **Atrito zero no fluxo sem NF**: pedido sem NF jamais dispara checagem fiscal.

## Integrações futuras

- **Emissão de NF via API** (`06-futuro-emissao-nf-api.md`): provedor (Focus NF-e,
  NFe.io, PlugNotas, eNotas) ou SEFAZ direto, dados do emitente, dados fiscais do
  produto, persistência de chave/XML/DANFE.
- **Autofill de endereço por CEP** (ViaCEP) na área `/clientes` — melhoria de UX.
- **Busca por telefone/razão social** com `pg_trgm` — melhoria de performance.
