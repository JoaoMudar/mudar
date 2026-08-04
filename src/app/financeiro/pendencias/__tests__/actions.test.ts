import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => ({ id: 1, username: 'joao', role: 'admin' })),
}))

import pool from '@/lib/db'
import { getFila, categorizar, getCategorias } from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>

/** Fila vazia: 3 respostas (fila, resumo, geral) e nenhuma sugestao depois. */
function mockFilaVazia() {
  mockedQuery
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    .mockResolvedValueOnce({ rows: [{ n: 0, v: '0' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ n: 0, v: '0' }], rowCount: 1 })
}

/** Fila com uma pendencia; depois vem regras e habito das sugestoes. */
function mockFilaCom(linha: Record<string, unknown>, regras = [], habito = []) {
  mockedQuery
    .mockResolvedValueOnce({ rows: [linha], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ n: 10, v: '5000' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ n: 50, v: '9000' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: regras, rowCount: regras.length })
    .mockResolvedValueOnce({ rows: habito, rowCount: habito.length })
}

beforeEach(() => {
  mockedQuery.mockReset()
})

describe('getFila — triagem por valor', () => {
  it('usa R$100 como piso padrao (cobre 65% do valor pendente)', async () => {
    mockFilaVazia()
    await getFila()
    expect(mockedQuery.mock.calls[0][1]).toEqual([100])
  })

  it('respeita um piso menor', async () => {
    mockFilaVazia()
    await getFila(50)
    expect(mockedQuery.mock.calls[0][1]).toEqual([50])
  })

  it('piso zero e valido (ver a cauda inteira)', async () => {
    mockFilaVazia()
    await getFila(0)
    expect(mockedQuery.mock.calls[0][1]).toEqual([0])
  })

  it('piso invalido cai no padrao em vez de quebrar', async () => {
    mockFilaVazia()
    await getFila(Number.NaN)
    expect(mockedQuery.mock.calls[0][1]).toEqual([100])
  })

  it('traz o MAIOR valor primeiro — e triagem por impacto', async () => {
    mockFilaVazia()
    await getFila()
    const sql = String(mockedQuery.mock.calls[0][0])
    expect(sql).toContain('ORDER BY valor DESC')
    expect(sql).toContain('LIMIT 1')
  })

  it('le da view, que ja aplica totalizador/excluido/corte de ano', async () => {
    mockFilaVazia()
    await getFila()
    expect(String(mockedQuery.mock.calls[0][0])).toContain('financeiro.vw_bi_pendencias')
  })

  it('fila vazia nao busca sugestao', async () => {
    mockFilaVazia()
    const r = await getFila()
    expect(r.atual).toBeNull()
    expect(r.sugestoes).toEqual([])
    expect(mockedQuery).toHaveBeenCalledTimes(3)
  })

  it('devolve o tamanho da faixa e o da cauda inteira', async () => {
    mockFilaCom({
      id: 1, descricao: 'Adubo', valor: '250.00',
      data_ref: '2025-03-10', centro_custo: 'Viveiro',
    })
    const r = await getFila()
    expect(r.restantes).toBe(10)
    expect(r.valorRestante).toBe(5000)
    expect(r.totalGeral).toBe(50)
    expect(r.valorTotalGeral).toBe(9000)
  })
})

