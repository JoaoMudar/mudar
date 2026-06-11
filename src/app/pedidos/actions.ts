'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { getSession, requireAuth, requireRole } from '@/lib/auth'
import { notifyRole } from '@/lib/notifications'
import { getMissingFiscalFields, type FiscalCustomer } from '@/lib/customers'
import {
  validateOrderItems,
  validateGenericAssignment,
  validateLoadsSplit,
  resolveAvailability,
  type AvailabilityState,
  type CreateOrderInput,
  type OrderItemInput,
  type ReviewItemInput,
  type SpeciesAssignment,
} from '@/lib/orders'

function fmtDateBR(value: string | Date | null): string {
  if (!value) return 'sem data'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return 'sem data'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const LIST_PATH = '/pedidos'

// Grava o escopo de especies permitidas de um item generico. Aceita o client da
// transacao em andamento. Lista vazia/ausente => item aberto (nenhuma linha).
async function insertGenericScope(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  itemId: string,
  allowedSpeciesIds?: string[],
): Promise<void> {
  if (!allowedSpeciesIds || allowedSpeciesIds.length === 0) return
  // Dedup defensivo (a PK ja impede duplicata, mas evita erro na mesma chamada).
  const unique = Array.from(new Set(allowedSpeciesIds.filter(Boolean)))
  for (const speciesId of unique) {
    await client.query(
      `INSERT INTO order_item_allowed_species (order_item_id, species_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [itemId, speciesId],
    )
  }
}

// ============================================================
// Clientes — casa canonica: src/app/clientes/actions.ts
// (getCustomers / searchCustomers / createCustomer / updateCustomer / etc.)
// Importe-as de '@/app/clientes/actions'. Nao reexportamos daqui porque um
// arquivo 'use server' so pode exportar funcoes async (re-export quebra o build).
// ============================================================

// ============================================================
// T3.2 — Pedidos
// ============================================================

export async function getSpeciesForSelect() {
  await requireAuth()
  // popular_names: sinonimos da especie — a busca/colagem encontra por qualquer nome.
  const { rows } = await pool.query(
    `SELECT s.id, s.common_name, s.scientific_name, s.photo_url, s.tags,
            COALESCE(array_agg(pn.name) FILTER (WHERE pn.id IS NOT NULL), '{}') AS popular_names
     FROM species s
     LEFT JOIN species_popular_names pn ON pn.species_id = s.id
     WHERE s.active = true
     GROUP BY s.id
     ORDER BY s.common_name`,
  )
  return rows
}

export async function getContainersForSelect() {
  await requireAuth()
  const { rows } = await pool.query(
    `SELECT id, name, volume_liters
     FROM containers WHERE active = true
     ORDER BY volume_liters NULLS FIRST, name`,
  )
  return rows
}

export interface OrderFilters {
  status?: string
  customer_id?: string
  from?: string
  to?: string
}

export async function getOrders(filters: OrderFilters = {}) {
  await requireRole('admin', 'chefia', 'gerencia')
  const where: string[] = []
  const params: unknown[] = []

  if (filters.status) {
    params.push(filters.status)
    where.push(`o.status = $${params.length}`)
  }
  if (filters.customer_id) {
    params.push(filters.customer_id)
    where.push(`o.customer_id = $${params.length}`)
  }
  if (filters.from) {
    params.push(filters.from)
    where.push(`o.created_at >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    where.push(`o.created_at <= $${params.length}`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const { rows } = await pool.query(
    `SELECT
       o.id, o.order_number, o.status, o.sale_channel, o.delivery_date, o.created_at,
       o.needs_invoice,
       c.name AS customer_name,
       COUNT(oi.id) FILTER (WHERE oi.parent_item_id IS NULL) AS item_count,
       COUNT(oi.id) FILTER (WHERE oi.is_generic = true AND oi.parent_item_id IS NULL) AS generic_count
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     ${whereSql}
     GROUP BY o.id, c.name
     ORDER BY o.created_at DESC`,
    params,
  )
  return rows
}

/**
 * Sinal leve para a lista detectar pedidos novos sem recarregar tudo: so um
 * COUNT + MAX(created_at). A lista faz polling deste sinal (aba visivel) e, se
 * mudar, chama router.refresh(). Sem JOINs nem itens — barato de rodar.
 */
export async function getOrdersSignal(): Promise<{ count: number; latest: string | null }> {
  const user = await getSession()
  if (!user || (user.role !== 'admin' && user.role !== 'chefia' && user.role !== 'gerencia')) {
    return { count: 0, latest: null }
  }
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count, MAX(created_at) AS latest FROM orders`,
  )
  const r = rows[0] ?? { count: 0, latest: null }
  return {
    count: Number(r.count) || 0,
    latest: r.latest ? new Date(r.latest).toISOString() : null,
  }
}

export async function getOrderById(id: string) {
  await requireRole('admin', 'chefia', 'gerencia')
  const { rows: orderRows } = await pool.query(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone,
            c.city AS customer_city, u.display_name AS created_by_name
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN users u ON u.id = o.created_by
     WHERE o.id = $1`,
    [id],
  )
  if (orderRows.length === 0) return null
  const order = orderRows[0]

  const { rows: itemRows } = await pool.query(
    `SELECT oi.id, oi.order_id, oi.species_id, oi.container_id, oi.quantity,
            oi.is_generic, oi.parent_item_id, oi.is_available, oi.availability_notes,
            oi.available_quantity, oi.available_container_id, oi.specification,
            s.common_name AS species_name, s.photo_url AS species_photo, s.tags AS species_tags,
            ct.name AS container_name, ct.volume_liters AS container_volume,
            act.name AS available_container_name
     FROM order_items oi
     LEFT JOIN species s ON s.id = oi.species_id
     JOIN containers ct ON ct.id = oi.container_id
     LEFT JOIN containers act ON act.id = oi.available_container_id
     WHERE oi.order_id = $1
     ORDER BY oi.is_generic DESC, oi.created_at`,
    [id],
  )

  // Escopo de especies dos itens genericos de topo (lista fechada do pedido).
  const genericIds = itemRows
    .filter((i) => i.is_generic && !i.parent_item_id)
    .map((i) => i.id)
  const allowedByItem = new Map<string, { id: string; common_name: string }[]>()
  if (genericIds.length > 0) {
    const { rows: scopeRows } = await pool.query(
      `SELECT oas.order_item_id, s.id, s.common_name
       FROM order_item_allowed_species oas
       JOIN species s ON s.id = oas.species_id
       WHERE oas.order_item_id = ANY($1::uuid[])
       ORDER BY s.common_name`,
      [genericIds],
    )
    for (const r of scopeRows) {
      const list = allowedByItem.get(r.order_item_id) ?? []
      list.push({ id: r.id, common_name: r.common_name })
      allowedByItem.set(r.order_item_id, list)
    }
  }

  // Monta arvore: itens de topo + filhos (de genericos).
  // Filhos recebem parent_container_name p/ destacar troca de recipiente vs. minimo.
  const children = itemRows.filter((i) => i.parent_item_id)
  const byId = new Map<string, (typeof itemRows)[number]>(itemRows.map((i) => [i.id, i]))
  const topLevel = itemRows
    .filter((i) => !i.parent_item_id)
    .map((i) => ({
      ...i,
      allowed_species: allowedByItem.get(i.id) ?? [],
      children: children
        .filter((c) => c.parent_item_id === i.id)
        .map((c) => ({
          ...c,
          parent_container_name: byId.get(c.parent_item_id)?.container_name ?? null,
        })),
    }))

  const { rows: history } = await pool.query(
    `SELECT h.from_status, h.to_status, h.notes, h.created_at,
            u.display_name AS changed_by_name
     FROM order_status_history h
     JOIN users u ON u.id = h.changed_by
     WHERE h.order_id = $1
     ORDER BY h.created_at`,
    [id],
  )

  return { order, items: topLevel, history }
}

export async function createOrder(
  data: CreateOrderInput,
): Promise<{ id?: string; order_number?: number; error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'chefia') {
    return { error: 'Sem permissão para cadastrar pedidos.' }
  }
  if (!data.customer_id) return { error: 'Selecione um cliente.' }

  const itemsError = validateOrderItems(data.items)
  if (itemsError) return { error: itemsError }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO orders (customer_id, sale_channel, delivery_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, order_number`,
      [
        data.customer_id,
        data.sale_channel,
        data.delivery_date || null,
        data.notes?.trim() || null,
        user.id,
      ],
    )
    const order = rows[0]

    for (const item of data.items) {
      const { rows: itemRows } = await client.query(
        `INSERT INTO order_items (order_id, species_id, container_id, quantity, is_generic, specification)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          order.id,
          item.is_generic ? null : item.species_id,
          item.container_id,
          item.quantity,
          item.is_generic,
          item.is_generic ? item.specification?.trim() || null : null,
        ],
      )
      if (item.is_generic) {
        await insertGenericScope(client, itemRows[0].id, item.allowed_species_ids)
      }
    }

    await client.query(
      `INSERT INTO order_status_history (order_id, to_status, changed_by)
       VALUES ($1, 'cadastrado', $2)`,
      [order.id, user.id],
    )

    await client.query('COMMIT')

    const { rows: customerRows } = await pool.query(
      `SELECT name FROM customers WHERE id = $1`,
      [data.customer_id],
    )
    const customerName = customerRows[0]?.name ?? 'Cliente'
    await notifyRole(
      'gerencia',
      'novo_pedido',
      `Novo pedido #${order.order_number} — ${customerName}`,
      `${data.items.length} ${data.items.length === 1 ? 'item' : 'itens'} para verificar`,
      `/pedidos/${order.id}`,
    )

    revalidatePath(LIST_PATH)
    return { id: order.id, order_number: order.order_number }
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function updateOrderItems(
  orderId: string,
  items: OrderItemInput[],
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'chefia') {
    return { error: 'Sem permissão para editar pedidos.' }
  }
  const itemsError = validateOrderItems(items)
  if (itemsError) return { error: itemsError }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Remove itens de topo (cascade remove filhos de genericos)
    await client.query(
      `DELETE FROM order_items WHERE order_id = $1 AND parent_item_id IS NULL`,
      [orderId],
    )
    for (const item of items) {
      const { rows: itemRows } = await client.query(
        `INSERT INTO order_items (order_id, species_id, container_id, quantity, is_generic, specification)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          orderId,
          item.is_generic ? null : item.species_id,
          item.container_id,
          item.quantity,
          item.is_generic,
          item.is_generic ? item.specification?.trim() || null : null,
        ],
      )
      if (item.is_generic) {
        await insertGenericScope(client, itemRows[0].id, item.allowed_species_ids)
      }
    }
    await client.query('COMMIT')
    revalidatePath(`${LIST_PATH}/${orderId}`)
    revalidatePath(LIST_PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function cancelOrder(
  orderId: string,
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'chefia') {
    return { error: 'Sem permissão para cancelar pedidos.' }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    const fromStatus = rows[0].status
    await client.query(`UPDATE orders SET status = 'cancelado' WHERE id = $1`, [
      orderId,
    ])
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'cancelado', $3)`,
      [orderId, fromStatus, user.id],
    )
    await client.query('COMMIT')
    revalidatePath(`${LIST_PATH}/${orderId}`)
    revalidatePath(LIST_PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

// ============================================================
// T4.1 — Verificacao de disponibilidade (gerencia)
// ============================================================

export async function startVerification(
  orderId: string,
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão para verificar pedidos.' }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    const from = rows[0].status
    // Idempotente: so inicia a partir de cadastrado ou pendente_alteracao
    if (from !== 'cadastrado' && from !== 'pendente_alteracao') {
      await client.query('ROLLBACK')
      return {}
    }
    await client.query(
      `UPDATE orders SET status = 'verificando_disponibilidade' WHERE id = $1`,
      [orderId],
    )
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'verificando_disponibilidade', $3)`,
      [orderId, from, user.id],
    )
    await client.query('COMMIT')
    revalidatePath(`${LIST_PATH}/${orderId}`)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function toggleItemAvailability(
  itemId: string,
  state: AvailabilityState,
  opts: {
    availableQuantity?: number
    availableContainerId?: string | null
    notes?: string
  } = {},
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }
  try {
    // Quantidade total do item (base p/ validar parcial)
    const { rows } = await pool.query(
      `SELECT quantity FROM order_items WHERE id = $1`,
      [itemId],
    )
    if (rows.length === 0) return { error: 'Item não encontrado.' }
    const total = Number(rows[0].quantity)

    const { error, resolved } = resolveAvailability(state, total, {
      availableQuantity: opts.availableQuantity,
      availableContainerId: opts.availableContainerId,
    })
    if (error || !resolved) return { error: error ?? 'Estado inválido.' }

    await pool.query(
      `UPDATE order_items
       SET is_available = $1, available_quantity = $2, available_container_id = $3,
           availability_notes = $4
       WHERE id = $5`,
      [
        resolved.is_available,
        resolved.available_quantity,
        resolved.available_container_id,
        opts.notes?.trim() || null,
        itemId,
      ],
    )
    return {}
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

/**
 * Salva as observacoes de verificacao dos itens especificos sem alterar o
 * estado (is_available/quantidade). Usado pelo botao "Salvar e continuar depois":
 * os estados ja sao auto-salvos por toggleItemAvailability, mas uma observacao
 * digitada num item ainda nao marcado so persiste por aqui. O `AND order_id`
 * impede escrita cruzada entre pedidos.
 */
export async function saveVerificationNotes(
  orderId: string,
  notes: { itemId: string; notes: string }[],
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const { itemId, notes: text } of notes) {
      await client.query(
        `UPDATE order_items SET availability_notes = $1 WHERE id = $2 AND order_id = $3`,
        [text.trim() || null, itemId, orderId],
      )
    }
    await client.query('COMMIT')
    revalidatePath(`${LIST_PATH}/${orderId}`)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function assignSpeciesToGenericItem(
  parentItemId: string,
  assignments: SpeciesAssignment[],
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }

  // Carrega item pai. O recipiente do pai eh apenas um minimo de referencia:
  // a gerencia pode atribuir recipiente maior ou menor (a troca eh destacada, nao bloqueada).
  const { rows: parentRows } = await pool.query(
    `SELECT order_id, quantity FROM order_items
     WHERE id = $1 AND is_generic = true`,
    [parentItemId],
  )
  if (parentRows.length === 0) return { error: 'Item genérico não encontrado.' }
  const parent = parentRows[0]

  // Escopo do pedido (limite rigido): se houver especies permitidas, a atribuicao
  // so pode usar especies dessa lista.
  const { rows: scopeRows } = await pool.query(
    `SELECT species_id FROM order_item_allowed_species WHERE order_item_id = $1`,
    [parentItemId],
  )
  const allowedSpeciesIds = scopeRows.map((r) => r.species_id as string)

  const err = validateGenericAssignment(
    Number(parent.quantity),
    assignments,
    allowedSpeciesIds,
  )
  if (err) return { error: err }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM order_items WHERE parent_item_id = $1`, [
      parentItemId,
    ])
    for (const a of assignments) {
      await client.query(
        `INSERT INTO order_items
           (order_id, species_id, container_id, quantity, is_generic, parent_item_id, is_available)
         VALUES ($1, $2, $3, $4, false, $5, true)`,
        [parent.order_id, a.species_id, a.container_id, a.quantity, parentItemId],
      )
    }
    await client.query(`UPDATE order_items SET is_available = true WHERE id = $1`, [
      parentItemId,
    ])
    await client.query('COMMIT')
    revalidatePath(`${LIST_PATH}/${parent.order_id}`)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function finishVerification(
  orderId: string,
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }

  const { rows: items } = await pool.query(
    `SELECT is_generic, is_available
     FROM order_items
     WHERE order_id = $1 AND parent_item_id IS NULL`,
    [orderId],
  )
  if (items.length === 0) return { error: 'Pedido sem itens.' }
  if (items.some((i) => i.is_available === null)) {
    return { error: 'Ainda há itens não verificados.' }
  }

  const especificos = items.filter((i) => !i.is_generic)
  const disponiveis = especificos.filter((i) => i.is_available === true).length
  const genericosDef = items.filter(
    (i) => i.is_generic && i.is_available === true,
  ).length

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT status, order_number FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    const from = rows[0].status
    const orderNumber = rows[0].order_number
    await client.query(`UPDATE orders SET status = 'verificado' WHERE id = $1`, [
      orderId,
    ])
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'verificado', $3)`,
      [orderId, from, user.id],
    )
    await client.query('COMMIT')

    const parts = [`${disponiveis} de ${especificos.length} disponíveis`]
    if (genericosDef > 0) parts.push(`${genericosDef} genérico(s) definido(s)`)
    await notifyRole(
      'chefia',
      'pedido_verificado',
      `Pedido #${orderNumber} verificado`,
      parts.join(', '),
      `/pedidos/${orderId}`,
    )

    revalidatePath(`${LIST_PATH}/${orderId}`)
    revalidatePath(LIST_PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

// ============================================================
// T5.1 — Analise e fechamento (chefia)
// ============================================================

export async function approveOrder(
  orderId: string,
  needsInvoice: boolean,
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'chefia') {
    return { error: 'Sem permissão para aprovar pedidos.' }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT status, order_number, delivery_date, customer_id FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    if (rows[0].status !== 'verificado') {
      await client.query('ROLLBACK')
      return { error: 'Só é possível aprovar pedidos verificados.' }
    }

    // Gate fiscal (defesa em profundidade): so quando o pedido exige NF.
    // Pedido sem NF nunca dispara checagem — atrito zero no fluxo comum.
    if (needsInvoice) {
      const { rows: custRows } = await client.query(
        `SELECT name, person_type, document, email, legal_name, trade_name,
                state_registration, ie_exempt, zip_code, street, address_number,
                complement, neighborhood, city, state
         FROM customers WHERE id = $1`,
        [rows[0].customer_id],
      )
      const missing = custRows[0]
        ? getMissingFiscalFields(custRows[0] as FiscalCustomer)
        : ['cliente não encontrado']
      if (missing.length > 0) {
        await client.query('ROLLBACK')
        return { error: `Cliente sem dados de NF: ${missing.join(', ')}` }
      }
    }

    await client.query(
      `UPDATE orders SET status = 'aprovado', needs_invoice = $2 WHERE id = $1`,
      [orderId, needsInvoice],
    )
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
       VALUES ($1, 'verificado', 'aprovado', $2)`,
      [orderId, user.id],
    )
    await client.query('COMMIT')

    await notifyRole(
      'gerencia',
      'pedido_aprovado',
      `Pedido #${rows[0].order_number} aprovado`,
      `Separar até ${fmtDateBR(rows[0].delivery_date)}`,
      `/pedidos/${orderId}`,
    )
    revalidatePath(`${LIST_PATH}/${orderId}`)
    revalidatePath(LIST_PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function requestChanges(
  orderId: string,
  notes?: string,
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'chefia') {
    return { error: 'Sem permissão.' }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT status, order_number FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    if (rows[0].status !== 'verificado') {
      await client.query('ROLLBACK')
      return { error: 'Só pedidos verificados podem ir para alteração.' }
    }
    await client.query(
      `UPDATE orders SET status = 'pendente_alteracao' WHERE id = $1`,
      [orderId],
    )
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
       VALUES ($1, 'verificado', 'pendente_alteracao', $2, $3)`,
      [orderId, user.id, notes?.trim() || null],
    )
    await client.query('COMMIT')

    await notifyRole(
      'gerencia',
      'pedido_alterado',
      `Pedido #${rows[0].order_number} precisa de alterações`,
      notes?.trim() || 'A chefia solicitou ajustes.',
      `/pedidos/${orderId}`,
    )
    revalidatePath(`${LIST_PATH}/${orderId}`)
    revalidatePath(LIST_PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function approvePartial(
  orderId: string,
  keepItemIds: string[],
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'chefia') {
    return { error: 'Sem permissão.' }
  }
  if (!keepItemIds || keepItemIds.length === 0) {
    return { error: 'Mantenha ao menos um item para aprovar.' }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT status, order_number FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    if (rows[0].status !== 'verificado') {
      await client.query('ROLLBACK')
      return { error: 'Só é possível aprovar pedidos verificados.' }
    }
    // Remove itens de topo nao mantidos (filhos caem em cascata)
    const { rowCount } = await client.query(
      `DELETE FROM order_items
       WHERE order_id = $1 AND parent_item_id IS NULL AND id <> ALL($2::uuid[])`,
      [orderId, keepItemIds],
    )
    // Itens parciais mantidos sao ajustados para a quantidade/recipiente realmente disponivel.
    const { rowCount: adjusted } = await client.query(
      `UPDATE order_items
       SET quantity = available_quantity,
           container_id = COALESCE(available_container_id, container_id),
           is_available = true,
           available_quantity = NULL,
           available_container_id = NULL,
           availability_notes = NULL
       WHERE order_id = $1 AND parent_item_id IS NULL
         AND is_available = false AND available_quantity IS NOT NULL AND available_quantity > 0`,
      [orderId],
    )
    await client.query(`UPDATE orders SET status = 'aprovado' WHERE id = $1`, [
      orderId,
    ])
    const noteParts = [`${rowCount} item(ns) removido(s)`]
    if (adjusted && adjusted > 0) noteParts.push(`${adjusted} ajustado(s) p/ qtd disponível`)
    const partialNote = `Aprovação parcial: ${noteParts.join(', ')}.`
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
       VALUES ($1, 'verificado', 'aprovado', $2, $3)`,
      [orderId, user.id, partialNote],
    )
    await client.query('COMMIT')

    await notifyRole(
      'gerencia',
      'pedido_aprovado',
      `Pedido #${rows[0].order_number} aprovado (parcial)`,
      `${partialNote} Pronto para separar.`,
      `/pedidos/${orderId}`,
    )
    revalidatePath(`${LIST_PATH}/${orderId}`)
    revalidatePath(LIST_PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function updateOrderAfterReview(
  orderId: string,
  items: ReviewItemInput[],
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'chefia') {
    return { error: 'Sem permissão.' }
  }
  const itemsError = validateOrderItems(items)
  if (itemsError) return { error: itemsError }

  // Status a partir dos quais a chefia pode editar e devolver o pedido para verificacao.
  const EDITABLE_FROM = ['pendente_alteracao', 'verificado', 'aprovado', 'separando']

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: orderRows } = await client.query(
      `SELECT status, order_number, delivery_date FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (orderRows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    const fromStatus = orderRows[0].status as string
    if (!EDITABLE_FROM.includes(fromStatus)) {
      await client.query('ROLLBACK')
      return { error: 'Este pedido não pode ser editado no estado atual.' }
    }

    // Pedido ja aprovado/em separacao: so editavel ate a data de entrega; cargas sao descartadas.
    if (fromStatus === 'aprovado' || fromStatus === 'separando') {
      const delivery = orderRows[0].delivery_date
      if (delivery) {
        const d = new Date(delivery)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        d.setHours(0, 0, 0, 0)
        if (d.getTime() < today.getTime()) {
          await client.query('ROLLBACK')
          return { error: 'A data de entrega já passou — não é possível editar este pedido.' }
        }
      }
      // Descarta cargas (cascateia em order_load_items)
      await client.query(`DELETE FROM order_loads WHERE order_id = $1`, [orderId])
    }

    // Itens de topo atuais
    const { rows: current } = await client.query(
      `SELECT id, species_id, container_id, quantity, is_generic, specification
       FROM order_items WHERE order_id = $1 AND parent_item_id IS NULL`,
      [orderId],
    )
    const currentById = new Map<string, (typeof current)[number]>(
      current.map((c) => [c.id, c]),
    )
    // Escopo atual de cada item generico (para detectar mudanca de escopo).
    const currentScopeById = new Map<string, Set<string>>()
    const genericCurrentIds = current.filter((c) => c.is_generic).map((c) => c.id)
    if (genericCurrentIds.length > 0) {
      const { rows: curScope } = await client.query(
        `SELECT order_item_id, species_id FROM order_item_allowed_species
         WHERE order_item_id = ANY($1::uuid[])`,
        [genericCurrentIds],
      )
      for (const r of curScope) {
        const set = currentScopeById.get(r.order_item_id) ?? new Set<string>()
        set.add(r.species_id)
        currentScopeById.set(r.order_item_id, set)
      }
    }
    // Compara dois conjuntos de ids de especie (escopo) — true se diferem.
    const scopeChanged = (a: Set<string>, b: string[]): boolean => {
      const bSet = new Set(b)
      if (a.size !== bSet.size) return true
      for (const id of a) if (!bSet.has(id)) return true
      return false
    }
    const keptIds = new Set(items.filter((i) => i.id).map((i) => i.id as string))

    // Remove itens que sairam (cascade nos filhos)
    for (const c of current) {
      if (!keptIds.has(c.id)) {
        await client.query(`DELETE FROM order_items WHERE id = $1`, [c.id])
      }
    }

    for (const item of items) {
      const speciesId = item.is_generic ? null : item.species_id
      const specification = item.is_generic ? item.specification?.trim() || null : null
      const allowedIds = item.is_generic ? item.allowed_species_ids ?? [] : []
      if (item.id && currentById.has(item.id)) {
        const cur = currentById.get(item.id)!
        const curScope = currentScopeById.get(item.id) ?? new Set<string>()
        const changed =
          (cur.species_id ?? null) !== (speciesId ?? null) ||
          cur.container_id !== item.container_id ||
          Number(cur.quantity) !== Number(item.quantity) ||
          cur.is_generic !== item.is_generic ||
          (cur.specification ?? null) !== specification ||
          scopeChanged(curScope, allowedIds)
        if (changed) {
          await client.query(
            `UPDATE order_items
             SET species_id = $1, container_id = $2, quantity = $3, is_generic = $4,
                 specification = $5,
                 is_available = NULL, availability_notes = NULL,
                 available_quantity = NULL, available_container_id = NULL
             WHERE id = $6`,
            [speciesId, item.container_id, item.quantity, item.is_generic, specification, item.id],
          )
          // Composicao de generico invalidada — remove filhos
          await client.query(
            `DELETE FROM order_items WHERE parent_item_id = $1`,
            [item.id],
          )
          // Re-sincroniza o escopo (limpa o antigo e regrava o novo).
          await client.query(
            `DELETE FROM order_item_allowed_species WHERE order_item_id = $1`,
            [item.id],
          )
          if (item.is_generic) {
            await insertGenericScope(client, item.id, allowedIds)
          }
        }
      } else {
        // Novo item
        const { rows: newRows } = await client.query(
          `INSERT INTO order_items (order_id, species_id, container_id, quantity, is_generic, specification)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [orderId, speciesId, item.container_id, item.quantity, item.is_generic, specification],
        )
        if (item.is_generic) {
          await insertGenericScope(client, newRows[0].id, allowedIds)
        }
      }
    }

    await client.query(`UPDATE orders SET status = 'cadastrado' WHERE id = $1`, [
      orderId,
    ])
    const reviewNote =
      fromStatus === 'aprovado' || fromStatus === 'separando'
        ? 'Pedido editado após aprovação — cargas descartadas, volta para verificação'
        : 'Itens ajustados pela chefia'
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
       VALUES ($1, $2, 'cadastrado', $3, $4)`,
      [orderId, fromStatus, user.id, reviewNote],
    )
    await client.query('COMMIT')

    await notifyRole(
      'gerencia',
      'pedido_alterado',
      `Pedido #${orderRows[0].order_number} alterado`,
      'Verificar novamente os itens ajustados.',
      `/pedidos/${orderId}`,
    )
    revalidatePath(`${LIST_PATH}/${orderId}`)
    revalidatePath(LIST_PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

// ============================================================
// T6.1 — Cargas e separacao (gerencia)
// ============================================================

export interface LoadInput {
  items: { order_item_id: string; quantity: number }[]
}

// Itens "reais" do pedido = especificos e filhos de genericos (is_generic = false)
async function fetchRealItemQuantities(
  orderId: string,
): Promise<Record<string, number>> {
  const { rows } = await pool.query(
    `SELECT id, quantity FROM order_items
     WHERE order_id = $1 AND is_generic = false`,
    [orderId],
  )
  const map: Record<string, number> = {}
  for (const r of rows) map[r.id] = Number(r.quantity)
  return map
}

export async function createDefaultLoad(
  orderId: string,
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    if (rows[0].status !== 'aprovado') {
      await client.query('ROLLBACK')
      return { error: 'Só pedidos aprovados podem ser separados.' }
    }
    const { rows: loadRows } = await client.query(
      `INSERT INTO order_loads (order_id, load_number, status)
       VALUES ($1, 1, 'pendente') RETURNING id`,
      [orderId],
    )
    const loadId = loadRows[0].id
    const { rows: items } = await client.query(
      `SELECT id, quantity FROM order_items
       WHERE order_id = $1 AND is_generic = false`,
      [orderId],
    )
    if (items.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido sem itens para separar.' }
    }
    for (const it of items) {
      await client.query(
        `INSERT INTO order_load_items (load_id, order_item_id, quantity)
         VALUES ($1, $2, $3)`,
        [loadId, it.id, it.quantity],
      )
    }
    await client.query(`UPDATE orders SET status = 'separando' WHERE id = $1`, [
      orderId,
    ])
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
       VALUES ($1, 'aprovado', 'separando', $2)`,
      [orderId, user.id],
    )
    await client.query('COMMIT')
    revalidatePath(`${LIST_PATH}/${orderId}`)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function createMultipleLoads(
  orderId: string,
  loadsData: LoadInput[],
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }
  if (!loadsData || loadsData.length === 0) {
    return { error: 'Crie ao menos uma carga.' }
  }

  const original = await fetchRealItemQuantities(orderId)
  const splitError = validateLoadsSplit(original, loadsData)
  if (splitError) return { error: splitError }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    if (rows[0].status !== 'aprovado') {
      await client.query('ROLLBACK')
      return { error: 'Só pedidos aprovados podem ser separados.' }
    }
    let loadNumber = 0
    for (const load of loadsData) {
      const itemsWithQty = load.items.filter((i) => Number(i.quantity) > 0)
      if (itemsWithQty.length === 0) continue
      loadNumber += 1
      const { rows: loadRows } = await client.query(
        `INSERT INTO order_loads (order_id, load_number, status)
         VALUES ($1, $2, 'pendente') RETURNING id`,
        [orderId, loadNumber],
      )
      const loadId = loadRows[0].id
      for (const it of itemsWithQty) {
        await client.query(
          `INSERT INTO order_load_items (load_id, order_item_id, quantity)
           VALUES ($1, $2, $3)`,
          [loadId, it.order_item_id, it.quantity],
        )
      }
    }
    if (loadNumber === 0) {
      await client.query('ROLLBACK')
      return { error: 'Nenhuma carga com itens.' }
    }
    await client.query(`UPDATE orders SET status = 'separando' WHERE id = $1`, [
      orderId,
    ])
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
       VALUES ($1, 'aprovado', 'separando', $2, $3)`,
      [orderId, user.id, `Dividido em ${loadNumber} carga(s).`],
    )
    await client.query('COMMIT')
    revalidatePath(`${LIST_PATH}/${orderId}`)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function toggleLoadItemSeparated(
  loadItemId: string,
  isSeparated: boolean,
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }
  try {
    await pool.query(
      `UPDATE order_load_items SET is_separated = $1 WHERE id = $2`,
      [isSeparated, loadItemId],
    )
    return {}
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

export async function finishLoad(
  loadId: string,
): Promise<{ error?: string; orderReady?: boolean }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: loadRows } = await client.query(
      `SELECT order_id FROM order_loads WHERE id = $1 FOR UPDATE`,
      [loadId],
    )
    if (loadRows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Carga não encontrada.' }
    }
    const orderId = loadRows[0].order_id

    const { rows: pending } = await client.query(
      `SELECT COUNT(*)::int AS n FROM order_load_items
       WHERE load_id = $1 AND is_separated = false`,
      [loadId],
    )
    if (pending[0].n > 0) {
      await client.query('ROLLBACK')
      return { error: 'Ainda há itens não separados nesta carga.' }
    }

    await client.query(`UPDATE order_loads SET status = 'pronto' WHERE id = $1`, [
      loadId,
    ])

    // Todas as cargas do pedido prontas?
    const { rows: remaining } = await client.query(
      `SELECT COUNT(*)::int AS n FROM order_loads
       WHERE order_id = $1 AND status <> 'pronto'`,
      [orderId],
    )
    let orderReady = false
    let orderNumber: number | null = null
    if (remaining[0].n === 0) {
      const { rows: ord } = await client.query(
        `SELECT status, order_number FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      )
      const from = ord[0].status
      orderNumber = ord[0].order_number
      await client.query(
        `UPDATE orders SET status = 'pronto_envio' WHERE id = $1`,
        [orderId],
      )
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
         VALUES ($1, $2, 'pronto_envio', $3)`,
        [orderId, from, user.id],
      )
      orderReady = true
    }
    await client.query('COMMIT')

    if (orderReady && orderNumber !== null) {
      await notifyRole(
        'chefia',
        'pedido_pronto',
        `Pedido #${orderNumber} pronto para envio`,
        'Todas as cargas foram separadas.',
        `/pedidos/${orderId}`,
      )
    }
    revalidatePath(`${LIST_PATH}/${orderId}`)
    revalidatePath(LIST_PATH)
    return { orderReady }
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}

