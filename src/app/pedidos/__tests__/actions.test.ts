import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notifyRole: vi.fn() }))

import pool from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyRole } from '@/lib/notifications'
import {
  createOrder,
  createCustomer,
  toggleItemAvailability,
  assignSpeciesToGenericItem,
  finishVerification,
  approveOrder,
  requestChanges,
  approvePartial,
  updateOrderAfterReview,
  createDefaultLoad,
  createMultipleLoads,
  toggleLoadItemSeparated,
  finishLoad,
} from '../actions'
import type { CreateOrderInput, ReviewItemInput, SpeciesAssignment } from '@/lib/orders'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>
const mockedConnect = pool.connect as unknown as ReturnType<typeof vi.fn>
const mockedGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockedNotify = notifyRole as unknown as ReturnType<typeof vi.fn>

const chefia = { id: 'u1', username: 'gil', display_name: 'Gilberto', role: 'chefia' as const }
const gerencia = { id: 'u2', username: 'deb', display_name: 'Débora', role: 'gerencia' as const }

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

describe('toggleItemAvailability', () => {
  it('rejeita role sem permissao', async () => {
    mockedGetSession.mockResolvedValueOnce({ ...chefia, role: 'funcionario' })
    const result = await toggleItemAvailability('item1', true)
    expect(result.error).toMatch(/permissão/i)
  })

  it('atualiza disponibilidade', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery.mockResolvedValueOnce({})
    const result = await toggleItemAvailability('item1', true, 'só tem 300')
    expect(result.error).toBeUndefined()
    expect(mockedQuery).toHaveBeenCalled()
  })
})

describe('assignSpeciesToGenericItem', () => {
  const assignments: SpeciesAssignment[] = [
    { species_id: 's1', container_id: 'c1', quantity: 300 },
    { species_id: 's2', container_id: 'c1', quantity: 200 },
  ]

  it('rejeita item generico inexistente', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery.mockResolvedValueOnce({ rows: [] }) // SELECT parent
    const result = await assignSpeciesToGenericItem('p1', assignments)
    expect(result.error).toMatch(/não encontrado/i)
  })

  it('rejeita quando a soma nao bate com o total', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ order_id: 'o1', quantity: 999, min_volume: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'c1', volume_liters: 1 }] })
    const result = await assignSpeciesToGenericItem('p1', assignments)
    expect(result.error).toMatch(/soma/i)
  })

  it('salva atribuicao valida em transacao', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ order_id: 'o1', quantity: 500, min_volume: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'c1', volume_liters: 1 }] })
    const clientQuery = vi.fn().mockResolvedValue({})
    const release = vi.fn()
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release })

    const result = await assignSpeciesToGenericItem('p1', assignments)
    expect(result.error).toBeUndefined()
    expect(clientQuery).toHaveBeenCalledWith('COMMIT')
    expect(release).toHaveBeenCalled()
  })
})

describe('finishVerification', () => {
  it('rejeita quando ha itens nao verificados', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { is_generic: false, is_available: true },
        { is_generic: false, is_available: null },
      ],
    })
    const result = await finishVerification('o1')
    expect(result.error).toMatch(/não verificados/i)
  })

  it('finaliza e notifica chefia', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { is_generic: false, is_available: true },
        { is_generic: true, is_available: true },
      ],
    })
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'verificando_disponibilidade', order_number: 47 }] })
      .mockResolvedValue({}) // UPDATE, INSERT, COMMIT
    const release = vi.fn()
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release })

    const result = await finishVerification('o1')
    expect(result.error).toBeUndefined()
    expect(mockedNotify).toHaveBeenCalledWith(
      'chefia',
      'pedido_verificado',
      expect.stringContaining('#47'),
      expect.any(String),
      '/pedidos/o1',
    )
    expect(release).toHaveBeenCalled()
  })
})

describe('approveOrder', () => {
  it('rejeita pedido que nao esta verificado', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'cadastrado', order_number: 47, delivery_date: null }] })
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await approveOrder('o1')
    expect(result.error).toMatch(/verificados/i)
  })

  it('aprova e notifica gerencia', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'verificado', order_number: 47, delivery_date: '2026-06-15' }] })
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await approveOrder('o1')
    expect(result.error).toBeUndefined()
    expect(mockedNotify).toHaveBeenCalledWith(
      'gerencia',
      'pedido_aprovado',
      expect.stringContaining('#47'),
      expect.any(String),
      '/pedidos/o1',
    )
  })
})

describe('requestChanges', () => {
  it('move para pendente_alteracao e notifica gerencia', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'verificado', order_number: 47 }] })
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await requestChanges('o1', 'trocar ipê por cedro')
    expect(result.error).toBeUndefined()
    expect(mockedNotify).toHaveBeenCalledWith(
      'gerencia',
      'pedido_alterado',
      expect.stringContaining('#47'),
      expect.any(String),
      '/pedidos/o1',
    )
  })
})