describe('getFila — sugestoes', () => {
  it('normaliza acento dos DOIS lados ao casar a regra', async () => {
    // O padrao e gravado sem acento; sem bi_normaliza no lado do banco,
    // "Combustível" nunca casaria com "combustivel".
    mockFilaCom({
      id: 1, descricao: 'Combustível posto', valor: '250.00',
      data_ref: '2025-03-10', centro_custo: 'Viveiro',
    })
    await getFila()
    const sqlRegras = String(mockedQuery.mock.calls[3][0])
    expect(sqlRegras).toContain('financeiro.bi_normaliza')
    // o lado do padrao chega ja normalizado pelo JS
    expect(mockedQuery.mock.calls[3][1][0]).toBe('combustivel posto')
  })

  it('regra criada pelo usuario vem antes do habito do centro', async () => {
    mockFilaCom(
      { id: 1, descricao: 'Adubo', valor: '250.00', data_ref: '2025-03-10', centro_custo: 'Viveiro' },
      [{ categoria_id: 7, nome: 'Insumos/Produção', grupo: 'Operacional produção' }] as never,
      [{ categoria_id: 9, nome: 'Combustível', grupo: 'Veículos', n: 40 }] as never,
    )
    const r = await getFila()
    expect(r.sugestoes[0].categoria_id).toBe(7)
    expect(r.sugestoes[0].origem).toBe('regra')
    expect(r.sugestoes[1].origem).toBe('centro')
  })

  it('nao repete categoria que ja veio por regra', async () => {
    mockFilaCom(
      { id: 1, descricao: 'Adubo', valor: '250.00', data_ref: '2025-03-10', centro_custo: 'Viveiro' },
      [{ categoria_id: 7, nome: 'Insumos', grupo: 'Op' }] as never,
      [{ categoria_id: 7, nome: 'Insumos', grupo: 'Op', n: 40 }] as never,
    )
    const r = await getFila()
    expect(r.sugestoes).toHaveLength(1)
  })

  it('sem centro de custo nao consulta habito', async () => {
    mockedQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, descricao: 'Adubo', valor: '250.00', data_ref: '2025-03-10', centro_custo: null }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ n: 1, v: '250' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ n: 1, v: '250' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // so a de regras
    const r = await getFila()
    expect(r.sugestoes).toEqual([])
    expect(mockedQuery).toHaveBeenCalledTimes(4)
  })
})

describe('categorizar', () => {
  it('grava categoria e autoria', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ descricao: 'Adubo NPK' }], rowCount: 1 })
    const r = await categorizar(1, 7, false)

    const sql = String(mockedQuery.mock.calls[0][0])
    expect(sql).toContain('UPDATE financeiro.despesas')
    expect(sql).toContain('atualizado_por')
    expect(mockedQuery.mock.calls[0][1]).toEqual([1, 7, 'joao'])
    expect(r.ok).toBe(true)
    expect(r.aplicadosEmLote).toBe(0)
  })

  it('nao mexe em lancamento ja excluido', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const r = await categorizar(1, 7)
    expect(r.erro).toContain('não encontrado')
  })

  it('sem criar regra, nao roda o lote', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ descricao: 'Adubo NPK' }], rowCount: 1 })
    await categorizar(1, 7, false)
    expect(mockedQuery).toHaveBeenCalledTimes(1)
  })

  it('criar regra grava o padrao normalizado e aplica em lote', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ descricao: 'Combustível Posto' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })   // INSERT regra
      .mockResolvedValueOnce({ rows: [], rowCount: 12 })  // UPDATE em lote

    const r = await categorizar(1, 7, true)

    const insert = String(mockedQuery.mock.calls[1][0])
    expect(insert).toContain('financeiro.regras_categoria')
    expect(mockedQuery.mock.calls[1][1][0]).toBe('combustivel posto') // sem acento

    const lote = String(mockedQuery.mock.calls[2][0])
    expect(lote).toContain('financeiro.bi_normaliza')
    expect(lote).toContain('categoria_id IS NULL')
    expect(lote).toContain('eh_totalizador = FALSE')
    expect(lote).toContain('excluido_em IS NULL')
    expect(r.aplicadosEmLote).toBe(12)
  })

  it('padrao curto demais NAO vira regra — pegaria meio banco', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ descricao: 'gas' }], rowCount: 1 })
    const r = await categorizar(1, 7, true)
    expect(mockedQuery).toHaveBeenCalledTimes(1)
    expect(r.aplicadosEmLote).toBe(0)
  })

  it('id ou categoria invalidos nao tocam o banco', async () => {
    expect((await categorizar(0, 7)).erro).toBeTruthy()
    expect((await categorizar(1, 0)).erro).toBeTruthy()
    expect(mockedQuery).not.toHaveBeenCalled()
  })
})

describe('getCategorias', () => {
  it('lista agrupada por grupo', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 7, nome: 'Insumos', grupo: 'Operacional' }],
      rowCount: 1,
    })
    const r = await getCategorias()
    expect(r).toEqual([{ id: 7, nome: 'Insumos', grupo: 'Operacional' }])
    expect(String(mockedQuery.mock.calls[0][0])).toContain('ORDER BY grupo, nome')
  })
})
