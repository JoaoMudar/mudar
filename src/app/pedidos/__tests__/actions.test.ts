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
  getOrdersSignal,
  toggleItemAvailability,
  saveVerificationNotes,
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

describe('getOrdersSignal', () => {
  it('nega acesso sem permissao (sem tocar o banco)', async () => {
    mockedGetSession.mockResolvedValueOnce({ ...chefia, role: 'colaborador' })
    const sig = await getOrdersSignal()
    expect(sig).toEqual({ count: 0, latest: null })
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('retorna contagem e o created_at mais recente em ISO', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    const latest = new Date('2026-05-26T12:00:00Z')
    mockedQuery.mockResolvedValueOnce({ rows: [{ count: 7, latest }] })
    const sig = await getOrdersSignal()
    expect(sig.count).toBe(7)
    expect(sig.latest).toBe('2026-05-26T12:00:00.000Z')
    expect(mockedQuery.mock.calls[0][0]).toContain('FROM orders')
  })

  it('sem pedidos retorna count 0 e latest null', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery.mockResolvedValueOnce({ rows: [{ count: 0, latest: null }] })
    const sig = await getOrdersSignal()
    expect(sig).toEqual({ count: 0, latest: null })
  })
})

describe('createOrder — guards', () => {
  it('rejeita sem sessao', async () => {
    mockedGetSession.mockResolvedValueOnce(null)
    const result = await createOrder(validOrder())
    expect(result.error).toMatch(/sessão/i)
  })

  it('rejeita role sem permissao', async () => {
    mockedGetSession.mockResolvedValueOnce({ ...chefia, role: 'colaborador' })
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
    mockedGetSession.mockResolvedValueOnce({ ...chefia, role: 'colaborador' })
    const result = await toggleItemAvailability('item1', 'disponivel')
    expect(result.error).toMatch(/permissão/i)
  })

  it('atualiza disponibilidade total', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ quantity: 25 }] }) // SELECT quantity
      .mockResolvedValueOnce({}) // UPDATE
    const result = await toggleItemAvailability('item1', 'disponivel', { notes: 'ok' })
    expect(result.error).toBeUndefined()
    expect(mockedQuery).toHaveBeenCalledTimes(2)
  })

  it('persiste parcial com quantidade e recipiente', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ quantity: 25 }] }) // SELECT quantity
      .mockResolvedValueOnce({}) // UPDATE
    const result = await toggleItemAvailability('item1', 'parcial', {
      availableQuantity: 15,
      availableContainerId: 'c2',
    })
    expect(result.error).toBeUndefined()
    // UPDATE recebe is_available=false, available_quantity=15, available_container_id='c2'
    const updateCall = mockedQuery.mock.calls[1]
    expect(updateCall[1]).toEqual([false, 15, 'c2', null, 'item1'])
  })

  it('rejeita parcial sem recipiente', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery.mockResolvedValueOnce({ rows: [{ quantity: 25 }] }) // SELECT quantity
    const result = await toggleItemAvailability('item1', 'parcial', { availableQuantity: 15 })
    expect(result.error).toMatch(/recipiente/i)
  })
})

