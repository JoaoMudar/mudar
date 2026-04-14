# P10 — E-commerce + Kits Temáticos

## Status: NÃO INICIADO
## Prioridade: BAIXA (Futuro — Mês 6+)
## Dependências: P1 (custeio), P3 (preços), P5 (pedidos), P7 (catálogo), P9 (site)
## Bloqueia: Nenhum

---

## Objetivo
Abrir canal de vendas direto ao consumidor (varejo online) com margem 2-3x maior que atacado. Vender kits temáticos de mudas que simplificam a compra para pessoa física e agregam valor percebido.

## Contexto
Hoje 100% das vendas são atacado. Varejo online de mudas nativas é nicho crescente — consumidores conscientes querem plantar árvores em casa, sítio, chácara. Kits temáticos (ex: "Kit Mata Atlântica", "Kit Frutíferas") eliminam a barreira de "não sei o que comprar". Margem no varejo pode ser 80-150% vs 30-50% no atacado. PORÉM: logística de envio de plantas vivas é delicada e precisa ser testada antes de escalar.

## Resultado Esperado
- Loja online integrada ao site (P9)
- Venda de mudas individuais e kits temáticos
- Carrinho, checkout com pagamento online (Pix, cartão)
- Cálculo de frete automático por CEP
- Fluxo pós-venda automatizado (confirmação, rastreio, cuidados)
- Controle de estoque integrado com produção

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **Definir kits temáticos**: Gilberto + João montarem 5-8 kits:
  - Kit Mata Atlântica (10 espécies nativas mistas)
  - Kit Frutíferas (5-8 frutíferas nativas)
  - Kit Paisagismo (espécies ornamentais)
  - Kit Restauração Básico (20 mudas pioneiras + secundárias)
  - Kit Presente (3 mudas em embalagem especial)
  - Kit Cerca Viva (espécies para cerca)
  - Kit Abelhas (espécies melíferas)
- [ ] **Logística de envio**: João testar envio de 5-10 pedidos para diferentes estados
  - Embalagem: testar caixa com proteção (papel, jornal, esponja)
  - Transportadora: Correios (PAC/Sedex), Jadlog, Loggi — comparar preço/prazo
  - Mortalidade no transporte: testar se mudas chegam vivas após 3-5 dias
  - Melhor recipiente para envio: tubete ou saco pequeno (10x18)
- [ ] **Requisitos legais**: Gilberto verificar:
  - Registro no RENASEM (já possui?)
  - Autorização para envio interestadual de mudas nativas
  - Exigências do IBAMA/IEF por estado de destino
  - Nota fiscal para pessoa física (CPF na nota)
- [ ] **Política de troca/garantia**: João + Gilberto definirem:
  - Garantia de X dias após recebimento
  - Condições: fotos da muda ao receber
  - Reenvio ou crédito?
  - Limite de temperatura/estação para envio
- [ ] **Precificação varejo**: aplicar margem de varejo (80-150%) sobre custo real
- [ ] **Embalagem especial**: para kits presente — pesquisar opções de caixa kraft com logo

---

## Tarefas de Desenvolvimento

### Fase 1: Schema E-commerce

- [ ] **T10.1** Criar tabela `products` (abstração sobre espécies para loja)
  ```
  id, type (enum: muda_individual, kit),
  species_id (FK, nullable — null para kits), name, slug,
  description, price, compare_at_price (preço "de"),
  weight_grams, is_active, is_featured,
  max_quantity_per_order, min_quantity,
  photo_urls (text[]), created_at, updated_at
  ```
- [ ] **T10.2** Criar tabela `kit_items` (composição dos kits)
  ```
  id, product_id (FK, onde type=kit), species_id (FK),
  container_id (FK), quantity, created_at
  ```
- [ ] **T10.3** Criar tabela `customers` (clientes varejo)
  ```
  id, name, email, phone, cpf,
  address_street, address_number, address_complement,
  address_neighborhood, address_city, address_state, address_zip,
  created_at, updated_at
  ```
- [ ] **T10.4** Criar tabela `ecommerce_orders`
  ```
  id, customer_id (FK), status (enum: pendente, pago, separando, enviado, entregue, cancelado),
  subtotal, freight_cost, discount, total,
  payment_method, payment_id (gateway reference),
  shipping_method, tracking_code,
  estimated_delivery_date, delivered_at,
  notes, created_at, updated_at
  ```
- [ ] **T10.5** Criar tabela `ecommerce_order_items`
  ```
  id, order_id (FK), product_id (FK), quantity, unit_price, line_total
  ```

### Fase 2: Loja Virtual

