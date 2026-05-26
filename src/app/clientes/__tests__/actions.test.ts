import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }))

import pool from '@/lib/db'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  toggleCustomerActive,
  mergeCustomers,
  lookupCnpj,
} from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>
const mockedConnect = pool.connect as unknown as ReturnType<typeof vi.fn>

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
  it('retorna o cliente em conflito (nome) na violacao do indice unico', async () => {
    mockedQuery.mockRejectedValueOnce({
      code: '23505',
      message: 'duplicate key value violates unique constraint "idx_customers_document"',
    })
    // findCustomerByDocument: SELECT do cliente que ja tem o documento
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'orig1', name: 'Cliente Original' }] })
    const result = await createCustomer({
      name: 'João',
      person_type: 'pf',
      document: '11144477735',
    })
    expect(result.error).toMatch(/cadastrado/i)
    expect(result.error).toContain('Cliente Original')
    expect(result.conflict).toEqual({ id: 'orig1', name: 'Cliente Original' })
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

  it('propaga duplicidade com o cliente em conflito (exclui o proprio id)', async () => {
    mockedQuery.mockRejectedValueOnce({ code: '23505', message: 'duplicate' })
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'orig1', name: 'Outro Cliente' }] })
    const result = await updateCustomer('c1', { name: 'X', person_type: 'pf', document: '11144477735' })
    expect(result.error).toMatch(/cadastrado/i)
    expect(result.conflict).toEqual({ id: 'orig1', name: 'Outro Cliente' })
    // o SELECT de conflito exclui o proprio id (c1)
    const select = mockedQuery.mock.calls[1]
    expect(select[0]).toContain('id <> $2')
    expect(select[1]).toEqual(['11144477735', 'c1'])
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

describe('lookupCnpj', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejeita CNPJ invalido sem chamar a API', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const res = await lookupCnpj('123')
    expect(res.error).toMatch(/inválido/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('404 retorna "nao encontrado"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const res = await lookupCnpj('11.222.333/0001-81')
    expect(res.error).toMatch(/não encontrado/i)
  })

  it('sucesso mapeia os dados da Receita', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ razao_social: 'Verde Ltda', uf: 'sc', cep: '89010-000' }),
      }),
    )
    const res = await lookupCnpj('11222333000181')
    expect(res.error).toBeUndefined()
    expect(res.data?.legal_name).toBe('Verde Ltda')
    expect(res.data?.state).toBe('SC')
    expect(res.data?.zip_code).toBe('89010000')
  })

  it('falha de rede (ambos provedores) retorna erro amigavel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const res = await lookupCnpj('11222333000181')
    expect(res.error).toMatch(/falha/i)
  })

  it('404 na BrasilAPI e definitivo — nao tenta o fallback', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)
    const res = await lookupCnpj('11222333000181')
    expect(res.error).toMatch(/não encontrado/i)
    expect(fetchMock).toHaveBeenCalledTimes(1) // OpenCNPJ nao foi chamada
  })

  it('cai para a OpenCNPJ quando a BrasilAPI responde 5xx', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 }) // BrasilAPI fora
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          razao_social: 'Fallback Ltda',
          telefones: [{ ddd: '47', numero: '999990000', is_fax: false }],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const res = await lookupCnpj('11222333000181')
    expect(res.error).toBeUndefined()
    expect(res.data?.legal_name).toBe('Fallback Ltda')
    expect(res.data?.phone).toBe('(47) 999990000') // formato telefones[] = OpenCNPJ
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain('brasilapi.com.br')
    expect(String(fetchMock.mock.calls[1][0])).toContain('opencnpj.org')
  })

  it('cai para a OpenCNPJ quando a BrasilAPI da erro de rede', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('reset')) // BrasilAPI inalcancavel
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ razao_social: 'Backup SA' }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const res = await lookupCnpj('11222333000181')
    expect(res.data?.legal_name).toBe('Backup SA')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('mergeCustomers', () => {
  function fakeClient(query: ReturnType<typeof vi.fn>) {
    return { query, release: vi.fn() }
  }

  it('reaponta os pedidos para o original e inativa o duplicado', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'dup' }, { id: 'orig' }] }) // existem os dois
      .mockResolvedValueOnce({ rowCount: 3 }) // UPDATE orders
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE customers active=false
      .mockResolvedValueOnce(undefined) // COMMIT
    const client = fakeClient(q)
    mockedConnect.mockResolvedValueOnce(client)

    const res = await mergeCustomers('dup', 'orig')
    expect(res.error).toBeUndefined()
    expect(res.movedOrders).toBe(3)

    const updOrders = q.mock.calls.find((c) => String(c[0]).includes('UPDATE orders'))
    expect(updOrders?.[1]).toEqual(['orig', 'dup'])
    const inactivate = q.mock.calls.find((c) => String(c[0]).includes('SET active = false'))
    expect(inactivate?.[1]).toEqual(['dup'])
    expect(client.release).toHaveBeenCalled()
  })

  it('rejeita unir um cliente a ele mesmo (sem tocar o banco)', async () => {
    const res = await mergeCustomers('x', 'x')
    expect(res.error).toMatch(/ele mesmo/i)
    expect(mockedConnect).not.toHaveBeenCalled()
  })

  it('rejeita ids vazios', async () => {
    const res = await mergeCustomers('', 'orig')
    expect(res.error).toMatch(/inválidos/i)
    expect(mockedConnect).not.toHaveBeenCalled()
  })

  it('faz rollback quando um dos clientes nao existe', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'dup' }] }) // so um existe
      .mockResolvedValueOnce(undefined) // ROLLBACK
    const client = fakeClient(q)
    mockedConnect.mockResolvedValueOnce(client)

    const res = await mergeCustomers('dup', 'orig')
    expect(res.error).toMatch(/não encontrado/i)
    expect(q.mock.calls.some((c) => c[0] === 'ROLLBACK')).toBe(true)
    expect(client.release).toHaveBeenCalled()
  })
})