describe('approvePartial', () => {
  it('rejeita lista vazia de itens mantidos', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const result = await approvePartial('o1', [])
    expect(result.error).toMatch(/ao menos um item/i)
  })

  it('remove indisponiveis e aprova', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'verificado', order_number: 47 }] })
      .mockResolvedValueOnce({ rowCount: 2 }) // DELETE
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await approvePartial('o1', ['keep1', 'keep2'])
    expect(result.error).toBeUndefined()
    expect(mockedNotify).toHaveBeenCalledWith(
      'gerencia',
      'pedido_aprovado',
      expect.stringContaining('parcial'),
      expect.any(String),
      '/pedidos/o1',
    )
  })
})

describe('updateOrderAfterReview', () => {
  const items: ReviewItemInput[] = [
    { id: 'i1', species_id: 's1', container_id: 'c1', quantity: 10, is_generic: false },
  ]

  it('rejeita quando nao esta pendente_alteracao', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'cadastrado', order_number: 47 }] })
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await updateOrderAfterReview('o1', items)
    expect(result.error).toMatch(/pendentes de alteração/i)
  })

  it('atualiza itens e devolve para verificacao', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'pendente_alteracao', order_number: 47 }] }) // SELECT order
      .mockResolvedValueOnce({
        rows: [{ id: 'i1', species_id: 's1', container_id: 'c1', quantity: 10, is_generic: false }],
      }) // SELECT current items (i1 inalterado)
      .mockResolvedValue({}) // UPDATE orders, INSERT history, COMMIT
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await updateOrderAfterReview('o1', items)
    expect(result.error).toBeUndefined()
    expect(mockedNotify).toHaveBeenCalledWith(
      'gerencia',
      'pedido_alterado',
      expect.stringContaining('#47'),
      expect.any(String),
      '/pedidos/o1',
    )
  })
})

describe('createDefaultLoad', () => {
  it('rejeita pedido nao aprovado', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'cadastrado' }] })
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await createDefaultLoad('o1')
    expect(result.error).toMatch(/aprovados/i)
  })

  it('cria carga unica com todos os itens', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'aprovado' }] }) // SELECT status
      .mockResolvedValueOnce({ rows: [{ id: 'l1' }] }) // INSERT load
      .mockResolvedValueOnce({ rows: [{ id: 'i1', quantity: 10 }] }) // SELECT items
      .mockResolvedValue({}) // INSERT load_item, UPDATE, INSERT history, COMMIT
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await createDefaultLoad('o1')
    expect(result.error).toBeUndefined()
    expect(clientQuery).toHaveBeenCalledWith('COMMIT')
  })
})

describe('createMultipleLoads', () => {
  it('rejeita divisao que nao soma o total', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'i1', quantity: 500 }] }) // fetchRealItemQuantities
    const result = await createMultipleLoads('o1', [
      { items: [{ order_item_id: 'i1', quantity: 300 }] },
    ])
    expect(result.error).toMatch(/não bate/i)
  })
})

describe('toggleLoadItemSeparated', () => {
  it('atualiza item da carga', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery.mockResolvedValueOnce({})
    const result = await toggleLoadItemSeparated('li1', true)
    expect(result.error).toBeUndefined()
  })
})

describe('finishLoad', () => {
  it('rejeita carga com itens pendentes', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ order_id: 'o1' }] }) // SELECT order_id
      .mockResolvedValueOnce({ rows: [{ n: 2 }] }) // pending > 0
      .mockResolvedValue({}) // ROLLBACK
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await finishLoad('l1')
    expect(result.error).toMatch(/não separados/i)
  })

  it('finaliza ultima carga e marca pedido pronto', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ order_id: 'o1' }] }) // SELECT order_id
      .mockResolvedValueOnce({ rows: [{ n: 0 }] }) // pending = 0
      .mockResolvedValueOnce({}) // UPDATE load pronto
      .mockResolvedValueOnce({ rows: [{ n: 0 }] }) // remaining loads = 0
      .mockResolvedValueOnce({ rows: [{ status: 'separando', order_number: 47 }] }) // SELECT order
      .mockResolvedValue({}) // UPDATE orders, INSERT history, COMMIT
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await finishLoad('l1')
    expect(result.error).toBeUndefined()
    expect(result.orderReady).toBe(true)
    expect(mockedNotify).toHaveBeenCalledWith(
      'chefia',
      'pedido_pronto',
      expect.stringContaining('#47'),
      expect.any(String),
      '/pedidos/o1',
    )
  })
})
