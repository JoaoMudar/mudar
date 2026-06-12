'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/action-errors'
import {
  normalizeQuoteChannel,
  validateQuoteItems,
  type QuoteChannel,
  type QuoteItemInput,
} from '@/lib/quotes'
import { applyMarkup, isBelowMinMargin, parseMarginPct } from '@/lib/pricing'
import { formatPriceBR } from '@/lib/suppliers'

const PATH = '/fornecedores/cotacoes'

/**
 * Fornecedores candidatos para cotar as especies dadas, com as ofertas que
 * cada um ja tem cadastradas (preco/tamanho quando conhecidos).
 * NUNCA retorna fornecedor arquivado ou marcado "não contatar".
 * Ordena por cobertura DESC e, no empate, quem foi contatado ha mais tempo
 * primeiro (distribui o outreach na rede).
 */
export async function findSuppliersForSpecies(speciesIds: string[]) {
  await requireRole('admin', 'chefia')
  if (!speciesIds || speciesIds.length === 0) return []
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.contact_name, s.whatsapp, s.phone, s.email, s.instagram,
            s.city, s.state, s.reliability_score, s.last_contacted_at,
            COUNT(DISTINCT ss.species_id)::int AS coverage_count,
            json_agg(json_build_object(
              'species_id', ss.species_id,
              'common_name', sp.common_name,
              'size', ss.size,
              'unit_price', ss.unit_price,
              'availability', ss.availability
            ) ORDER BY sp.common_name, ss.size) AS offers
     FROM suppliers s
     JOIN supplier_species ss ON ss.supplier_id = s.id AND ss.species_id = ANY($1)
     JOIN species sp ON sp.id = ss.species_id
     WHERE s.active = true AND s.status <> 'do_not_contact'
     GROUP BY s.id
     ORDER BY coverage_count DESC, s.last_contacted_at ASC NULLS FIRST, s.name`,
    [speciesIds],
  )
  return rows
}

export interface QuoteSupplierMessage {
  supplier_id: string
  /** Mensagem final (gerada e possivelmente editada pelo usuario). */
  message_text: string
  channel?: QuoteChannel
}

/**
 * Registra um disparo de cotacao: 1 linha em supplier_quotes por fornecedor
 * (mesmo request_group_id) + os itens pedidos em cada uma. Status 'queued' —
 * o envio real e clique manual do usuario no link wa.me, registrado depois
 * via markQuoteSent. Revalida do_not_contact/active NO SERVIDOR (o client
 * pode estar com lista desatualizada).
 */
export async function createQuoteRequests(input: {
  orderId?: string | null
  items: QuoteItemInput[]
  suppliers: QuoteSupplierMessage[]
}): Promise<{
  requestGroupId?: string
  quotes?: { id: string; supplier_id: string }[]
  error?: string
}> {
  const user = await requireRole('admin', 'chefia')
  const itemsError = validateQuoteItems(input.items)
  if (itemsError) return { error: itemsError }
  if (!input.suppliers || input.suppliers.length === 0) {
    return { error: 'Selecione ao menos um fornecedor.' }
  }
  for (const s of input.suppliers) {
    if (!s.supplier_id) return { error: 'Fornecedor inválido na lista.' }
    if (!s.message_text?.trim()) return { error: 'Há fornecedor com mensagem vazia.' }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const supplierIds = input.suppliers.map((s) => s.supplier_id)
    const { rows: blocked } = await client.query(
      `SELECT name FROM suppliers
       WHERE id = ANY($1) AND (status = 'do_not_contact' OR active = false)`,
      [supplierIds],
    )
    if (blocked.length > 0) {
      await client.query('ROLLBACK')
      const names = blocked.map((b: { name: string }) => b.name).join(', ')
      return { error: `Fornecedor marcado como "não contatar" ou arquivado: ${names}.` }
    }

    const requestGroupId = randomUUID()
    const quotes: { id: string; supplier_id: string }[] = []
    for (const s of input.suppliers) {
      const { rows } = await client.query(
        `INSERT INTO supplier_quotes
           (request_group_id, supplier_id, order_id, channel, message_text, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          requestGroupId,
          s.supplier_id,
          input.orderId ?? null,
          normalizeQuoteChannel(s.channel),
          s.message_text.trim(),
          user.id,
        ],
      )
      const quoteId = rows[0].id as string
      for (const item of input.items) {
        await client.query(
          `INSERT INTO supplier_quote_items
             (quote_id, species_id, order_item_id, quantity, size)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            quoteId,
            item.species_id,
            item.order_item_id ?? null,
            item.quantity,
            item.size?.trim() || null,
          ],
        )
      }
      quotes.push({ id: quoteId, supplier_id: s.supplier_id })
    }
    await client.query('COMMIT')
    revalidatePath(PATH)
    return { requestGroupId, quotes }
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: safeErrorMessage(e) }
  } finally {
    client.release()
  }
}

/**
 * Usuario clicou no wa.me e enviou: marca a cotacao como enviada e atualiza
 * last_contacted_at do fornecedor (alimenta a ordenacao do proximo disparo).
 */
export async function markQuoteSent(quoteId: string): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(
      `UPDATE supplier_quotes SET status = 'sent', sent_at = now()
       WHERE id = $1 AND status = 'queued'`,
      [quoteId],
    )
    await pool.query(
      `UPDATE suppliers SET last_contacted_at = now()
       WHERE id = (SELECT supplier_id FROM supplier_quotes WHERE id = $1)`,
      [quoteId],
    )
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

export async function markQuoteNoReply(quoteId: string): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(
      `UPDATE supplier_quotes SET status = 'no_reply'
       WHERE id = $1 AND status = 'sent'`,
      [quoteId],
    )
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

export async function cancelQuote(quoteId: string): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(
      `UPDATE supplier_quotes SET status = 'cancelled'
       WHERE id = $1 AND status IN ('queued', 'sent')`,
      [quoteId],
    )
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

export interface QuoteResponseItemInput {
  quote_item_id: string
  quoted_unit_price: number | null
  response_notes?: string | null
}

/**
 * Anota a resposta do fornecedor: precos por item + resposta crua opcional.
 * Alem de marcar 'responded', faz UPSERT em supplier_species (casando por
 * supplier + species + size) com source='quote' — cada resposta enriquece o
 * catalogo de quem oferece o que, a que preco.
 */
export async function recordQuoteResponse(
  quoteId: string,
  input: {
    rawResponse?: string | null
    notes?: string | null
    items: QuoteResponseItemInput[]
  },
): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  for (const item of input.items ?? []) {
    if (item.quoted_unit_price !== null && item.quoted_unit_price !== undefined) {
      if (!Number.isFinite(item.quoted_unit_price) || item.quoted_unit_price < 0) {
        return { error: 'Preço cotado não pode ser negativo.' }
      }
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: qrows } = await client.query(
      `SELECT supplier_id FROM supplier_quotes WHERE id = $1`,
      [quoteId],
    )
    if (qrows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Cotação não encontrada.' }
    }
    const supplierId = qrows[0].supplier_id as string

    for (const item of input.items ?? []) {
      const price = item.quoted_unit_price ?? null
      const { rows: updated } = await client.query(
        `UPDATE supplier_quote_items
         SET quoted_unit_price = $1, response_notes = $2
         WHERE id = $3 AND quote_id = $4
         RETURNING species_id, size`,
        [price, item.response_notes?.trim() || null, item.quote_item_id, quoteId],
      )
      const row = updated[0]
      if (!row || price === null) continue
      // Upsert no catalogo do fornecedor (sem UNIQUE no banco: casa por
      // supplier + species + size, tratando size NULL como '').
      const { rowCount } = await client.query(
        `UPDATE supplier_species
         SET unit_price = $1, source = 'quote'
         WHERE supplier_id = $2 AND species_id = $3
           AND COALESCE(size, '') = COALESCE($4, '')`,
        [price, supplierId, row.species_id, row.size],
      )
      if (!rowCount) {
        await client.query(
          `INSERT INTO supplier_species
             (supplier_id, species_id, size, unit_price, source)
           VALUES ($1, $2, $3, $4, 'quote')`,
          [supplierId, row.species_id, row.size, price],
        )
      }
    }

    await client.query(
      `UPDATE supplier_quotes
       SET status = 'responded', responded_at = now(),
           raw_response = COALESCE($1, raw_response),
           notes = COALESCE($2, notes)
       WHERE id = $3`,
      [input.rawResponse?.trim() || null, input.notes?.trim() || null, quoteId],
    )
    await client.query('COMMIT')
    revalidatePath(PATH)
    revalidatePath('/fornecedores')
    revalidatePath(`/fornecedores/${supplierId}`)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: safeErrorMessage(e) }
  } finally {
    client.release()
  }
}

/**
 * Cotacoes de UM disparo (request_group_id) para a tela de comparacao,
 * com itens (incl. escolha/preco de venda) e contato do cliente do pedido
 * (para gerar a mensagem de fechamento via wa.me).
 */
export async function getQuoteGroup(groupId: string) {
  await requireRole('admin', 'chefia')
  const { rows } = await pool.query(
    `SELECT q.id, q.request_group_id, q.supplier_id, q.order_id, q.channel,
            q.status, q.sent_at, q.responded_at, q.notes, q.created_at,
            s.name AS supplier_name, s.contact_name, s.whatsapp, s.city, s.state,
            o.order_number, c.name AS customer_name, c.phone AS customer_phone,
            COALESCE(json_agg(json_build_object(
              'id', qi.id,
              'species_id', qi.species_id,
              'common_name', sp.common_name,
              'quantity', qi.quantity,
              'size', qi.size,
              'quoted_unit_price', qi.quoted_unit_price,
              'response_notes', qi.response_notes,
              'is_chosen', qi.is_chosen,
              'sale_unit_price', qi.sale_unit_price
            ) ORDER BY sp.common_name) FILTER (WHERE qi.id IS NOT NULL), '[]') AS items
     FROM supplier_quotes q
     JOIN suppliers s ON s.id = q.supplier_id
     LEFT JOIN orders o ON o.id = q.order_id
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN supplier_quote_items qi ON qi.quote_id = q.id
     LEFT JOIN species sp ON sp.id = qi.species_id
     WHERE q.request_group_id = $1
     GROUP BY q.id, s.id, o.id, c.id
     ORDER BY s.name`,
    [groupId],
  )
  return rows
}

export interface QuoteChoiceInput {
  quote_item_id: string
  /** Preco unitario de venda ao cliente (obrigatorio na escolha). */
  sale_unit_price: number
}

/**
 * Fechamento da comparacao: marca a oferta escolhida por especie do grupo e
 * grava o preco de venda. Regras validadas NO SERVIDOR:
 * - todo item escolhido pertence ao grupo e tem preco cotado (custo);
 * - no maximo uma escolha por especie;
 * - preco de venda respeita o piso minimo de seguranca
 *   (custo + QUOTE_MIN_MARGIN_PCT% — default em DEFAULT_MIN_MARGIN_PCT).
 * Escolhas anteriores do grupo sao substituidas (salvar = estado completo).
 */
export async function saveQuoteChoices(
  groupId: string,
  choices: QuoteChoiceInput[],
): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  const minMarginPct = parseMarginPct(process.env.QUOTE_MIN_MARGIN_PCT)
  for (const choice of choices ?? []) {
    if (!choice.quote_item_id) return { error: 'Item inválido na escolha.' }
    if (!Number.isFinite(choice.sale_unit_price) || choice.sale_unit_price < 0) {
      return { error: 'Informe o preço de venda de cada item escolhido.' }
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: groupItems } = await client.query(
      `SELECT qi.id, qi.species_id, qi.quoted_unit_price, sp.common_name
       FROM supplier_quote_items qi
       JOIN supplier_quotes q ON q.id = qi.quote_id
       JOIN species sp ON sp.id = qi.species_id
       WHERE q.request_group_id = $1`,
      [groupId],
    )
    if (groupItems.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Cotação não encontrada.' }
    }

    const itemById = new Map<
      string,
      { species_id: string; quoted_unit_price: string | number | null; common_name: string }
    >(groupItems.map((row) => [row.id as string, row]))
    const chosenSpecies = new Set<string>()
    for (const choice of choices ?? []) {
      const item = itemById.get(choice.quote_item_id)
      if (!item) {
        await client.query('ROLLBACK')
        return { error: 'Item não pertence a esta cotação.' }
      }
      if (item.quoted_unit_price == null) {
        await client.query('ROLLBACK')
        return { error: `"${item.common_name}" ainda não tem preço cotado pelo fornecedor.` }
      }
      if (chosenSpecies.has(item.species_id)) {
        await client.query('ROLLBACK')
        return { error: 'Escolha apenas um fornecedor por espécie.' }
      }
      chosenSpecies.add(item.species_id)

      const cost = Number(item.quoted_unit_price)
      if (isBelowMinMargin(choice.sale_unit_price, cost, minMarginPct)) {
        await client.query('ROLLBACK')
        const floor = formatPriceBR(applyMarkup(cost, minMarginPct))
        return {
          error:
            `Preço de venda de "${item.common_name}" abaixo do piso mínimo de segurança ` +
            `(${minMarginPct}% sobre o custo = ${floor}).`,
        }
      }
    }

    await client.query(
      `UPDATE supplier_quote_items qi
       SET is_chosen = false, sale_unit_price = NULL
       FROM supplier_quotes q
       WHERE q.id = qi.quote_id AND q.request_group_id = $1`,
      [groupId],
    )
    for (const choice of choices ?? []) {
      await client.query(
        `UPDATE supplier_quote_items
         SET is_chosen = true, sale_unit_price = $1
         WHERE id = $2`,
        [choice.sale_unit_price, choice.quote_item_id],
      )
    }
    await client.query('COMMIT')
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: safeErrorMessage(e) }
  } finally {
    client.release()
  }
}

/**
 * Cotacoes para a tela de acompanhamento, mais recentes primeiro, com itens
 * agregados (o client agrupa por request_group_id).
 */
export async function getQuotes() {
  await requireRole('admin', 'chefia')
  const { rows } = await pool.query(
    `SELECT q.id, q.request_group_id, q.supplier_id, q.order_id, q.channel,
            q.status, q.message_text, q.sent_at, q.responded_at, q.raw_response,
            q.notes, q.created_at,
            s.name AS supplier_name, s.contact_name, s.whatsapp,
            o.order_number, c.name AS customer_name,
            COALESCE(json_agg(json_build_object(
              'id', qi.id,
              'species_id', qi.species_id,
              'common_name', sp.common_name,
              'quantity', qi.quantity,
              'size', qi.size,
              'quoted_unit_price', qi.quoted_unit_price,
              'response_notes', qi.response_notes
            ) ORDER BY sp.common_name) FILTER (WHERE qi.id IS NOT NULL), '[]') AS items
     FROM supplier_quotes q
     JOIN suppliers s ON s.id = q.supplier_id
     LEFT JOIN orders o ON o.id = q.order_id
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN supplier_quote_items qi ON qi.quote_id = q.id
     LEFT JOIN species sp ON sp.id = qi.species_id
     GROUP BY q.id, s.id, o.id, c.id
     ORDER BY q.created_at DESC
     LIMIT 200`,
  )
  return rows
}
