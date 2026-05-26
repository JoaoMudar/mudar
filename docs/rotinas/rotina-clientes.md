# Rotina: Clientes

## Situação atual
O cliente nasce **inline no cadastro de pedido**: no `OrderForm` a chefia digita o
nome (e opcionalmente o telefone) e o `createCustomer()` grava um registro mínimo.
A tabela `customers` hoje tem apenas `name`, `phone`, `city`, `state`, `notes`, `active`.
Isso basta para vender via WhatsApp **sem nota fiscal**, mas não guarda os dados que
uma futura emissão de NF exige (PF/PJ, CPF/CNPJ, endereço fiscal, e-mail).

## Para onde vamos
Uma rotina completa de clientes que **não atrapalha** o fluxo rápido de hoje e ainda
prepara o terreno para a NF:

1. **Cadastro rápido** continua igual — nome + telefone direto no pedido.
2. **Área dedicada `/clientes`** com CRUD e campos fiscais (PF/PJ, documento, endereço, e-mail).
3. **Dados completos só são exigidos quando o pedido precisa de NF** — validados no fechamento.

```
[Cadastro rápido]  Chefia digita nome no pedido  ──►  cliente mínimo (como hoje)
        │
        ▼
[Área /clientes]   Complementa dados fiscais quando quiser (admin/chefia/gerência)
        │
        ▼
[Fechamento c/ NF] "Precisa de Nota Fiscal?" ──► Sim ──► valida completude fiscal
                                              └─► Não ──► aprova como hoje (atrito zero)
```

## Conceitos importantes

### Cadastro simples × cadastro completo
- **Simples**: só `name` (+ telefone). É o estado de todo cliente legado e de quem
  compra sem NF. Os campos fiscais ficam `NULL`.
- **Completo (fiscalmente)**: tem todos os dados exigidos para emitir NF. A completude
  **não é uma trava do banco** — é uma regra de aplicação, cobrada só quando há NF.

### Pessoa Física (PF) × Pessoa Jurídica (PJ)
Define quais campos são obrigatórios para a NF: PF exige CPF; PJ exige CNPJ, razão
social e inscrição estadual (ou marcação de isento).

### Gate fiscal
Função `isFiscallyComplete(customer)` que diz se o cliente já pode receber NF.
Regra adotada: **mínimo legal brasileiro + e-mail obrigatório** (para enviar DANFE/XML).

## Planos de Implementação

| # | Arquivo | Fase | Tarefas |
|---|---------|------|---------|
| 0 | `rotina-clientes/00-visao-geral.md` | Visão geral, conceitos, fluxo sem NF × com NF, decisões | — |
| 1 | `rotina-clientes/01-banco-de-dados.md` | Migração aditiva: campos fiscais em `customers` + `orders.needs_invoice` | 3 tarefas |
| 2 | `rotina-clientes/02-validacoes.md` | Lib pura `src/lib/customers.ts` (CPF/CNPJ/CEP/UF/e-mail + completude) | 3 tarefas |
| 3 | `rotina-clientes/03-area-clientes.md` | Área `/clientes`: actions + CRUD + formulário fiscal | 5 tarefas |
| 4 | `rotina-clientes/04-integracao-pedidos-nf.md` | Flag `needs_invoice` + pergunta de NF no fechamento + complementação inline | 4 tarefas |
| 5 | `rotina-clientes/05-testes.md` | Testes automatizados (vitest) + roteiro manual | 4 tarefas |
| 6 | `rotina-clientes/06-futuro-emissao-nf-api.md` | Fora de escopo: o que fica pronto e o que falta para emitir NF via API | — |

**Total: 19 tarefas**

## Telas por perfil

### Chefia / Gerência / Admin (área `/clientes`)
- **Lista de clientes**: busca por nome/telefone/documento, badge PF/PJ, selo "fiscal completo/incompleto".
- **Novo / editar cliente**: formulário com alternância PF/PJ e campos condicionais.
- **Detalhe do cliente**: dados de contato + dados fiscais + histórico de pedidos (futuro).
- **Inativar**: soft-delete via `active` (espelha o padrão de Usuários).

### Chefia (fechamento de pedido)
- **Pergunta "Precisa de Nota Fiscal?"** ao aprovar.
- **Complementação inline** dos dados fiscais quando o cliente está incompleto, sem sair do pedido.

## Dependências com outras rotinas
- **Pedidos** (`rotina-pedidos.md`): o fechamento passa a perguntar sobre NF e a
  validar a completude do cliente — ver `rotina-clientes/04-integracao-pedidos-nf.md`.
- **Financeiro** (`rotina-financeiro.md`): a etapa "Emissão de nota fiscal" (Chefia)
  é o destino natural dos dados estruturados aqui — ver `rotina-clientes/06-futuro-emissao-nf-api.md`.
