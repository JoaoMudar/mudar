# Fase 2: Validações — `src/lib/customers.ts`

## Objetivo
Criar a lib pura do domínio de Clientes, espelhando `src/lib/orders.ts`: tipos,
constantes e helpers de validação (CPF, CNPJ, CEP, UF, e-mail) e a lógica de
completude fiscal (`isFiscallyComplete`, `getMissingFiscalFields`). Sem acesso a banco,
sem `'use server'` — importável por Server Actions e Client Components, e 100% testável.

## Pré-requisitos
- Padrão de referência: `src/lib/orders.ts` (helpers puros + tipos + `validate*`).
- Campos fiscais já definidos na Fase 1 (mesmo que a migração ainda não tenha rodado —
  a lib é pura e independe do banco).
- Vitest configurado (testes em `__tests__/` ao lado do código).

## Tarefas

### T2.1 — Tipos e constantes
- [ ] Criar `src/lib/customers.ts` (sem `'use server'`, igual a `orders.ts`)
- [ ] `export type PersonType = 'pf' | 'pj'`
- [ ] Interface `FiscalCustomer` com os campos da Fase 1 (`person_type`, `document`,
  `email`, `legal_name`, `trade_name`, `state_registration`, `ie_exempt`, `zip_code`,
  `street`, `address_number`, `complement`, `neighborhood`, `city`, `state`, `name`).
- [ ] `export const UFS: string[]` — as 27 UFs brasileiras.

### T2.2 — Helpers de formato (puros)
- [ ] `onlyDigits(s: string): string` — remove tudo que não é dígito.
- [ ] `isValidCPF(doc: string): boolean` — 11 dígitos + dígitos verificadores; rejeita repetidos (`111...`).
- [ ] `isValidCNPJ(doc: string): boolean` — 14 dígitos + dígitos verificadores; rejeita repetidos.
- [ ] `isValidEmail(email: string): boolean` — regex simples e segura.
- [ ] `isValidCEP(cep: string): boolean` — 8 dígitos.
- [ ] `isValidUF(uf: string): boolean` — pertence a `UFS`.
- [ ] (Opcional) formatadores de exibição: `formatCPF`, `formatCNPJ`, `formatCEP`.

### T2.3 — Completude fiscal + testes
- [ ] `getMissingFiscalFields(c: FiscalCustomer): string[]` — devolve a lista de campos
  faltantes/ inválidos em **rótulos legíveis** (ex.: `['CPF inválido', 'E-mail', 'CEP']`),
  para a UI e a mensagem de bloqueio no fechamento.
- [ ] `isFiscallyComplete(c: FiscalCustomer): boolean` — `getMissingFiscalFields(c).length === 0`.
- [ ] Regra (mínimo legal + e-mail):
  - **Comum**: e-mail válido + endereço completo (`zip_code` válido, `street`,
    `address_number`, `neighborhood`, `city`, `state` UF válida).
  - **PF**: `person_type='pf'`, `name`, `document` = CPF válido.
  - **PJ**: `person_type='pj'`, `legal_name`, `document` = CNPJ válido,
    `state_registration` **ou** `ie_exempt === true`.
- [ ] (Opcional) `validateSimpleCustomer({name})` e `validateFiscalCustomer(c)` para
  centralizar mensagens de erro, no estilo de `validateOrderItems`.
- [ ] Testes em `src/lib/__tests__/customers.test.ts` cobrindo: CPF/CNPJ válidos e
  inválidos, e-mail, CEP, UF, PF completo, PJ completo (com IE e com isento), e os
  vários caminhos de incompletude.

## Forma esperada (espelhando `orders.ts`)

```ts
// src/lib/customers.ts — helpers PUROS, sem 'use server'
export type PersonType = 'pf' | 'pj'

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export interface FiscalCustomer {
  name: string
  person_type: PersonType | null
  document: string | null
  email: string | null
  legal_name: string | null
  state_registration: string | null
  ie_exempt: boolean | null
  zip_code: string | null
  street: string | null
  address_number: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  // ...trade_name, complement
}

export function onlyDigits(s: string): string { /* ... */ return s }
export function isValidCPF(doc: string): boolean { /* dígitos verificadores */ return false }
export function isValidCNPJ(doc: string): boolean { /* dígitos verificadores */ return false }

export function getMissingFiscalFields(c: FiscalCustomer): string[] {
  const missing: string[] = []
  // comum: email + endereço + UF; PF: CPF; PJ: CNPJ + razão social + (IE ou isento)
  return missing
}
export function isFiscallyComplete(c: FiscalCustomer): boolean {
  return getMissingFiscalFields(c).length === 0
}
```

## Notas Técnicas
- **Por que lib pura**: o gate de completude precisa rodar **no client** (feedback do
  formulário em tempo real) e **no servidor** (defesa em profundidade no `approveOrder`).
  Manter fora de `'use server'` permite os dois usos — exatamente como `orders.ts`.
- **`getMissingFiscalFields` é a fonte única da verdade**: a UI usa para destacar campos
  e o servidor usa para montar a mensagem de bloqueio ("Faltam: CPF, e-mail, CEP").
- **Dígitos verificadores reais** de CPF/CNPJ (não só contar dígitos) — é o ponto mais
  testado da fase.
- **Normalização**: validar sempre sobre `onlyDigits(...)`; a máscara é só visual.
- **Não** acessar `pool` nem `next/*` aqui. Qualquer coisa que toque o banco vai para
  `src/app/clientes/actions.ts` (Fase 3).
