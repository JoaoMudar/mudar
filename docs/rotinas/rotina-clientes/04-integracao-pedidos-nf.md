# Fase 4: Integração Pedidos + NF (Fechamento)

## Objetivo
Conectar clientes e pedidos no momento da aprovação: perguntar se o pedido precisa de
Nota Fiscal e, em caso afirmativo, garantir que o cliente está fiscalmente completo —
oferecendo complementação **inline** sem tirar a chefia do fluxo do pedido. Pedido sem
NF continua sendo aprovado exatamente como hoje (atrito zero).

## Pré-requisitos
- `orders.needs_invoice` criado (Fase 1, T1.2).
- `isFiscallyComplete` / `getMissingFiscalFields` prontos (Fase 2).
- `CustomerFiscalForm` reutilizável e `updateCustomer` prontos (Fase 3).
- Ponto de integração no servidor: `approveOrder(orderId)` em
  `src/app/pedidos/actions.ts` (hoje recebe só `orderId`).
- Ponto de integração na UI: `src/app/pedidos/[id]/OrderAnalysis.tsx` (botão "Aprovar"),
  `OrderDetailClient.tsx` e `PedidosList.tsx` (badges).
- Cross-ref: este é o complemento da etapa de análise/fechamento descrita em
  `../rotina-pedidos/05-analise-fechamento.md`.

## Tarefas

### T4.1 — `approveOrder` com `needsInvoice`
- [x] Alterar a assinatura para `approveOrder(orderId, needsInvoice: boolean)`.
- [x] Persistir `orders.needs_invoice = needsInvoice` na mesma transação da aprovação.
- [x] Se `needsInvoice === true`: carregar o cliente do pedido e revalidar
  `isFiscallyComplete` **no servidor** (defesa em profundidade). Se incompleto:
  `ROLLBACK` e retornar `{ error }` com os campos faltantes de `getMissingFiscalFields`
  (ex.: "Cliente sem dados de NF: CNPJ, e-mail, CEP").
- [x] Se `needsInvoice === false`: aprovar exatamente como hoje — **nenhuma** checagem fiscal.
- [x] Manter o resto do fluxo atual (validação de status `verificado`, histórico,
  `notifyRole('gerencia', ...)`).

### T4.2 — Pergunta "Precisa de Nota Fiscal?"
- [x] Em `OrderAnalysis.tsx`, ao clicar "Aprovar Pedido", abrir um modal/confirmação:
  "Este pedido precisa de Nota Fiscal?" com **Sim** / **Não**.
- [x] **Não** → chama `approveOrder(id, false)` (comportamento atual).
- [x] **Sim** → chama `approveOrder(id, true)`:
  - cliente completo → aprova;
  - cliente incompleto → não aprova ainda; abre o painel de complementação (T4.3).

### T4.3 — Complementação fiscal inline
- [x] Quando "Sim" + cliente incompleto, exibir o `CustomerFiscalForm` (Fase 3)
  pré-carregado com os dados atuais do cliente, **dentro** da tela do pedido (modal/painel).
- [x] Salvar via `updateCustomer(id, data)`; ao salvar com sucesso e ficar completo,
  chamar `approveOrder(id, true)` automaticamente — sem navegar para fora do pedido.
- [x] Destacar os campos que faltam usando `getMissingFiscalFields`.

### T4.4 — Sinalização visual de NF
- [x] Badge "NF" no detalhe do pedido (`OrderDetailClient.tsx`) quando `needs_invoice = true`.
- [x] Badge/coluna "NF" na lista de pedidos (`PedidosList.tsx`).
- [ ] (Opcional) Filtro "somente pedidos com NF" na lista.

## Wireframe — Modal de NF no fechamento

```
+===============================================+
|  Aprovar Pedido #47                           |
+-----------------------------------------------+
|  Este pedido precisa de Nota Fiscal?          |
|                                               |
|            [  Não  ]      [  Sim  ]           |
+===============================================+

  Se "Sim" e cliente incompleto:

+===============================================+
|  Pedido #47 — dados de NF do cliente          |
+-----------------------------------------------+
|  ⚠ Faltam para emitir NF: CNPJ, e-mail, CEP   |
|                                               |
|  [ ... CustomerFiscalForm embutido ... ]      |
|                                               |
|              [Cancelar]   [Salvar e aprovar]  |
+===============================================+
```

## Notas Técnicas
- **Atrito zero é requisito**: o caminho "Não" não pode custar nenhum passo extra além
  de um clique. A grande maioria dos pedidos (atacado via WhatsApp) segue sem NF.
- **Defesa em profundidade**: a checagem no `approveOrder` (servidor) é a que vale; o
  modal e o feedback do formulário (client) são UX. Nunca confiar só no client.
- **Transação**: persistir `needs_invoice` junto da mudança de status, dentro do
  `BEGIN/COMMIT` já existente em `approveOrder`.
- **Reuso, não cópia**: a complementação inline usa o **mesmo** `CustomerFiscalForm` e o
  **mesmo** `updateCustomer` da área `/clientes`. Nenhuma duplicação de formulário fiscal.
- **Compatibilidade da assinatura**: ao mudar `approveOrder`, atualizar todas as
  chamadas (UI e testes). `needs_invoice` tem default `false` no banco, então registros
  antigos permanecem coerentes.
