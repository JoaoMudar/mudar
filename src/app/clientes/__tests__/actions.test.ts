import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }))

import pool from '@/lib/db'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  toggleCustomerActive,
} from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>

// Indices dos binds do INSERT/UPDATE (mesma ordem nas duas queries).
const I = {
  name: 0,
  state: 3,
  person_type: 5,
  document: 6,
  email: 7,
  legal_name: 8,
  trade_name: 9,
  state_registration: 10,
  ie_exempt: 11,
  zip_code: 12,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createCustomer — cadastro simples', () => {
  it('cria com so o nome (campos fiscais NULL)', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'c1' }] })
    const result = await createCustomer({ name: 'João da Silva' })
    expect(result.id).toBe('c1')
    expect(result.error).toBeUndefined()
    const insert = mockedQuery.mock.calls[0]
    expect(insert[0]).toContain('INSERT INTO customers')
    expect(insert[1][I.name]).toBe('João da Silva')
    expect(insert[1][I.person_type]).toBeNull()
    expect(insert[1][I.document]).toBeNull()
  })

  it('rejeita nome vazio sem tocar o banco', async () => {
    const result = await createCustomer({ name: '   ' })
    expect(result.error).toMatch(/obrigatório/i)
    expect(mockedQuery).not.toHaveBeenCalled()
  })
})

describe('createCustomer — PF completo', () => {
  it('normaliza documento para digitos e grava person_type pf', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'c2' }] })
    const result = await createCustomer({
      name: 'João da Silva',
      person_type: 'pf',
      document: '111.444.777-35',
      email: 'joao@x.com',
      zip_code: '89160-000',
      street: 'Rua A',
      address_number: '1',
      neighborhood: 'Centro',
      city: 'Rio do Sul',
      state: 'SC',
    })
    expect(result.id).toBe('c2')
    const insert = mockedQuery.mock.calls[0]
    expect(insert[1][I.person_type]).toBe('pf')
    expect(insert[1][I.document]).toBe('11144477735')
    expect(insert[1][I.zip_code]).toBe('89160000')
  })
})

describe('createCustomer — PJ completo', () => {
  it('deriva o nome de exibicao do nome fantasia e grava IE', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'c3' }] })
    const result = await createCustomer({
      person_type: 'pj',
      legal_name: 'Paisagismo Verde Ltda',
      trade_name: 'Verde',
      document: '11.222.333/0001-81',
      state_registration: '251234567',
      email: 'contato@verde.com',
      zip_code: '89010000',
      street: 'Av B',
      address_number: '10',
      neighborhood: 'Velha',
      city: 'Blumenau',
      state: 'SC',
    })
    expect(result.id).toBe('c3')
    const insert = mockedQuery.mock.calls[0]
    expect(insert[1][I.name]).toBe('Verde') // fallback p/ trade_name
    expect(insert[1][I.person_type]).toBe('pj')
    expect(insert[1][I.document]).toBe('11222333000181')
    expect(insert[1][I.state_registration]).toBe('251234567')
    expect(insert[1][I.ie_exempt]).toBe(false)
  })
})

describe('createCustomer — duplicidade de documento', () => {
  it('retorna erro amigavel na violacao do indice unico', async () => {
    mockedQuery.mockRejectedValueOnce({
      code: '23505',
      message: 'duplicate key value violates unique constraint "idx_customers_document"',
    })
    const result = await createCustomer({
      name: 'João',
      person_type: 'pf',
      document: '11144477735',
    })
    expect(result.error).toMatch(/já cadastrado/i)
  })
})

describe('updateCustomer', () => {
  it('atualiza campos e passa o id como ultimo bind', async () => {
    mockedQuery.mockResolvedValueOnce({})
    const result = await updateCustomer('c1', {
      name: 'João Editado',
      person_type: 'pf',
      document: '11144477735',
      email: 'novo@x.com',
    })
    expect(result.error).toBeUndefined()
    const upd = mockedQuery.mock.calls[0]
    expect(upd[0]).toContain('UPDATE customers')
    expect(upd[1][I.name]).toBe('João Editado')
    expect(upd[1][I.email]).toBe('novo@x.com')
    expect(upd[1][upd[1].length - 1]).toBe('c1') // id no fim
  })

  it('propaga duplicidade de documento como erro amigavel', async () => {
    mockedQuery.mockRejectedValueOnce({ code: '23505', message: 'duplicate' })
    const result = await updateCustomer('c1', { name: 'X', person_type: 'pf', document: '11144477735' })
    expect(result.error).toMatch(/já cadastrado/i)
  })
})

describe('toggleCustomerActive', () => {
  it('inativa o cliente (sai da listagem ativa)', async () => {
    mockedQuery.mockResolvedValueOnce({})
    const result = await toggleCustomerActive('c1', false)
    expect(result.error).toBeUndefined()
    const q = mockedQuery.mock.calls[0]
    expect(q[0]).toContain('UPDATE customers SET active')
    expect(q[1]).toEqual([false, 'c1'])
  })
})

describe('getCustomers', () => {
  it('sem busca lista todos os ativos', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'A' }] })
    const rows = await getCustomers()
    expect(rows).toHaveLength(1)
    const q = mockedQuery.mock.calls[0]
    expect(q[0]).toContain('WHERE active = true')
    expect(q[0]).not.toContain('ILIKE')
  })

  it('com busca aplica ILIKE em nome/telefone/documento/razao', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] })
    await getCustomers('Verde')
    const q = mockedQuery.mock.calls[0]
    expect(q[0]).toContain('ILIKE')
    expect(q[1][0]).toBe('%Verde%')
  })
})