describe('saveVerificationNotes', () => {
  it('nega sem permissao sem tocar o banco', async () => {
    mockedGetSession.mockResolvedValueOnce({ ...chefia, role: 'colaborador' })
    const result = await saveVerificationNotes('o1', [{ itemId: 'i1', notes: 'x' }])
    expect(result.error).toMatch(/permissão/i)
    expect(mockedConnect).not.toHaveBeenCalled()
  })

  it('persiste observacoes (trim/null) com order_id correto', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    const clientQuery = vi.fn().mockResolvedValue({})
    const release = vi.fn()
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release })

    const result = await saveVerificationNotes('o1', [
      { itemId: 'i1', notes: '  checar fornecedor  ' },
      { itemId: 'i2', notes: '   ' },
    ])
    expect(result.error).toBeUndefined()

    const updates = clientQuery.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE order_items SET availability_notes'),
    )
    expect(updates).toHaveLength(2)
    // nota com espacos -> trim; escopo por order_id
    expect(updates[0][1]).toEqual(['checar fornecedor', 'i1', 'o1'])
    // nota so com espacos -> null
    expect(updates[1][1]).toEqual([null, 'i2', 'o1'])
    expect(release).toHaveBeenCalled()
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
      .mockResolvedValueOnce({ rows: [{ order_id: 'o1', quantity: 999 }] }) // SELECT parent
      .mockResolvedValueOnce({ rows: [] }) // SELECT escopo (sem restricao)
    const result = await assignSpeciesToGenericItem('p1', assignments)
    expect(result.error).toMatch(/soma/i)
  })

  it('aceita recipiente diferente do minimo (sem bloqueio por volume)', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ order_id: 'o1', quantity: 500 }] }) // SELECT parent
      .mockResolvedValueOnce({ rows: [] }) // SELECT escopo (sem restricao)
    const clientQuery = vi.fn().mockResolvedValue({})
    const release = vi.fn()
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release })

    const result = await assignSpeciesToGenericItem('p1', assignments)
    expect(result.error).toBeUndefined()
    expect(clientQuery).toHaveBeenCalledWith('COMMIT')
    expect(release).toHaveBeenCalled()
  })

  it('rejeita especie fora do escopo do pedido (limite rigido)', async () => {
    mockedGetSession.mockResolvedValueOnce(gerencia)
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ order_id: 'o1', quantity: 500 }] }) // SELECT parent
      .mockResolvedValueOnce({ rows: [{ species_id: 's1' }] }) // SELECT escopo: so s1 permitida
    // assignments inclui s2, que esta fora do escopo
    const result = await assignSpeciesToGenericItem('p1', assignments)
    expect(result.error).toMatch(/fora do escopo/i)
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
  // Cliente fiscalmente completo (PF) para o gate de NF.
  const completeCustomer = {
    name: 'João', person_type: 'pf', document: '11144477735', email: 'j@x.com',
    legal_name: null, trade_name: null, state_registration: null, ie_exempt: false,
    zip_code: '89160000', street: 'Rua A', address_number: '1', complement: null,
    neighborhood: 'Centro', city: 'Rio do Sul', state: 'SC',
  }

  it('rejeita pedido que nao esta verificado', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'cadastrado', order_number: 47, delivery_date: null, customer_id: 'c1' }] })
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await approveOrder('o1', false)
    expect(result.error).toMatch(/verificados/i)
  })

  it('aprova SEM NF sem nenhuma checagem fiscal e grava needs_invoice=false', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'verificado', order_number: 47, delivery_date: '2026-06-15', customer_id: 'c1' }] })
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await approveOrder('o1', false)
    expect(result.error).toBeUndefined()
    // Nenhuma query de cliente (gate fiscal nao roda sem NF)
    const customerSelect = clientQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('FROM customers'),
    )
    expect(customerSelect).toBeUndefined()
    // UPDATE grava needs_invoice = false
    const update = clientQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE orders SET status'),
    )
    expect(update?.[1]).toEqual(['o1', false])
    expect(mockedNotify).toHaveBeenCalledWith(
      'gerencia',
      'pedido_aprovado',
      expect.stringContaining('#47'),
      expect.any(String),
      '/pedidos/o1',
    )
  })

  it('aprova COM NF quando o cliente esta completo e grava needs_invoice=true', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'verificado', order_number: 47, delivery_date: '2026-06-15', customer_id: 'c1' }] })
      .mockResolvedValueOnce({ rows: [completeCustomer] }) // SELECT customer
      .mockResolvedValue({}) // UPDATE, INSERT, COMMIT
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await approveOrder('o1', true)
    expect(result.error).toBeUndefined()
    const update = clientQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE orders SET status'),
    )
    expect(update?.[1]).toEqual(['o1', true])
  })

  it('bloqueia NF quando o cliente esta incompleto e lista campos faltantes', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const incomplete = { ...completeCustomer, person_type: null, document: null, email: null }
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'verificado', order_number: 47, delivery_date: null, customer_id: 'c1' }] })
      .mockResolvedValueOnce({ rows: [incomplete] }) // SELECT customer
      .mockResolvedValue({}) // ROLLBACK
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await approveOrder('o1', true)
    expect(result.error).toMatch(/Cliente sem dados de NF/i)
    // Nao deve aprovar — rollback, sem UPDATE de status
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK')
    const update = clientQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE orders SET status'),
    )
    expect(update).toBeUndefined()
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
      .mockResolvedValueOnce({ rowCount: 2 }) // DELETE itens nao mantidos
      .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE ajuste de parciais
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

  it('ajusta itens parciais para a quantidade disponivel ao aprovar', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'verificado', order_number: 47 }] })
      .mockResolvedValueOnce({ rowCount: 0 }) // DELETE (nada removido)
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE ajustou 1 parcial
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await approvePartial('o1', ['keep1'])
    expect(result.error).toBeUndefined()
    // A nota de historico deve mencionar o ajuste de parcial
    const historyInsert = clientQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('order_status_history'),
    )
    expect(historyInsert?.[1]?.[2]).toMatch(/ajustado/i)
  })
})

describe('updateOrderAfterReview', () => {
  const items: ReviewItemInput[] = [
    { id: 'i1', species_id: 's1', container_id: 'c1', quantity: 10, is_generic: false },
  ]

  it('rejeita edicao em estado nao editavel (ex: pronto_envio)', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'pronto_envio', order_number: 47, delivery_date: null }] })
      .mockResolvedValue({})
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await updateOrderAfterReview('o1', items)
    expect(result.error).toMatch(/não pode ser editado/i)
  })

  it('atualiza itens e devolve para verificacao', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ status: 'pendente_alteracao', order_number: 47, delivery_date: null }],
      }) // SELECT order
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

  it('editar pedido aprovado descarta cargas e volta para verificacao', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const future = new Date()
    future.setDate(future.getDate() + 5)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ status: 'aprovado', order_number: 47, delivery_date: future.toISOString() }],
      }) // SELECT order
      .mockResolvedValueOnce({}) // DELETE order_loads
      .mockResolvedValueOnce({
        rows: [{ id: 'i1', species_id: 's1', container_id: 'c1', quantity: 10, is_generic: false }],
      }) // SELECT current items
      .mockResolvedValue({}) // UPDATE orders, INSERT history, COMMIT
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await updateOrderAfterReview('o1', items)
    expect(result.error).toBeUndefined()
    // cargas descartadas
    const deletedLoads = clientQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('DELETE FROM order_loads'),
    )
    expect(deletedLoads).toBeTruthy()
  })

  it('bloqueia edicao de pedido aprovado quando a data de entrega passou', async () => {
    mockedGetSession.mockResolvedValueOnce(chefia)
    const past = new Date()
    past.setDate(past.getDate() - 2)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ status: 'aprovado', order_number: 47, delivery_date: past.toISOString() }],
      }) // SELECT order
      .mockResolvedValue({}) // ROLLBACK
    mockedConnect.mockResolvedValueOnce({ query: clientQuery, release: vi.fn() })
    const result = await updateOrderAfterReview('o1', items)
    expect(result.error).toMatch(/data de entrega/i)
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
