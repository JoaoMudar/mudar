import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn().mockResolvedValue({ id: 'u1', display_name: 'Joao', role: 'admin' }),
}))

import pool from '@/lib/db'
import {
  createQuoteRequests,
  markQuoteSent,
  markQuoteNoReply,
  recordQuoteResponse,
  saveQuoteChoices,
} from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>
const mockedConnect = pool.connect as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

const ITEMS = [
  { species_id: 'sp-ipe', quantity: 500, size: '30-50cm' },
  { species_id: 'sp-arau', quantity: 200, size: null },
]
const SUPPLIERS = [
  { supplier_id: 's1', message_text: 'Olá, Viveiro A...' },
  { supplier_id: 's2', message_text: 'Olá, Viveiro B...', channel: 'manual' as const },
]

describe('createQuoteRequests', () => {
  function mockClient(impl?: (sql: string) => Promise<unknown> | null) {
    let quoteSeq = 0
    const client = {
      query: vi.fn().mockImplementation((sql: string) => {
        const custom = impl?.(sql)
        if (custom) return custom
        if (sql.includes('INSERT INTO supplier_quotes')) {
          quoteSeq += 1
          return Promise.resolve({ rows: [{ id: `q${quoteSeq}` }] })
        }
        return Promise.resolve({ rows: [] })
      }),
      release: vi.fn(),
    }
    mockedConnect.mockResolvedValue(client)
    return client
  }

  it('cria uma cotacao por fornecedor (mesmo grupo) com os itens, em transacao', async () => {
    const client = mockClient()
    const result = await createQuoteRequests({ orderId: 'o1', items: ITEMS, suppliers: SUPPLIERS })
    expect(result.error).toBeUndefined()
    expect(result.requestGroupId).toBeTruthy()
    expect(result.quotes).toEqual([
      { id: 'q1', supplier_id: 's1' },
      { id: 'q2', supplier_id: 's2' },
    ])

    const calls = client.query.mock.calls
    const sqls = calls.map((c: unknown[]) => c[0] as string)
    expect(sqls[0]).toBe('BEGIN')
    expect(sqls[sqls.length - 1]).toBe('COMMIT')
    expect(sqls.filter((s) => s.includes('INSERT INTO supplier_quotes'))).toHaveLength(2)
    expect(sqls.filter((s) => s.includes('INSERT INTO supplier_quote_items'))).toHaveLength(4)

    // created_by = usuario logado; mesmo request_group_id nas duas cotacoes.
    const quoteCalls = calls.filter((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO supplier_quotes'),
    )
    const binds1 = quoteCalls[0][1] as unknown[]
    const binds2 = quoteCalls[1][1] as unknown[]
    expect(binds1[5]).toBe('u1')
    expect(binds1[0]).toBe(binds2[0])
    // canal invalido/ausente vira whatsapp; manual e preservado.
    expect(binds1[3]).toBe('whatsapp')
    expect(binds2[3]).toBe('manual')
    expect(client.release).toHaveBeenCalled()
  })

  it('BLOQUEIA fornecedor do_not_contact/arquivado revalidando no servidor', async () => {
    const client = mockClient((sql) => {
      if (sql.includes(`'do_not_contact'`)) {
        return Promise.resolve({ rows: [{ name: 'Viveiro Banido' }] })
      }
      return null
    })
    const result = await createQuoteRequests({ items: ITEMS, suppliers: SUPPLIERS })
    expect(result.error).toContain('Viveiro Banido')
    const sqls = client.query.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls).toContain('ROLLBACK')
    expect(sqls.some((s) => s.includes('INSERT INTO supplier_quotes'))).toBe(false)
  })

  it('faz ROLLBACK quando um INSERT falha', async () => {
    const client = mockClient((sql) => {
      if (sql.includes('INSERT INTO supplier_quote_items')) {
        return Promise.reject(new Error('boom'))
      }
      return null
    })
    const result = await createQuoteRequests({ items: ITEMS, suppliers: SUPPLIERS })
    expect(result.error).toBeTruthy()
    const sqls = client.query.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls).toContain('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })

  it('valida itens e fornecedores antes de abrir transacao', async () => {
    expect((await createQuoteRequests({ items: [], suppliers: SUPPLIERS })).error).toMatch(
      /espécie/i,
    )
    expect((await createQuoteRequests({ items: ITEMS, suppliers: [] })).error).toMatch(
      /fornecedor/i,
    )
    expect(
      (
        await createQuoteRequests({
          items: ITEMS,
          suppliers: [{ supplier_id: 's1', message_text: '   ' }],
        })
      ).error,
    ).toMatch(/mensagem/i)
    expect(mockedConnect).not.toHaveBeenCalled()
  })
})

describe('markQuoteSent', () => {
  it('marca como enviada e atualiza last_contacted_at do fornecedor', async () => {
    mockedQuery.mockResolvedValue({ rows: [] })
    const result = await markQuoteSent('q1')
    expect(result.error).toBeUndefined()
    const sqls = mockedQuery.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls[0]).toContain(`status = 'sent'`)
    expect(sqls[0]).toContain(`status = 'queued'`)
    expect(sqls[1]).toContain('last_contacted_at')
    expect(sqls[1]).toContain('UPDATE suppliers')
  })
})

describe('markQuoteNoReply', () => {
  it('so transiciona a partir de sent', async () => {
    mockedQuery.mockResolvedValue({ rows: [] })
    await markQuoteNoReply('q1')
    const sql = mockedQuery.mock.calls[0][0] as string
    expect(sql).toContain(`'no_reply'`)
    expect(sql).toContain(`status = 'sent'`)
  })
})

describe('recordQuoteResponse', () => {
  function mockClient(overrides?: (sql: string) => Promise<unknown> | null) {
    const client = {
      query: vi.fn().mockImplementation((sql: string) => {
        const custom = overrides?.(sql)
        if (custom) return custom
        if (sql.includes('SELECT supplier_id FROM supplier_quotes')) {
          return Promise.resolve({ rows: [{ supplier_id: 's1' }] })
        }
        if (sql.includes('UPDATE supplier_quote_items')) {
          return Promise.resolve({ rows: [{ species_id: 'sp-ipe', size: '30-50cm' }] })
        }
        if (sql.includes('UPDATE supplier_species')) {
          return Promise.resolve({ rowCount: 0, rows: [] })
        }
        return Promise.resolve({ rows: [], rowCount: 0 })
      }),
      release: vi.fn(),
    }
    mockedConnect.mockResolvedValue(client)
    return client
  }

  it('grava preco no item, marca responded e faz UPSERT em supplier_species (insert)', async () => {
    const client = mockClient()
    const result = await recordQuoteResponse('q1', {
      rawResponse: 'tenho ipê a 5,00',
      items: [{ quote_item_id: 'qi1', quoted_unit_price: 5 }],
    })
    expect(result.error).toBeUndefined()
    const calls = client.query.mock.calls
    const sqls = calls.map((c: unknown[]) => c[0] as string)
    expect(sqls[0]).toBe('BEGIN')
    expect(sqls[sqls.length - 1]).toBe('COMMIT')
    // Sem linha existente (rowCount 0) → INSERT com source='quote'.
    const insert = calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO supplier_species'),
    )
    expect(insert).toBeTruthy()
    expect(insert![0]).toContain(`'quote'`)
    expect(insert![1]).toEqual(['s1', 'sp-ipe', '30-50cm', 5])
    expect(sqls.some((s) => s.includes(`'responded'`))).toBe(true)
  })

  it('quando a linha ja existe (rowCount 1), atualiza sem inserir', async () => {
    const client = mockClient((sql) => {
      if (sql.includes('UPDATE supplier_species')) {
        return Promise.resolve({ rowCount: 1, rows: [] })
      }
      return null
    })
    await recordQuoteResponse('q1', {
      items: [{ quote_item_id: 'qi1', quoted_unit_price: 7.5 }],
    })
    const sqls = client.query.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls.some((s) => s.includes('INSERT INTO supplier_species'))).toBe(false)
  })

  it('item sem preco nao mexe no catalogo do fornecedor', async () => {
    const client = mockClient()
    await recordQuoteResponse('q1', {
      items: [{ quote_item_id: 'qi1', quoted_unit_price: null, response_notes: 'não tem' }],
    })
    const sqls = client.query.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls.some((s) => s.includes('UPDATE supplier_species'))).toBe(false)
    expect(sqls.some((s) => s.includes('INSERT INTO supplier_species'))).toBe(false)
  })

  it('cotacao inexistente retorna erro com ROLLBACK', async () => {
    const client = mockClient((sql) => {
      if (sql.includes('SELECT supplier_id FROM supplier_quotes')) {
        return Promise.resolve({ rows: [] })
      }
      return null
    })
    const result = await recordQuoteResponse('q-nope', { items: [] })
    expect(result.error).toMatch(/não encontrada/i)
    const sqls = client.query.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls).toContain('ROLLBACK')
  })

  it('preco negativo e rejeitado antes de abrir transacao', async () => {
    const result = await recordQuoteResponse('q1', {
      items: [{ quote_item_id: 'qi1', quoted_unit_price: -1 }],
    })
    expect(result.error).toMatch(/negativo/i)
    expect(mockedConnect).not.toHaveBeenCalled()
  })
})

