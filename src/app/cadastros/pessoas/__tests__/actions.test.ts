import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ default: { query: vi.fn() } }))
// Sessao mockada, POLITICA REAL — permissions.ts roda de verdade. E o que
// torna este arquivo um teste de autorizacao e nao de mock.
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))

import pool from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getPeople, getPerson, getPartyHistory, getVisibleRoles } from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>
const mockedAuth = requireAuth as unknown as ReturnType<typeof vi.fn>

const como = (role: string) => mockedAuth.mockResolvedValue({ id: 'u1', role })

/** Papéis que a query recebeu — o $1 de `listParties`. */
const papeisConsultados = () => mockedQuery.mock.calls[0][1][0] as string[]

beforeEach(() => {
  vi.clearAllMocks()
  mockedQuery.mockResolvedValue({ rows: [] })
})

describe('getVisibleRoles', () => {
  it('chefia lê os três papéis', async () => {
    como('chefia')
    expect(await getVisibleRoles()).toEqual(['cliente', 'fornecedor', 'funcionario'])
  })

  it('gerência não lê fornecedor (D4 §2)', async () => {
    como('gerencia')
    expect(await getVisibleRoles()).toEqual(['cliente', 'funcionario'])
  })

  it('colaborador não lê pessoa nenhuma', async () => {
    como('colaborador')
    expect(await getVisibleRoles()).toEqual([])
  })
})

describe('getPeople', () => {
  it('consulta só os papéis que o usuário pode ler', async () => {
    como('gerencia')
    await getPeople()
    expect(papeisConsultados()).toEqual(['cliente', 'funcionario'])
  })

  it('o filtro da tela só estreita — não amplia', async () => {
    // A gerência pedindo fornecedor não recebe a rede: o papel pedido é
    // intersectado com o que ela pode ler, e sobra vazio.
    como('gerencia')
    await expect(getPeople(undefined, 'fornecedor')).resolves.toEqual([])
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('a chefia pedindo fornecedor recebe fornecedor', async () => {
    como('chefia')
    await getPeople(undefined, 'fornecedor')
    expect(papeisConsultados()).toEqual(['fornecedor'])
  })

  it('quem não lê papel nenhum não chega ao banco', async () => {
    como('colaborador')
    await expect(getPeople()).resolves.toEqual([])
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('repassa a busca', async () => {
    como('chefia')
    await getPeople('kuhar')
    expect(mockedQuery.mock.calls[0][1][1]).toBe('kuhar')
  })
})

describe('getPerson', () => {
  it('consulta só os papéis legíveis', async () => {
    como('gerencia')
    mockedQuery.mockResolvedValue({ rows: [] })
    await getPerson('p1')
    expect(mockedQuery.mock.calls[0][1][1]).toEqual(['cliente', 'funcionario'])
  })

  it('colaborador não abre ficha de ninguém', async () => {
    como('colaborador')
    await expect(getPerson('p1')).resolves.toBeNull()
    expect(mockedQuery).not.toHaveBeenCalled()
  })
})

describe('getPartyHistory', () => {
  it('chefia consulta pedidos e cotações', async () => {
    como('chefia')
    mockedQuery.mockResolvedValue({ rows: [] })
    await getPartyHistory('p1')
    const sqls = mockedQuery.mock.calls.map((c) => c[0] as string)
    expect(sqls.some((q) => q.includes('FROM orders'))).toBe(true)
    expect(sqls.some((q) => q.includes('FROM supplier_quotes'))).toBe(true)
  })

  it('gerência não vê as cotações — nem abrindo a ficha de quem tem os dois papéis', async () => {
    // O histórico segue a mesma regra dos selos. Sem isto, esconder o selo de
    // fornecedor e listar as cotações embaixo entregaria o mesmo dado.
    como('gerencia')
    mockedQuery.mockResolvedValue({ rows: [] })
    const { orders, quotes } = await getPartyHistory('p1')
    const sqls = mockedQuery.mock.calls.map((c) => c[0] as string)
    expect(sqls.some((q) => q.includes('FROM orders'))).toBe(true)
    expect(sqls.some((q) => q.includes('FROM supplier_quotes'))).toBe(false)
    expect(quotes).toEqual([])
    expect(orders).toEqual([])
  })

  it('quem não lê papel nenhum não chega ao banco', async () => {
    como('colaborador')
    await expect(getPartyHistory('p1')).resolves.toEqual({ orders: [], quotes: [] })
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('pedido cancelado não entra no histórico', async () => {
    como('chefia')
    mockedQuery.mockResolvedValue({ rows: [] })
    await getPartyHistory('p1')
    const pedidos = mockedQuery.mock.calls.map((c) => c[0] as string).find((q) => q.includes('FROM orders'))!
    expect(pedidos).toMatch(/o\.status <> 'cancelado'/)
  })

  it('a ligação com a pessoa é por party_id, não por nome', async () => {
    // É o que o cadastro único comprou: somar por identidade em vez de casar
    // `customers` com `suppliers` pelo nome a cada consulta.
    como('chefia')
    mockedQuery.mockResolvedValue({ rows: [] })
    await getPartyHistory('p1')
    for (const [sql, params] of mockedQuery.mock.calls) {
      expect(sql as string).toMatch(/party_id = \$1/)
      expect(params).toEqual(['p1'])
    }
  })
})
