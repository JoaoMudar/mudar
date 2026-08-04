import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => ({ id: 1, username: 'joao', role: 'admin' })),
}))

import pool from '@/lib/db'
import { criarDespesa, excluirDespesa, getDespesasDoMes } from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>

/** Indices dos binds do INSERT, na ordem em que a action monta o array. */
const I = {
  data: 0, ano: 1, mes: 2, descricao: 3, valor: 4, categoria: 5, centro: 6,
  quantidade: 7, unidade: 8, mc: 9, mao: 10, equip: 11, desloc: 12,
  natureza: 13, criadoPor: 14,
}

/** Uma despesa valida, datada no passado para nao esbarrar na trava de futuro. */
const valida = {
  data: '2026-05-14',
  descricao: 'Substrato para mudas',
  valor_total: '1.234,56',
  categoria_id: 14,
  centro_custo: 'Viveiro',
}

/** Respostas de categoria/centro/rateio que a action busca antes de inserir. */
function mockContexto(catNatureza: string, centroNatureza: string, rateio: unknown[] = []) {
  mockedQuery
    .mockResolvedValueOnce({ rows: [{ natureza: catNatureza }], rowCount: 1 })  // categoria
    .mockResolvedValueOnce({ rows: [{ natureza: centroNatureza }], rowCount: 1 }) // centro
    .mockResolvedValueOnce({ rows: rateio, rowCount: rateio.length })             // rateio
    .mockResolvedValueOnce({ rows: [{ id: 999 }], rowCount: 1 })                  // insert
}

beforeEach(() => {
  mockedQuery.mockReset()
})

describe('criarDespesa — validacao antes de tocar o banco', () => {
  it('recusa sem categoria e nao consulta o banco', async () => {
    const r = await criarDespesa({ ...valida, categoria_id: null })
    expect(r.erro).toContain('categoria')
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('recusa data futura sem tocar o banco', async () => {
    const ano = new Date().getFullYear() + 1
    const r = await criarDespesa({ ...valida, data: `${ano}-01-01` })
    expect(r.erro).toContain('futuro')
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('recusa valor zero', async () => {
    const r = await criarDespesa({ ...valida, valor_total: '0' })
    expect(r.erro).toContain('maior que zero')
    expect(mockedQuery).not.toHaveBeenCalled()
  })
})

describe('criarDespesa — gravacao', () => {
  it('deriva ano e mes da data, nunca do que o cliente mandar', async () => {
    mockContexto('negocio', 'negocio')
    await criarDespesa(valida)

    const insert = mockedQuery.mock.calls[3]
    expect(insert[0]).toContain('INSERT INTO financeiro.despesas')
    expect(insert[1][I.ano]).toBe(2026)
    expect(insert[1][I.mes]).toBe(5)
    expect(insert[1][I.data]).toBe('2026-05-14')
  })

  it('grava eh_totalizador FALSE fixo no SQL', async () => {
    mockContexto('negocio', 'negocio')
    await criarDespesa(valida)
    // Nao pode vir do cliente: totalizador infla a despesa ~4x.
    expect(mockedQuery.mock.calls[3][0]).toContain('FALSE')
  })

  it('marca origem app e o autor', async () => {
    mockContexto('negocio', 'negocio')
    await criarDespesa(valida)
    const insert = mockedQuery.mock.calls[3]
    expect(insert[0]).toContain("'app'")
    expect(insert[1][I.criadoPor]).toBe('joao')
  })

  it('categoria de negocio => 100% negocio', async () => {
    mockContexto('negocio', 'pessoal') // centro pessoal nao muda nada
    const r = await criarDespesa(valida)
    expect(r.pct_negocio).toBe(100)
    expect(mockedQuery.mock.calls[3][1][I.natureza]).toBe('negocio')
  })

  it('categoria pessoal => 0%, mesmo em centro de negocio', async () => {
    mockContexto('pessoal', 'negocio')
    const r = await criarDespesa(valida)
    expect(r.pct_negocio).toBe(0)
    expect(mockedQuery.mock.calls[3][1][I.natureza]).toBe('pessoal')
  })

  it('categoria misto usa a regra de rateio do centro', async () => {
    mockContexto('misto', 'negocio', [
      { categoria_id: 14, centro_custo: 'Viveiro', pct_negocio: 100 },
      { categoria_id: 14, centro_custo: null, pct_negocio: 50 },
    ])
    const r = await criarDespesa(valida)
    expect(r.pct_negocio).toBe(100)
  })

  it('categoria misto em centro pessoal zera', async () => {
    mockContexto('misto', 'pessoal', [
      { categoria_id: 14, centro_custo: 'Viveiro', pct_negocio: 100 },
      { categoria_id: 14, centro_custo: 'Casa', pct_negocio: 0 },
    ])
    const r = await criarDespesa({ ...valida, centro_custo: 'Casa' })
    expect(r.pct_negocio).toBe(0)
  })

  it('categoria inexistente e recusada antes do insert', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ natureza: 'negocio' }], rowCount: 1 })
    const r = await criarDespesa(valida)
    expect(r.erro).toContain('Categoria')
    expect(mockedQuery).toHaveBeenCalledTimes(2)
  })
})

describe('excluirDespesa', () => {
  it('faz soft delete, nunca DELETE', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    const r = await excluirDespesa(999)

    const sql = mockedQuery.mock.calls[0][0]
    expect(sql).toContain('UPDATE financeiro.despesas')
    expect(sql).toContain('excluido_em')
    expect(sql).not.toContain('DELETE')
    expect(r.ok).toBe(true)
  })

  it('nao re-exclui o que ja foi excluido', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const r = await excluirDespesa(999)
    expect(r.erro).toContain('não encontrado')
  })
})

describe('getDespesasDoMes', () => {
  it('filtra totalizador e excluido — as duas regras inegociaveis', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await getDespesasDoMes('2026-05')

    const sql = mockedQuery.mock.calls[0][0]
    expect(sql).toContain('eh_totalizador = FALSE')
    expect(sql).toContain('excluido_em IS NULL')
    expect(mockedQuery.mock.calls[0][1]).toEqual([2026, 5])
  })

  it('mes malformado nao vira query', async () => {
    const r = await getDespesasDoMes('lixo')
    expect(r.quantidade).toBe(0)
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('soma o total do mes', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, data: '2026-05-01', descricao: 'a', valor_total: '10.50', origem_lancamento: 'app' },
        { id: 2, data: '2026-05-02', descricao: 'b', valor_total: '4.50', origem_lancamento: 'excel' },
      ],
      rowCount: 2,
    })
    const r = await getDespesasDoMes('2026-05')
    expect(r.total).toBe(15)
    expect(r.quantidade).toBe(2)
  })
})