describe('saveQuoteChoices', () => {
  // Itens do grupo: duas ofertas do mesmo Ipê (fornecedores diferentes) e
  // uma Araucária ainda sem preço cotado.
  const GROUP_ITEMS = [
    { id: 'qi1', species_id: 'sp-ipe', quoted_unit_price: '10.00', common_name: 'Ipê' },
    { id: 'qi2', species_id: 'sp-ipe', quoted_unit_price: '12.00', common_name: 'Ipê' },
    { id: 'qi3', species_id: 'sp-arau', quoted_unit_price: null, common_name: 'Araucária' },
  ]

  function mockClient(items: unknown[] = GROUP_ITEMS) {
    const client = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('FROM supplier_quote_items qi')) {
          return Promise.resolve({ rows: items })
        }
        return Promise.resolve({ rows: [] })
      }),
      release: vi.fn(),
    }
    mockedConnect.mockResolvedValue(client)
    return client
  }

  beforeEach(() => {
    delete process.env.QUOTE_MIN_MARGIN_PCT
  })

  it('limpa as escolhas do grupo e marca as novas com preco de venda, em transacao', async () => {
    const client = mockClient()
    const result = await saveQuoteChoices('g1', [{ quote_item_id: 'qi1', sale_unit_price: 13 }])
    expect(result.error).toBeUndefined()

    const calls = client.query.mock.calls
    const sqls = calls.map((c: unknown[]) => String(c[0]))
    expect(sqls[0]).toBe('BEGIN')
    expect(sqls[sqls.length - 1]).toBe('COMMIT')
    const clearIdx = sqls.findIndex((s) => s.includes('is_chosen = false'))
    const setIdx = sqls.findIndex((s) => s.includes('is_chosen = true'))
    expect(clearIdx).toBeGreaterThan(-1)
    expect(setIdx).toBeGreaterThan(clearIdx)
    expect(calls[setIdx][1]).toEqual([13, 'qi1'])
  })

  it('salvar sem escolhas apenas limpa o grupo (desfazer fechamento)', async () => {
    const client = mockClient()
    const result = await saveQuoteChoices('g1', [])
    expect(result.error).toBeUndefined()
    const sqls = client.query.mock.calls.map((c: unknown[]) => String(c[0]))
    expect(sqls.some((s) => s.includes('is_chosen = false'))).toBe(true)
    expect(sqls.some((s) => s.includes('is_chosen = true'))).toBe(false)
  })

  it('BLOQUEIA venda abaixo do piso minimo (default 30% sobre o custo)', async () => {
    const client = mockClient()
    // custo 10 → piso 13,00; 12,99 fica abaixo.
    const result = await saveQuoteChoices('g1', [
      { quote_item_id: 'qi1', sale_unit_price: 12.99 },
    ])
    expect(result.error).toMatch(/piso mínimo/i)
    const sqls = client.query.mock.calls.map((c: unknown[]) => String(c[0]))
    expect(sqls).toContain('ROLLBACK')
    expect(sqls.some((s) => s.includes('is_chosen = true'))).toBe(false)
  })

  it('margem minima vem da env QUOTE_MIN_MARGIN_PCT quando definida', async () => {
    process.env.QUOTE_MIN_MARGIN_PCT = '20'
    mockClient()
    // Com 20%, piso = 12,00: 12 passa (falharia com o default 30%).
    const ok = await saveQuoteChoices('g1', [{ quote_item_id: 'qi1', sale_unit_price: 12 }])
    expect(ok.error).toBeUndefined()
    mockClient()
    const below = await saveQuoteChoices('g1', [{ quote_item_id: 'qi1', sale_unit_price: 11.99 }])
    expect(below.error).toMatch(/piso mínimo/i)
  })

  it('item sem preco cotado nao pode ser escolhido', async () => {
    mockClient()
    const result = await saveQuoteChoices('g1', [{ quote_item_id: 'qi3', sale_unit_price: 10 }])
    expect(result.error).toMatch(/preço cotado/i)
  })

  it('bloqueia duas escolhas para a mesma especie', async () => {
    mockClient()
    const result = await saveQuoteChoices('g1', [
      { quote_item_id: 'qi1', sale_unit_price: 13 },
      { quote_item_id: 'qi2', sale_unit_price: 16 },
    ])
    expect(result.error).toMatch(/um fornecedor por espécie/i)
  })

  it('item de outro grupo e rejeitado', async () => {
    mockClient()
    const result = await saveQuoteChoices('g1', [
      { quote_item_id: 'qi-de-outro-grupo', sale_unit_price: 13 },
    ])
    expect(result.error).toMatch(/não pertence/i)
  })

  it('grupo inexistente retorna erro com ROLLBACK', async () => {
    const client = mockClient([])
    const result = await saveQuoteChoices('g-nope', [
      { quote_item_id: 'qi1', sale_unit_price: 13 },
    ])
    expect(result.error).toMatch(/não encontrada/i)
    const sqls = client.query.mock.calls.map((c: unknown[]) => String(c[0]))
    expect(sqls).toContain('ROLLBACK')
  })

  it('preco de venda invalido e rejeitado antes de abrir transacao', async () => {
    const result = await saveQuoteChoices('g1', [
      { quote_item_id: 'qi1', sale_unit_price: -1 },
    ])
    expect(result.error).toMatch(/preço de venda/i)
    expect(mockedConnect).not.toHaveBeenCalled()
  })
})