export async function getOrderLoads(orderId: string) {
  await requireRole('admin', 'chefia', 'gerencia')
  const { rows: loads } = await pool.query(
    `SELECT id, load_number, status FROM order_loads
     WHERE order_id = $1 ORDER BY load_number`,
    [orderId],
  )
  if (loads.length === 0) return []
  const loadIds = loads.map((l) => l.id)
  const { rows: items } = await pool.query(
    `SELECT li.id, li.load_id, li.order_item_id, li.quantity, li.is_separated,
            s.common_name AS species_name, s.photo_url AS species_photo, s.tags AS species_tags,
            ct.name AS container_name
     FROM order_load_items li
     JOIN order_items oi ON oi.id = li.order_item_id
     LEFT JOIN species s ON s.id = oi.species_id
     JOIN containers ct ON ct.id = oi.container_id
     WHERE li.load_id = ANY($1::uuid[])
     ORDER BY s.common_name`,
    [loadIds],
  )
  return loads.map((l) => ({
    ...l,
    items: items.filter((i) => i.load_id === l.id),
  }))
}

export async function getDeliveryCalendarData(startDate: string, endDate: string) {
  await requireRole('admin', 'chefia', 'gerencia')
  const { rows } = await pool.query(
    `SELECT o.id, o.order_number, o.delivery_date, o.status,
            c.name AS customer_name,
            COUNT(DISTINCT l.id) AS load_count,
            COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'pronto') AS ready_count
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     LEFT JOIN order_loads l ON l.order_id = o.id
     WHERE o.delivery_date BETWEEN $1 AND $2
       AND o.status IN ('aprovado', 'separando', 'pronto_envio')
     GROUP BY o.id, c.name
     ORDER BY o.delivery_date`,
    [startDate, endDate],
  )
  return rows
}
