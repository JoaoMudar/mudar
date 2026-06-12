# P11 — Fornecedores e Cotação (rede de revenda)

> Origem: `planoFornecedores.md` (briefing "MudaMatch"), adaptado ao ecossistema existente.
> Problema: clientes pedem espécies que o viveiro não produz; o sourcing manual é lento e
> o cliente compra em outro lugar. Solução: rede de fornecedores consultável + facilitador
> de cotação com mensagens prontas de WhatsApp (outreach **honesto e semi-automático** —
> o sistema gera texto + link `wa.me`, o envio é sempre clique manual do usuário).

**Reutilizar, não recriar:** catálogo canônico = `species` + `species_popular_names`;
clientes = `customers`; pedidos = `orders`/`order_items` (já têm `is_available`, genéricos
e escopo); parse/match = `src/lib/order-paste.ts`; UI = `Autocomplete`, `Toast`, padrão
Manager. Um PR por fase; merge na main feito pelo Joao via GitHub.

---

## 📌 STATUS (atualizado em 2026-06-11) — como retomar em qualquer sessão nova

- **Fase 1 CONCLUÍDA e mergeada na main** (PR #15).
- **Fase 2 CONCLUÍDA** na branch `feat/fornecedores-cotacao` (T2.1–T2.8 todas [x]):
  cotação semi-automática com wizard de 3 passos, wa.me, acompanhamento e
  registro de respostas. Validação: 321/321 testes, `npm run build` OK,
  migração `20260611000005` aplicada **só no Postgres local** (Neon pendente,
  como as demais rotinas). Aguardando revisão/merge do Joao via GitHub.
- **Próximo passo**: após o merge da F2 → Fase 3 (comparação de preços e
  fechamento, T3.1–T3.3) em branch nova `feat/fornecedores-comparacao`,
  partindo da main atualizada.
- Instrução de retomada para o Claude: ler este arquivo + a memória
  `project_fornecedores.md`; não começar uma fase sem a anterior mergeada.

---

## Fase 1 — Fundação: fornecedores + espécies por fornecedor (branch `feat/fornecedores`)

- [x] T1.1 Migração `suppliers` (status lead/active/inactive/do_not_contact, cidade/UF texto, reliability_score 0–5, soft-delete `active`)
- [x] T1.2 Migração `supplier_species` (FK → species, size/container texto livre, unit_price/min_quantity opcionais, availability, source manual/paste/quote; sem UNIQUE supplier+species — variações por tamanho)
- [x] T1.3 `src/lib/suppliers.ts` — tipos, metas de status/disponibilidade, validação (puro)
- [x] T1.4 `src/lib/supplier-paste.ts` — extração de preço/tamanho BR + delegação a order-paste (puro)
- [x] T1.5 `src/app/fornecedores/actions.ts` — CRUD suppliers + supplier_species + import transacional
- [x] T1.6 `src/app/fornecedores/page.tsx` + `FornecedoresManager.tsx` (busca por nome/cidade/espécie) + `SupplierForm.tsx`
- [x] T1.7 `src/app/fornecedores/[id]/page.tsx` + `SupplierDetail.tsx` + `SupplierSpeciesEditor.tsx` (Autocomplete + criar espécie/sinônimo) + `SpeciesPasteImport.tsx` (colar lista do fornecedor)
- [x] T1.8 Link no menu (`src/app/page.tsx`, seção Pedidos, admin/chefia)
- [x] T1.9 Testes Vitest (actions com mocks; supplier-paste puro)
- [x] T1.10 Migrações aplicadas no Postgres local (Neon fica pendente, como as demais)

## Fase 2 — Cotação / outreach semi-automático (branch `feat/fornecedores-cotacao`)

- [x] T2.1 Migração `supplier_quotes` (request_group_id agrupa disparo; order_id nullable = avulsa) + `supplier_quote_items`
- [x] T2.2 `src/lib/whatsapp.ts` — `normalizeBrazilPhone`, `buildWaLink`, `buildQuoteRequestMessage` (puro)
- [x] T2.3 Actions de cotação: `findSuppliersForSpecies` (exclui do_not_contact), `createQuoteRequests` (revalida no servidor), `markQuoteSent` (atualiza last_contacted_at), `recordQuoteResponse` (upsert supplier_species), `markQuoteNoReply`, `getQuotes`
- [x] T2.4 `QuoteWizard.tsx` (3 passos: itens → fornecedores → mensagens editáveis + wa.me)
- [x] T2.5 Fluxo A: `/pedidos/[id]/cotar` (itens indisponíveis pré-marcados) + botão em `OrderDetailClient.tsx`
- [x] T2.6 Fluxo B: `/fornecedores/cotar` (cotação avulsa)
- [x] T2.7 Acompanhamento: `/fornecedores/cotacoes` + `RecordResponseForm` (anotar resposta/preços)
- [x] T2.8 Testes (whatsapp puro; actions com bloqueio do_not_contact e upsert)

## Fase 3 — Comparação e fechamento

- [ ] T3.1 `src/lib/pricing.ts` puro (`applyMarkup`, `marginOf`, `isBelowMinMargin`) + testes
- [ ] T3.2 Matriz espécie × fornecedor por grupo de cotação (menor preço destacado); escolha por item (`is_chosen`/`sale_unit_price` em supplier_quote_items)
- [ ] T3.3 `buildCustomerQuoteMessage` — resumo limpo p/ cliente (sem fornecedores/custos); margem mínima via env

## Fase 4 — Distância e mapa

- [ ] T4.1 lat/lng em suppliers + geocoding Nominatim sob demanda com cache no banco
- [ ] T4.2 `src/lib/geo.ts` (`haversineKm`) + ordenação por distância em findSuppliersForSpecies
- [ ] T4.3 Mapa Leaflet opcional (client dinâmico, ssr: false)

## Fase 5 — Dashboard

- [ ] T5.1 Kanban de cotações por status; fornecedores mais usados; taxa de resposta; espécies cotadas sem fornecedor (gap de rede)

## Decisões registradas

1. `container` em supplier_species é texto livre (a tabela `containers` modela produção interna com custos; fornecedor usa embalagem arbitrária).
2. `order_id` nullable + `request_group_id` = um modelo para cotação do pedido e avulsa.
3. `active` (soft-delete, padrão do sistema) coexiste com `status='inactive'` (estágio do relacionamento).
4. Upsert de resposta de cotação casa por (supplier, species, size).
5. WhatsApp 100% semi-automático — nunca disparo automatizado.
6. CSV adiado: listas chegam por WhatsApp; colagem cobre (Excel colado vira texto tabulado).
