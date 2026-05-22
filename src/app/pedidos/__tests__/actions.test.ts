import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notifyRole: vi.fn() }))

import pool from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyRole } from '@/lib/notifications'
import { createOrder, createCustomer } from '../actions'
import type { CreateOrderInput } from '@/lib/orders'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>
const mockedConnect = pool.connect as unknown as ReturnType<typeof vi.fn>
const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockedNotify = notifyRole as unknown as ReturnType<typeof vi.fn>

const chefia = { id: 'u1', username: 'gil', display_name: 'Gilberto', role: 'chefia' as const }

function validOrder(): CreateOrderInput {
  return {
    customer_id: 'cust1',
    sale_channel: 'atacado',
    delivery_date: null,
    notes: '',
    items: [{ species_id: 's1', container_id: 'c1', quantity: 10, is_generic: false }],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createCustomer', () => {
  it('rejeita nome vazio', async () => {
    const result = await createCustomer({ name: '   ' })
    expect(result.error).toMatch(/obrigatório/i)
  })

  it('cria cliente e retorna id', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'new-id' }] })
    const result = await createCustomer({ name: 'João' })
    expect(result.id).toBe('new-id')
    expect(result.error).toBeUndefined()
  })
})

describe('createOrder — guards', () => {
  it('rejeita sem sessao', async () => {
    mockedGetSession.mockResolvedValueOnce(null)
    const result = await createOrder(validOrder())
    expect(result.error).toMatch(/sessão/i)
  })

  it('rejeita role sem permissao', async () => {
    mockedGetSession.mockResolvedValueOnce({ ...chefia, role: 'funcionario' })
    const result = await createOrder(validOrder())
    expect(result.error).toMatch(/permissão/i)
  })

  it('rejeita sem cliente', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const result = await createOrder({ ...validOrder(), customer_id: '' })
    expect(result.error).toMatch(/cliente/i)
  })

  it('rejeita itens invalidos', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const result = await createOrder({ ...validOrder(), items: [] })
    expect(result.error).toMatch(/pelo menos um item/i)
  })
})

describe('createOrder — caminho feliz', () => {
  it('cria pedido em transacao e notifica gerencia', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)

    const clientQuery = vi
      .fn()
      // BEGIN
      .mockResolvedValueOnce({})
      // INSERT orders RETURNING
      .mockResolvedValueOnce({ rows: [{ id: 'order1', order_number: 47 }] })
      // INSERT order_items
      .mockResolvedValueOnce({})
      // INSERT status history
      .mockResolvedValueOnce({})
      // COMMIT
      .mockResolvedValueOnce({})
    const release = vi.fn()
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release })

    // SELECT customer name (via pool.query, fora da transacao)
    mockedQuery.mockResolvedValueOnce({ rows: [{ name: 'João da Silva' }] })

    const result = await createOrder(validOrder())

    expect(result.error).toBeUndefined()
    expect(result.order_number).toBe(47)
    expect(result.id).toBe('order1')
    expect(release).toHaveBeenCalled()
    expect(mockedNotify).toHaveBeenCalledWith(
      'gerencia',
      'novo_pedido',
      expect.stringContaining('#47'),
      expect.any(String),
      '/pedidos/order1',
    )
  })

  it('faz rollback em caso de erro', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('falha no insert')) // INSERT orders
      .mockResolvedValue({}) // ROLLBACK
    const release = vi.fn()
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release })

    const result = await createOrder(validOrder())
    expect(result.error).toMatch(/falha no insert/i)
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK')
    expect(release).toHaveBeenCalled()
  })
})
