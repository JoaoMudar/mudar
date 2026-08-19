# Fase 5: Testes

## Objetivo
Cobrir a rotina de clientes com testes automatizados (vitest) nos pontos de lógica e
validação, e um roteiro manual ponta-a-ponta. Conforme o CLAUDE.md, toda alteração de
código inclui testes; Server Actions que dependem do banco mockam os imports com `vi.mock`.

## Pré-requisitos
- Fases 2–4 implementadas.
- Padrão de mock de referência: `src/app/pedidos/__tests__/actions.test.ts`
  (mock de `@/lib/db` e `@/lib/auth`).
- Vitest configurado; testes em `__tests__/` ao lado do código.

## Tarefas

### T5.1: Testes da lib pura (`customers.test.ts`)
- [x] `src/lib/__tests__/customers.test.ts`
- [x] `isValidCPF` / `isValidCNPJ`: válidos conhecidos, inválidos, dígitos repetidos,
  tamanho errado, com/sem máscara (via `onlyDigits`).
- [x] `isValidEmail`, `isValidCEP`, `isValidUF`: casos felizes e de borda.
- [x] `getMissingFiscalFields` / `isFiscallyComplete`:
  - PF completo → vazio/`true`.
  - PJ completo com IE → `true`; PJ completo com `ie_exempt` → `true`.
  - PJ sem IE e sem isenção → falta IE.
  - faltando e-mail / CEP / UF inválida → aparece na lista.
  - cliente simples (`person_type=NULL`) → incompleto (lista não vazia).

### T5.2: Testes das actions de `/clientes`
- [x] `src/app/clientes/__tests__/actions.test.ts` (mock `@/lib/db` e `@/lib/auth`).
- [x] cria cliente **simples** (só nome) → ok.
- [x] cria **PF completo** → ok.
- [x] cria **PJ completo** → ok.
- [x] `updateCustomer` altera campos → ok.
- [x] documento duplicado (violação do índice único) → retorna erro amigável.
- [x] `toggleCustomerActive(id,false)` → cliente sai da listagem ativa.

### T5.3: Estender testes de `approveOrder`
- [x] Em `src/app/pedidos/__tests__/actions.test.ts`:
  - aprovar **sem NF** (`needsInvoice=false`) → aprova, **nenhuma** checagem fiscal.
  - aprovar **com NF** + cliente completo → aprova e grava `needs_invoice=true`.
  - aprovar **com NF** + cliente incompleto → bloqueia e lista campos faltantes; status
    permanece `verificado`.

### T5.4: Roteiro manual (ponta-a-ponta)
Executar no app (de preferência sobre o Postgres espelho, `npm run db:refresh-local`,
ver `docs/banco-local-espelho.md`):

- [ ] **1.** Cadastro rápido no pedido (nome + telefone) ainda funciona como antes.
- [ ] **2.** Cliente legado (sem campos fiscais) aparece com selo "simples" em `/clientes`.
- [ ] **3.** Criar cliente PF completo em `/clientes` → selo "completo".
- [ ] **4.** Criar cliente PJ com "isento de IE" → selo "completo".
- [ ] **5.** Salvar cliente incompleto (rascunho) → selo "incompleto", sem erro.
- [ ] **6.** Tentar cadastrar documento já existente → erro de duplicidade.
- [ ] **7.** Aprovar pedido respondendo **Não** à NF → aprova sem pedir nada.
- [ ] **8.** Aprovar pedido com **Sim** + cliente completo → aprova; badge "NF" aparece.
- [ ] **9.** Aprovar pedido com **Sim** + cliente incompleto → abre complementação inline,
  preencher, salvar e aprovar sem sair do pedido.

## Notas Técnicas
- O grosso da lógica testável está na **lib pura** (Fase 2), priorizar `customers.test.ts`.
- Actions: mockar `pool.query` e `requireRole`/`getSession` como já é feito em pedidos.
- Rodar `npm test` antes de commitar: o pre-commit hook roda lint + testes e bloqueia se falhar.
- O roteiro manual cobre os caminhos que os mocks não pegam (UX do modal, complementação inline).
