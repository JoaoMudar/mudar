'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyRole } from '@/lib/notifications'
import {
  validateOrderItems,
  validateGenericAssignment,
  validateLoadsSplit,
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

// ============================================================
// T3.1 — Clientes
// ============================================================

export interface CustomerInput {
  name: string
  phone?: string
  city?: string
  state?: string
  notes?: string
}

export async function getCustomers() {
  const { rows } = await pool.query(
    `SELECT id, name, phone, city, state, notes, active
     FROM customers WHERE active = true ORDER BY name`,
  )
  return rows
}

export async function searchCustomers(query: string) {
  const q = (query ?? '').trim()
  if (!q) return []
  const { rows } = await pool.query(
    `SELECT id, name, phone, city, state
     FROM customers
     WHERE active = true AND name ILIKE $1
     ORDER BY name LIMIT 10`,
    [`%${q}%`],
  )
  return rows
}

export async function createCustomer(
  data: CustomerInput,
): Promise<{ id?: string; error?: string }> {
  const name = (data.name ?? '').trim()
  if (!name) return { error: 'Nome do cliente é obrigatório.' }
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (name, phone, city, state, notes)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'SC'))
       RETURNING id`,
      [
        name,
        data.phone?.trim() || null,
        data.city?.trim() || null,
        data.notes?.trim() || null,
        data.state?.trim() || null,
      ],
    )
    revalidatePath(LIST_PATH)
    return { id: rows[0].id }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

// ============================================================
// T3.2 — Pedidos
// ============================================================

export async function getSpeciesForSelect() {
  const { rows } = await pool.query(
    `SELECT id, common_name, photo_url
     FROM species WHERE active = true ORDER BY common_name`,
  )
  return rows
}

export async function getContainersForSelect() {
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

export async function getOrderById(id: string) {
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
            s.common_name AS species_name, s.photo_url AS species_photo,
            ct.name AS container_name, ct.volume_liters AS container_volume
     FROM order_items oi
     LEFT JOIN species s ON s.id = oi.species_id
     JOIN containers ct ON ct.id = oi.container_id
     WHERE oi.order_id = $1
     ORDER BY oi.is_generic DESC, oi.created_at`,
    [id],
  )

  // Monta arvore: itens de topo + filhos (de genericos)
  const children = itemRows.filter((i) => i.parent_item_id)
  const topLevel = itemRows
    .filter((i) => !i.parent_item_id)
    .map((i) => ({
      ...i,
      children: children.filter((c) => c.parent_item_id === i.id),
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
      await client.query(
        `INSERT INTO order_items (order_id, species_id, container_id, quantity, is_generic)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          order.id,
          item.is_generic ? null : item.species_id,
          item.container_id,
          item.quantity,
          item.is_generic,
        ],
      )
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
      await client.query(
        `INSERT INTO order_items (order_id, species_id, container_id, quantity, is_generic)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          orderId,
          item.is_generic ? null : item.species_id,
          item.container_id,
          item.quantity,
          item.is_generic,
        ],
      )
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
  isAvailable: boolean,
  notes?: string,
): Promise<{ error?: string }> {
  const user = await getSession()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (user.role !== 'admin' && user.role !== 'gerencia') {
    return { error: 'Sem permissão.' }
  }
  try {
    await pool.query(
      `UPDATE order_items SET is_available = $1, availability_notes = $2 WHERE id = $3`,
      [isAvailable, notes?.trim() || null, itemId],
    )
    return {}
  } catch (e: unknown) {
    return { error: (e as Error).message }
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

  // Carrega item pai e volume minimo do recipiente
  const { rows: parentRows } = await pool.query(
    `SELECT oi.order_id, oi.quantity, ct.volume_liters AS min_volume
     FROM order_items oi
     JOIN containers ct ON ct.id = oi.container_id
     WHERE oi.id = $1 AND oi.is_generic = true`,
    [parentItemId],
  )
  if (parentRows.length === 0) return { error: 'Item genérico não encontrado.' }
  const parent = parentRows[0]

  // Volumes dos recipientes escolhidos
  const containerIds = [...new Set(assignments.map((a) => a.container_id))]
  const volumes: Record<string, number | null> = {}
  if (containerIds.length > 0) {
    const { rows: volRows } = await pool.query(
      `SELECT id, volume_liters FROM containers WHERE id = ANY($1::uuid[])`,
      [containerIds],
    )
    for (const r of volRows) {
      volumes[r.id] = r.volume_liters === null ? null : Number(r.volume_liters)
    }
  }
  const minVol = parent.min_volume === null ? 0 : Number(parent.min_volume)
  const err = validateGenericAssignment(
    Number(parent.quantity),
    minVol,
    assignments,
    volumes,
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
      `SELECT status, order_number, delivery_date FROM orders WHERE id = $1 FOR UPDATE`,
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
    await client.query(`UPDATE orders SET status = 'aprovado' WHERE id = $1`, [
      orderId,
    ])
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
    await client.query(`UPDATE orders SET status = 'aprovado' WHERE id = $1`, [
      orderId,
    ])
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
       VALUES ($1, 'verificado', 'aprovado', $2, $3)`,
      [orderId, user.id, `Aprovação parcial: ${rowCount} item(ns) removido(s).`],
    )
    await client.query('COMMIT')

    await notifyRole(
      'gerencia',
      'pedido_aprovado',
      `Pedido #${rows[0].order_number} aprovado (parcial)`,
      `${rowCount} item(ns) removido(s). Pronto para separar.`,
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

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: orderRows } = await client.query(
      `SELECT status, order_number FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (orderRows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Pedido não encontrado.' }
    }
    if (orderRows[0].status !== 'pendente_alteracao') {
      await client.query('ROLLBACK')
      return { error: 'Só pedidos pendentes de alteração podem ser editados aqui.' }
    }

    // Itens de topo atuais
    const { rows: current } = await client.query(
      `SELECT id, species_id, container_id, quantity, is_generic
       FROM order_items WHERE order_id = $1 AND parent_item_id IS NULL`,
      [orderId],
    )
    const currentById = new Map<string, (typeof current)[number]>(
      current.map((c) => [c.id, c]),
    )
    const keptIds = new Set(items.filter((i) => i.id).map((i) => i.id as string))

    // Remove itens que sairam (cascade nos filhos)
    for (const c of current) {
      if (!keptIds.has(c.id)) {
        await client.query(`DELETE FROM order_items WHERE id = $1`, [c.id])
      }
    }

    for (const item of items) {
      const speciesId = item.is_generic ? null : item.species_id
      if (item.id && currentById.has(item.id)) {
        const cur = currentById.get(item.id)!
        const changed =
          (cur.species_id ?? null) !== (speciesId ?? null) ||
          cur.container_id !== item.container_id ||
          Number(cur.quantity) !== Number(item.quantity) ||
          cur.is_generic !== item.is_generic
        if (changed) {
          await client.query(
            `UPDATE order_items
             SET species_id = $1, container_id = $2, quantity = $3, is_generic = $4,
                 is_available = NULL, availability_notes = NULL
             WHERE id = $5`,
            [speciesId, item.container_id, item.quantity, item.is_generic, item.id],
          )
          // Composicao de generico invalidada — remove filhos
          await client.query(
            `DELETE FROM order_items WHERE parent_item_id = $1`,
            [item.id],
          )
        }
      } else {
        // Novo item
        await client.query(
          `INSERT INTO order_items (order_id, species_id, container_id, quantity, is_generic)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, speciesId, item.container_id, item.quantity, item.is_generic],
        )
      }
    }

    await client.query(`UPDATE orders SET status = 'cadastrado' WHERE id = $1`, [
      orderId,
    ])
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
       VALUES ($1, 'pendente_alteracao', 'cadastrado', $2, 'Itens ajustados pela chefia')`,
      [orderId, user.id],
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
  const { rows: loads } = await pool.query(
    `SELECT id, load_number, status FROM order_loads
     WHERE order_id = $1 ORDER BY load_number`,
    [orderId],
  )
  if (loads.length === 0) return []
  const loadIds = loads.map((l) => l.id)
  const { rows: items } = await pool.query(
    `SELECT li.id, li.load_id, li.order_item_id, li.quantity, li.is_separated,
            s.common_name AS species_name, s.photo_url AS species_photo,
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
