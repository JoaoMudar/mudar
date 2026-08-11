# Relação com as rotinas que já existem

> O financeiro não é um módulo à parte. Ele fecha ciclos que hoje terminam no meio.

## Mapa das ligações

| Rotina atual | Como liga | O que passa a ser possível |
|---|---|---|
| **Pedidos** (`orders`, `order_items`) | entrada do extrato → `transactions.order_id` | Saber se o pedido foi **pago**, não só entregue. Hoje o ciclo termina na separação. |
| **Clientes** (`customers`) | `customers.party_id` → a mesma party da entrada | Histórico de recebimento por cliente. Inadimplência medida, não lembrada. |
| **Fornecedores / cotação** (P11) | saída → `transactions.supplier_quote_id` | Fecha cotação → compra → **pagamento**. A margem da muda revendida deixa de ser estimativa. |
| **Insumos** (`inputs`, `input_price_history`) | saída em `Insumos/Produção` + party fornecedor | O preço do insumo passa a vir do que foi pago, não do que foi digitado. |
| **Custeio** (P1: `fixed_costs`, `production_costs`) | soma mensal do centro `viveiro` por grupo | **A ligação mais valiosa** — ver abaixo. |
| **Precificação** (P3) | via custeio | Preço com base em custo real, não estimado. |
| **Perdas** (P2) | — | Sem ligação direta. Perda é evento físico, não financeiro. |

---

## 1. Pedidos — o ciclo que hoje para na entrega

A rotina de pedidos (`docs/rotinas/rotina-pedidos/`) vai de WhatsApp → verificação →
aprovação → separação → carga. E termina aí. Se o cliente pagou, isso mora no extrato e na
memória do Gilberto.

Com o financeiro, uma entrada do extrato pode ser apontada para um pedido
(`transactions.order_id`). O casamento é semiautomático: mesmo valor, data próxima da
entrega, party do cliente batendo. O que não casar sozinho fica na fila.

**Ordem de implementação:** isso é Fase 6, depois de a fila funcionar. Um vínculo com pedido
só vale quando as transações já entram limpas.

## 2. Clientes — a party comum

Depois da Fase 1, um cliente é uma `cadastro.parties` com o papel `cliente`. A entrada
conciliada aponta para a mesma party. É o que permite responder "esse cliente costuma pagar
quando?" sem cruzar planilha com extrato à mão.

## 3. Fornecedores — o ciclo de revenda completo

O P11 construiu a rede de fornecedores até a cotação (`supplier_quotes`,
`supplier_quote_items`, com `is_chosen` e `sale_unit_price`). O que falta é o pagamento.

Ligando a saída à cotação escolhida, fecha-se: **cotei R$X → escolhi este → paguei R$Y →
vendi por R$Z**. A margem da muda de terceiros — que é a operação de revenda inteira — deixa
de ser estimativa.

Isso também é o que dá sentido à categoria `Mudas de terceiros/Revenda`: ela não é custo de
produção, é custo de mercadoria, com margem diferente. O BI antigo descobriu isso tarde —
55% do que estava marcado como "insumo" em 2025 não era insumo.

## 4. Insumos — preço pago × preço digitado

`input_price_history` hoje guarda o que alguém digitou ao registrar a compra. Uma saída
categorizada em `Insumos/Produção`, com party de fornecedor conhecido, é o preço que
efetivamente saiu da conta.

Não é automático — a saída do extrato diz "R$1.240 para Agro Comercial", não diz quantos
sacos de substrato. Mas é a conferência: se o histórico de preço divergir muito do que foi
pago no período, alguma coisa está errada em um dos dois.

## 5. Custeio (P1) — a ligação que justifica o resto

Esta é a razão de o financeiro existir dentro do app, e não num Excel melhor.

`fixed_costs` hoje é uma tabela preenchida à mão: alguém estima quanto custa por mês energia,
folha, contabilidade, combustível. Esse número entra na `species_unit_cost`, que vira o custo
por muda, que vira o preço (P3).

**Se o custo fixo está estimado, todo preço do viveiro está estimado.**

Com o financeiro, o custo fixo mensal do centro `viveiro` é a soma real das transações do mês
fechado, por grupo de categoria. O caminho:

```
extrato → transaction (centro=viveiro, categoria=Energia) → soma mensal por grupo
        → alimenta fixed_costs → species_unit_cost → preço por canal (P3)
```

**Três cuidados:**

- **Agrega por `competence_date`, não por `posted_at`.** Custo é competência. O substrato
  comprado em fevereiro e pago em abril é custo de fevereiro — foi em fevereiro que ele virou
  muda. Somar pelo caixa faz o mês de semeadura parecer barato e o mês do pagamento parecer
  caro, e o custo por muda sai errado nos dois.
- Só entra **mês fechado**. Custo fixo alimentado por mês aberto produz um custo por muda que
  muda todo dia.
- Só entram **centros de negócio** (`viveiro`, `sitio`). A energia da casa não pode encostar
  no custo da muda — foi exatamente esse o furo que o post-mortem mediu.

**Gasto parcelado** (maquinário, financiamento) tem cuidado próprio: os campos de parcela
guardam o valor cheio da compra, então o custeio pode escolher entre olhar a parcela do mês
ou a decisão inteira — sem precisar de tabela de contratos.

## 6. Rotina financeiro (`rotina-financeiro.md`)

O documento antigo descrevia a situação de fato: "NF pelo sistema do Sebrae, dados em Excel,
sem controle de margem, custo real ou faturamento estruturado". Continua verdade até a Fase 4
rodar — mas agora aponta para cá.

**O que o financeiro não substitui:** a emissão de NF segue no sistema do Sebrae. O sistema
registra que o dinheiro entrou; não gera o documento fiscal.

---

## O que fica de fora, de propósito

- **Contas a pagar / a receber (previsão).** O sistema registra o que aconteceu, não o que
  vai acontecer. Previsão é uma camada posterior, e só faz sentido depois de o histórico
  conciliado existir.
- **Fluxo de caixa projetado.** Mesma razão.
- **Folha de pagamento.** `Salário/Folha de pagamento` é uma categoria de saída, não um
  módulo de RH.
- **Conciliação do passado pré-2026.** Marco zero é 01/01/2026. O anterior fica no banco
  histórico `notas_despesas` para tendência — ver `readmeBI.md` e suas regras críticas antes
  de qualquer query lá.
