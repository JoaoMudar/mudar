import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }))

import pool from '@/lib/db'
import {
  createSupplier,
  updateSupplier,
  toggleSupplierActive,
  addSupplierSpecies,
  importSupplierSpeciesRows,
} from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>
const mockedConnect = pool.connect as unknown as ReturnType<typeof vi.fn>

// Indices dos binds do INSERT/UPDATE de suppliers (mesma ordem nas duas queries).
const I = {
  name: 0,
  contact_name: 1,
  whatsapp: 2,
  phone: 3,
  email: 4,
  instagram: 5,
  city: 6,
  state: 7,
  notes: 8,
  reliability_score: 9,
  status: 10,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSupplier', () => {
  it('cria com so o nome (demais campos NULL, status lead)', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 's1' }] })
    const result = await createSupplier({ name: 'Viveiro do Vale' })
    expect(result.id).toBe('s1')
    const insert = mockedQuery.mock.calls[0]
    expect(insert[0]).toContain('INSERT INTO suppliers')
    expect(insert[1][I.name]).toBe('Viveiro do Vale')
    expect(insert[1][I.whatsapp]).toBeNull()
    expect(insert[1][I.state]).toBeNull()
    expect(insert[1][I.status]).toBe('lead')
  })

  it('rejeita nome vazio sem tocar o banco', async () => {
    const result = await createSupplier({ name: '   ' })
    expect(result.error).toMatch(/obrigatório/i)
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('normaliza whatsapp para so digitos e UF para maiusculas', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 's2' }] })
    await createSupplier({
      name: 'Viveiro Litoral',
      whatsapp: '(48) 99999-8888',
      state: 'sc',
      city: '  Itajaí ',
    })
    const insert = mockedQuery.mock.calls[0]
    expect(insert[1][I.whatsapp]).toBe('48999998888')
    expect(insert[1][I.state]).toBe('SC')
    expect(insert[1][I.city]).toBe('Itajaí')
  })

  it('UF invalida vira NULL; status invalido vira lead; nota fora de 0-5 vira NULL', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 's3' }] })
    await createSupplier({
      name: 'Viveiro X',
      state: 'XX',
      status: 'banido' as never,
      reliability_score: 9,
    })
    const insert = mockedQuery.mock.calls[0]
    expect(insert[1][I.state]).toBeNull()
    expect(insert[1][I.status]).toBe('lead')
    expect(insert[1][I.reliability_score]).toBeNull()
  })
})

describe('updateSupplier', () => {
  it('atualiza mantendo a normalizacao', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] })
    const result = await updateSupplier('s1', {
      name: 'Viveiro do Vale',
      status: 'do_not_contact',
      whatsapp: '47 3521-0000',
    })
    expect(result.error).toBeUndefined()
    const update = mockedQuery.mock.calls[0]
    expect(update[0]).toContain('UPDATE suppliers')
    expect(update[1][I.whatsapp]).toBe('4735210000')
    expect(update[1][I.status]).toBe('do_not_contact')
    expect(update[1][11]).toBe('s1') // WHERE id
  })

  it('rejeita nome vazio', async () => {
    const result = await updateSupplier('s1', { name: '' })
    expect(result.error).toMatch(/obrigatório/i)
    expect(mockedQuery).not.toHaveBeenCalled()
  })
})

describe('toggleSupplierActive', () => {
  it('soft-delete via active', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] })
    const result = await toggleSupplierActive('s1', false)
    expect(result.error).toBeUndefined()
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE suppliers SET active'),
      [false, 's1'],
    )
  })
})

describe('addSupplierSpecies', () => {
  it('adiciona com so a especie (campos opcionais NULL, availability unknown)', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'ss1' }] })
    const result = await addSupplierSpecies('s1', { species_id: 'sp-ipe' })
    expect(result.id).toBe('ss1')
    const insert = mockedQuery.mock.calls[0]
    expect(insert[0]).toContain('INSERT INTO supplier_species')
    // binds: supplier, species, size, container, price, min_qty, availability, notes
    expect(insert[1]).toEqual(['s1', 'sp-ipe', null, null, null, null, 'unknown', null])
  })

  it('rejeita sem especie', async () => {
    const result = await addSupplierSpecies('s1', { species_id: '' })
    expect(result.error).toMatch(/espécie/i)
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('rejeita preco negativo', async () => {
    const result = await addSupplierSpecies('s1', { species_id: 'sp-ipe', unit_price: -1 })
    expect(result.error).toMatch(/preço/i)
    expect(mockedQuery).not.toHaveBeenCalled()
  })
})

describe('importSupplierSpeciesRows', () => {
  function mockClient() {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() }
    mockedConnect.mockResolvedValue(client)
    return client
  }

  it('importa todas as linhas numa transacao com source=paste', async () => {
    const client = mockClient()
    const result = await importSupplierSpeciesRows('s1', [
      { species_id: 'sp-ipe', size: '30cm', unit_price: 4.5 },
      { species_id: 'sp-arau', unit_price: null },
    ])
    expect(result.inserted).toBe(2)
    const sqls = client.query.mock.calls.map((c: unknown[]) => String(c[0]))
    expect(sqls[0]).toBe('BEGIN')
    expect(sqls[sqls.length - 1]).toBe('COMMIT')
    expect(sqls.filter((s: string) => s.includes('INSERT INTO supplier_species'))).toHaveLength(2)
    expect(sqls[1]).toContain(`'paste'`)
    expect(client.release).toHaveBeenCalled()
  })

  it('faz ROLLBACK quando um INSERT falha', async () => {
    const client = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('INSERT')) return Promise.reject(new Error('boom'))
        return Promise.resolve({ rows: [] })
      }),
      release: vi.fn(),
    }
    mockedConnect.mockResolvedValue(client)
    const result = await importSupplierSpeciesRows('s1', [{ species_id: 'sp-ipe' }])
    expect(result.error).toBeTruthy()
    const sqls = client.query.mock.calls.map((c: unknown[]) => String(c[0]))
    expect(sqls).toContain('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })

  it('valida todas as linhas antes de abrir transacao', async () => {
    const result = await importSupplierSpeciesRows('s1', [
      { species_id: 'sp-ipe' },
      { species_id: '' },
    ])
    expect(result.error).toMatch(/espécie/i)
    expect(mockedConnect).not.toHaveBeenCalled()
  })

  it('rejeita lista vazia', async () => {
    const result = await importSupplierSpeciesRows('s1', [])
    expect(result.error).toMatch(/nenhuma linha/i)
    expect(mockedConnect).not.toHaveBeenCalled()
  })
})
