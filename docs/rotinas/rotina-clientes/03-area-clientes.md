# Fase 3: Área de Clientes (`/clientes`)

## Objetivo
Criar a área dedicada de clientes: lista com busca, cadastro/edição com campos fiscais
(PF/PJ), detalhe e inativação. Rota top-level `/clientes`, acessível a
`admin`/`chefia`/`gerência`, com card próprio na home. Esta fase também consolida
aqui a "casa canônica" das server actions de cliente.

## Pré-requisitos
- Campos fiscais migrados (Fase 1) e `src/lib/customers.ts` pronto (Fase 2).
- Padrão de CRUD de referência: `src/app/admin/usuarios/` (`UsuariosManager.tsx` +
  `actions.ts` com `toggleUsuarioAtivo`, `requireRole`).
- Componentes reutilizáveis existentes: `Autocomplete.tsx`, `Toast.tsx`, classes
  `.input` / `.label` / `.btn-primary`.
- Guard `requireRole` em `src/lib/auth.ts`.

## Tarefas

### T3.1 — Server actions (casa canônica)
- [ ] Criar `src/app/clientes/actions.ts` com `'use server'`, importando `pool` de `@/lib/db`.
- [ ] **Mover** de `src/app/pedidos/actions.ts` para cá: `getCustomers`, `searchCustomers`,
  `createCustomer`. Em `pedidos/actions.ts`, passar a **importar** essas funções daqui
  (re-export ou import direto) — sem duplicar lógica.
- [ ] `getCustomers(search?)` — lista ativos; `search` casa nome/telefone/documento/razão
  social (ILIKE). Incluir campos fiscais para a lista calcular o selo de completude.
- [ ] `getCustomerById(id)` — cliente completo (todos os campos fiscais).
- [ ] `createCustomer(data)` — aceita o cadastro **simples** (só `name`, como hoje) e o
  **completo** (com campos fiscais). Campos fiscais nullable ⇒ o simples continua válido.
  Tratar violação do índice único de `document` → erro "Documento já cadastrado".
- [ ] `updateCustomer(id, data)` — atualiza contato + fiscais; mesmo tratamento de duplicidade.
- [ ] `toggleCustomerActive(id, active)` — soft-delete via `active`, espelhando `toggleUsuarioAtivo`.
- [ ] Todas com `requireRole('admin','chefia','gerencia')` + `revalidatePath('/clientes')`.

### T3.2 — Página e listagem
- [ ] Criar `src/app/clientes/page.tsx` (server component) com `requireRole('admin','chefia','gerencia')`.
- [ ] Carregar `getCustomers(search)` e renderizar `ClientesManager`.
- [ ] Lista com: nome, telefone, cidade/UF, **badge PF/PJ** e **selo fiscal**
  (cinza "simples" se `person_type IS NULL`; vermelho "incompleto"; verde "completo"
  via `isFiscallyComplete`).
- [ ] Busca no topo (debounce), reaproveitando o padrão de `Autocomplete`/filtro client-side.

### T3.3 — Manager (client component)
- [ ] Criar `src/app/clientes/ClientesManager.tsx` no padrão de `UsuariosManager.tsx`:
  lista + botão "Novo cliente" + ações por linha (editar, inativar) + `Toast` de feedback.
- [ ] Usar `useTransition` nas chamadas de action.

### T3.4 — Formulário fiscal reutilizável
- [ ] Criar `src/app/clientes/CustomerFiscalForm.tsx` (client component) — **reutilizável**
  (usado aqui e na complementação inline do fechamento, Fase 4).
- [ ] Toggle **PF / PJ** no topo; campos condicionais:
  - PF: nome completo, CPF (máscara).
  - PJ: razão social, nome fantasia, CNPJ (máscara), IE + checkbox "isento de IE".
  - Comum: e-mail, CEP, logradouro, número, complemento, bairro, cidade, UF.
- [ ] Feedback de completude em tempo real usando `getMissingFiscalFields` (Fase 2):
  destacar o que falta; não bloquear o salvamento (permite rascunho incompleto).
- [ ] Reusar classes `.input` / `.label` / `.btn-primary`.

### T3.5 — Card na home e navegação
- [ ] Em `src/app/page.tsx`, adicionar card "Clientes" com o **mesmo gate** de
  `showPedidos` (`admin || chefia || gerencia`), seguindo o padrão visual da seção Pedidos.
- [ ] Garantir link/rota `/clientes` na navegação onde fizer sentido.

## Wireframe — Lista de Clientes

```
+======================================================================+
|  Clientes                                        [+ Novo cliente]     |
+======================================================================+
|  [ Buscar por nome, telefone ou documento... ]                       |
+----------------------------------------------------------------------+
|  Nome                  | Tipo | Doc/Contato     | Cidade  | Fiscal    |
+------------------------+------+-----------------+---------+-----------+
|  Prefeitura de Rio do  | PJ   | 12.345.678/0001 | Rio Sul | ● completo|
|  João da Silva         | PF   | 47 99999-0000   | Ibirama | ○ simples |
|  Paisagismo Verde Ltda | PJ   | (sem CNPJ)      | Blumenau| ⚠ incompl.|
+------------------------+------+-----------------+---------+-----------+
|  [Editar] [Inativar] por linha                                       |
+----------------------------------------------------------------------+
```

## Wireframe — Formulário (PJ selecionado)

```
+======================================================================+
|  Novo cliente                                                         |
+======================================================================+
|  Tipo:  ( ) Pessoa Física   (x) Pessoa Jurídica                      |
|                                                                       |
|  Razão social: [__________________________]                          |
|  Nome fantasia:[__________________________]   (vira o "nome" exibido) |
|  CNPJ:         [__.___.___/____-__]                                   |
|  Inscr. Estad.:[____________]   [ ] Isento de IE                      |
|                                                                       |
|  E-mail:       [__________________________]  (p/ envio de DANFE/XML)  |
|                                                                       |
|  CEP: [_____-___]  Logradouro: [________________]  Nº: [_____]        |
|  Compl.: [________]  Bairro: [__________]  Cidade: [______]  UF:[SC]  |
|                                                                       |
|  Telefone:     [__ _____-____]                                        |
|  Observações:  [__________________________]                          |
|                                                                       |
|  ⚠ Faltam para NF: CNPJ, CEP                                          |
|                                                                       |
|                                  [Cancelar]   [Salvar cliente]        |
+======================================================================+
```

## Notas Técnicas
- **Casa canônica**: depois desta fase, o domínio de cliente vive em `src/app/clientes/`.
  `pedidos/actions.ts` apenas reusa — evita duas implementações divergindo. O cadastro
  inline do `OrderForm` (nome + telefone) continua chamando o mesmo `createCustomer`.
- **`CustomerFiscalForm` é o ponto de reuso-chave**: a Fase 4 o embute no fechamento do
  pedido. Projetá-lo desacoplado de `/clientes` (recebe `customer` + `onSaved`).
- **Selo de completude na lista** usa `isFiscallyComplete` (lib pura), sem ida extra ao banco.
- **Soft-delete** preserva histórico de pedidos — nunca deletar cliente fisicamente.
- **Duplicidade de documento**: capturar a violação do índice único parcial e devolver
  mensagem amigável, no padrão de `createUsuario` ("nome de usuário já existe").
- **Futuro (anotar, não implementar)**: autofill de endereço por CEP (ViaCEP) ao sair do
  campo CEP; aba "Pedidos do cliente" no detalhe.
