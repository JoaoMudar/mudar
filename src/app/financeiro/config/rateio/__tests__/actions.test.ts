import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => ({ id: 1, username: 'joao', role: 'admin' })),
}))

import pool from '@/lib/db'
import { simularRateio, salvarRateio } from '../actions'

const mockedConnect = pool.connect as unknown as ReturnType<typeof vi.fn>

/**
 * Cliente de transacao falso. Os parametros de `query` sao declarados de
 * proposito: sem eles o TS infere a tupla de argumentos como vazia e as
 * assercoes sobre `mock.calls[n][0]` nao compilam.
 */
type QueryMock = (sql: string, binds?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>

function mockClient(resultados: { rows: unknown[]; rowCount: number }[] = []) {
  let i = 0
  const client = {
    query: vi.fn<QueryMock>(async () => resultados[i++] ?? { rows: [], rowCount: 1 }),
    release: vi.fn(),
  }
  mockedConnect.mockResolvedValue(client)
  return client
}

const umaAlteracao = [{ categoria_id: 14, centro_custo: 'Sítio', pct_negocio: 80 }]

beforeEach(() => {
  mockedConnect.mockReset()
})

describe('simularRateio', () => {
  it('SEMPRE faz ROLLBACK — previa nao pode gravar nada', async () => {
    const client = mockClient([
      { rows: [], rowCount: 1 },                              // BEGIN
      { rows: [], rowCount: 1 },                              // UPDATE
      { rows: [{ despesa_negocio: '259886.41' }], rowCount: 1 }, // SELECT
    ])
    const r = await simularRateio(umaAlteracao)

    const comandos = client.query.mock.calls.map((c) => String(c[0]))
    expect(comandos).toContain('BEGIN')
    expect(comandos).toContain('ROLLBACK')
    expect(comandos).not.toContain('COMMIT')
    expect(r.despesa).toBe(259886.41)
    expect(client.release).toHaveBeenCalled()
  })

  it('devolve o numero que a propria view calcula, nao uma reimplementacao', async () => {
    const client = mockClient([
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [{ despesa_negocio: '100.00' }], rowCount: 1 },
    ])
    await simularRateio(umaAlteracao)
    const select = client.query.mock.calls.find((c) => String(c[0]).includes('SELECT'))
    expect(String(select?.[0])).toContain('financeiro.vw_bi_dre_anual')
  })

  it('faz ROLLBACK tambem quando a query estoura', async () => {
    const client = {
      query: vi.fn<QueryMock>()
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // BEGIN
        .mockRejectedValueOnce(new Error('falha')),        // UPDATE
      release: vi.fn(),
    }
    mockedConnect.mockResolvedValue(client)

    const r = await simularRateio(umaAlteracao)
    expect(r.erro).toBeTruthy()
    expect(client.query.mock.calls.map((c) => String(c[0]))).toContain('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })
})

describe('validacao — nao chega a abrir transacao', () => {
  it('recusa percentual acima de 100', async () => {
    const r = await simularRateio([{ categoria_id: 14, centro_custo: null, pct_negocio: 150 }])
    expect(r.erro).toContain('entre 0 e 100')
    expect(mockedConnect).not.toHaveBeenCalled()
  })

  it('recusa percentual negativo', async () => {
    const r = await salvarRateio([{ categoria_id: 14, centro_custo: null, pct_negocio: -1 }])
    expect(r.erro).toContain('entre 0 e 100')
    expect(mockedConnect).not.toHaveBeenCalled()
  })

  it('recusa percentual quebrado', async () => {
    const r = await salvarRateio([{ categoria_id: 14, centro_custo: null, pct_negocio: 33.3 }])
    expect(r.erro).toContain('inteiro')
    expect(mockedConnect).not.toHaveBeenCalled()
  })

  it('recusa categoria invalida', async () => {
    const r = await salvarRateio([{ categoria_id: 0, centro_custo: null, pct_negocio: 50 }])
    expect(r.erro).toContain('Categoria')
    expect(mockedConnect).not.toHaveBeenCalled()
  })

  it('lista vazia nao abre transacao', async () => {
    const r = await salvarRateio([])
    expect(r.erro).toBeTruthy()
    expect(mockedConnect).not.toHaveBeenCalled()
  })
})

describe('salvarRateio', () => {
  it('comita e registra autoria', async () => {
    const client = mockClient([
      { rows: [], rowCount: 1 }, // BEGIN
      { rows: [], rowCount: 1 }, // UPDATE
      { rows: [], rowCount: 1 }, // COMMIT
    ])
    const r = await salvarRateio(umaAlteracao)

    const comandos = client.query.mock.calls.map((c) => String(c[0]))
    expect(comandos).toContain('COMMIT')
    expect(comandos).not.toContain('ROLLBACK')

    const update = client.query.mock.calls.find((c) => String(c[0]).includes('UPDATE'))
    expect(String(update?.[0])).toContain('atualizado_por')
    expect(update?.[1]).toContain('joao')
    expect(r.ok).toBe(true)
  })

  it('casa a linha-padrao (centro null) sem depender de NULL = NULL', async () => {
    // COALESCE nos dois lados: em SQL, NULL = NULL nao casa, e a linha-padrao
    // ficaria inalcancavel.
    const client = mockClient()
    await salvarRateio([{ categoria_id: 14, centro_custo: null, pct_negocio: 60 }])
    const update = client.query.mock.calls.find((c) => String(c[0]).includes('UPDATE'))
    expect(String(update?.[0])).toContain('COALESCE')
  })

  it('faz ROLLBACK se algo falhar no meio', async () => {
    const client = {
      query: vi.fn<QueryMock>()
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockRejectedValueOnce(new Error('falha')),
      release: vi.fn(),
    }
    mockedConnect.mockResolvedValue(client)

    const r = await salvarRateio(umaAlteracao)
    expect(r.erro).toBeTruthy()
    expect(client.query.mock.calls.map((c) => String(c[0]))).toContain('ROLLBACK')
  })
})