- [ ] **T10.6** Criar página `/loja` (vitrine)
  - Grid de produtos (mudas + kits)
  - Filtros: tipo (muda/kit), categoria, preço, disponibilidade
  - Cards com: foto, nome, preço, badge "Kit" ou "Muda", disponibilidade
  - Destaque para kits e produtos em oferta
- [ ] **T10.7** Criar página `/loja/[slug]` (página do produto)
  - Galeria de fotos
  - Descrição detalhada
  - Se kit: lista de espécies incluídas com mini-fotos
  - Seletor de quantidade
  - Cálculo de frete por CEP (input + botão "Calcular")
  - Botão "Adicionar ao Carrinho"
  - Informações: garantia, prazo, cuidados pós-recebimento
- [ ] **T10.8** Implementar carrinho de compras:
  - Persistir em localStorage (sem login)
  - Mini-carrinho no header (ícone + badge)
  - Página `/loja/carrinho` com lista de itens, ajuste de qtd, remoção
  - Cupom de desconto (campo + validação)
  - Cálculo de frete consolidado
  - Botão "Finalizar Compra"

### Fase 3: Checkout e Pagamento

- [ ] **T10.9** Implementar checkout (`/loja/checkout`):
  - Step 1: Dados do cliente (nome, email, telefone, CPF)
  - Step 2: Endereço de entrega (com busca de CEP via ViaCEP)
  - Step 3: Método de envio (opções de frete com prazo/preço)
  - Step 4: Pagamento (Pix, Cartão)
  - Step 5: Confirmação com resumo do pedido
- [ ] **T10.10** Integrar gateway de pagamento:
  - Mercado Pago (mais fácil para PJ no Brasil) ou Stripe
  - Pix: gerar QR code + copia e cola
  - Cartão: crédito em até 3x sem juros
  - Webhook de confirmação de pagamento
- [ ] **T10.11** Integrar cálculo de frete:
  - API dos Correios (PAC, Sedex) ou Melhor Envio (agrega múltiplas transportadoras)
  - Input: CEP + peso total + dimensões
  - Output: opções de frete com prazo e preço
  - Frete grátis acima de R$ X (configurável)

### Fase 4: Pós-Venda Automatizado

- [ ] **T10.12** Workflow: Pedido Pago
  - Email de confirmação com resumo do pedido
  - Criar order no sistema interno (P5) para separação
  - Notificar equipe via WhatsApp
- [ ] **T10.13** Workflow: Pedido Enviado
  - Email com código de rastreamento
  - WhatsApp com rastreamento
- [ ] **T10.14** Workflow: Pedido Entregue (D+2 após entrega estimada)
  - Email: "Suas mudas chegaram? Veja como cuidar delas"
  - Guia de cuidados pós-recebimento (rega, aclimatação, plantio)
  - Pedido de avaliação
- [ ] **T10.15** Workflow: Carrinho Abandonado (D+1 e D+3)
  - Email lembrando dos itens no carrinho (requer email coletado)

### Fase 5: Gestão de Estoque E-commerce

- [ ] **T10.16** Vincular `products` ao estoque real (`batches` de P2):
  - Produto ativo somente se houver lotes com status = 'pronto' e quantidade > threshold
  - Desativar automaticamente quando estoque zerar
  - Alertar quando estoque ficar baixo
- [ ] **T10.17** Separar estoque atacado vs varejo:
  - Reservar X% do estoque para e-commerce (configurável por espécie)
  - Ou manter estoque único com prioridade para quem pedir primeiro

---

## Critérios de Aceite
- [ ] Loja funciona end-to-end: navegar → carrinho → checkout → pagar → receber
- [ ] Pagamento Pix e cartão funcionam
- [ ] Frete calculado corretamente por CEP
- [ ] Estoque atualiza automaticamente após venda
- [ ] Emails pós-venda enviados automaticamente
- [ ] Kits exibem composição de espécies
- [ ] Mobile-first — checkout funciona perfeitamente no celular
- [ ] Pelo menos 5 pedidos de teste concluídos com sucesso

---

## Notas Técnicas
- NÃO iniciar antes de validar logística de envio com 5-10 pedidos manuais.
- Começar com poucos produtos (3-5 kits + 10 espécies individuais) e escalar.
- Mercado Pago é a opção mais simples para PJ brasileira — taxa ~4% no crédito, ~1% Pix.
- Melhor Envio agrega Correios + Jadlog + Loggi e dá preços melhores que contratar direto.
- Considerar sazonalidade: algumas espécies não devem ser enviadas no verão extremo (mortalidade no transporte).
- Embalagem é parte da experiência — caixa kraft com logo + guia de cuidados impresso = diferencial.
- RENASEM é obrigatório para venda de mudas. Verificar se cobre varejo online.
