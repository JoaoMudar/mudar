import { describe, it, expect } from 'vitest'
import {
  validateDespesa,
  deriveAnoMes,
  naturezaDerivada,
  ANO_MINIMO,
  type DespesaInput,
} from '../bi-despesas'

const HOJE = new Date(2026, 7, 4) // 04/08/2026

const base: DespesaInput = {
  data: '2026-05-14',
  descricao: 'Substrato para mudas',
  valor_total: '1.234,56',
  categoria_id: 14,
  centro_custo: 'Viveiro',
}

function ok(input: DespesaInput) {
  const r = validateDespesa(input, HOJE)
  if ('erro' in r) throw new Error(`esperava sucesso, veio erro: ${r.erro}`)
  return r.valor
}
function erro(input: DespesaInput) {
  const r = validateDespesa(input, HOJE)
  if (!('erro' in r)) throw new Error('esperava erro, passou')
  return r.erro
}

describe('deriveAnoMes', () => {
  it('extrai ano e mes de uma data ISO', () => {
    expect(deriveAnoMes('2026-05-14')).toEqual({ ano: 2026, mes: 5 })
  })

  it('rejeita data que nao existe (o Date normalizaria em silencio)', () => {
    expect(deriveAnoMes('2026-02-31')).toBeNull()
    expect(deriveAnoMes('2026-13-01')).toBeNull()
  })

  it('rejeita formato fora do ISO', () => {
    expect(deriveAnoMes('14/05/2026')).toBeNull()
    expect(deriveAnoMes('')).toBeNull()
  })
})

describe('validateDespesa — caminho feliz', () => {
  it('normaliza e deriva ano/mes da data', () => {
    const v = ok(base)
    expect(v.ano).toBe(2026)
    expect(v.mes).toBe(5)
    expect(v.valor_total).toBe(1234.56)
    expect(v.descricao).toBe('Substrato para mudas')
  })

  it('ano/mes SEMPRE saem da data — a divergencia de eixo morre aqui', () => {
    const v = ok({ ...base, data: '2026-01-31' })
    expect(v.ano).toBe(2026)
    expect(v.mes).toBe(1)
  })

  it('colapsa espacos da descricao', () => {
    expect(ok({ ...base, descricao: '  Adubo   NPK  ' }).descricao).toBe('Adubo NPK')
  })

  it('aceita valor em formato de maquina', () => {
    expect(ok({ ...base, valor_total: 1234.56 }).valor_total).toBe(1234.56)
  })
})

describe('validateDespesa — data', () => {
  it('bloqueia data futura', () => {
    expect(erro({ ...base, data: '2026-09-01' })).toContain('futuro')
  })

  it('hoje e valido', () => {
    expect(ok({ ...base, data: '2026-08-04' }).mes).toBe(8)
  })

  it('bloqueia ano anterior a janela do BI', () => {
    expect(erro({ ...base, data: '2019-12-31' })).toContain(String(ANO_MINIMO))
  })

  it('exige data', () => {
    expect(erro({ ...base, data: '' })).toContain('data')
  })
})

describe('validateDespesa — valor', () => {
  it('rejeita zero — nao cria linha-fantasma', () => {
    expect(erro({ ...base, valor_total: '0' })).toContain('maior que zero')
  })

  it('rejeita negativo', () => {
    expect(erro({ ...base, valor_total: '-10' })).toContain('maior que zero')
  })

  it('rejeita valor ausente ou ilegivel', () => {
    expect(erro({ ...base, valor_total: '' })).toContain('valor')
    expect(erro({ ...base, valor_total: 'abc' })).toContain('valor')
  })

  it('rejeita valor absurdo', () => {
    expect(erro({ ...base, valor_total: '9999999' })).toContain('limite')
  })
})

describe('validateDespesa — categoria e centro', () => {
  it('categoria e OBRIGATORIA: nenhuma pendencia nova nasce', () => {
    expect(erro({ ...base, categoria_id: null })).toContain('categoria')
    expect(erro({ ...base, categoria_id: 0 })).toContain('categoria')
  })

  it('centro de custo e obrigatorio', () => {
    expect(erro({ ...base, centro_custo: '' })).toContain('centro de custo')
  })
})

describe('validateDespesa — descricao', () => {
  it('exige um minimo legivel', () => {
    expect(erro({ ...base, descricao: 'ab' })).toContain('mínimo')
  })

  it('limita o tamanho', () => {
    expect(erro({ ...base, descricao: 'x'.repeat(201) })).toContain('longa')
  })
})

describe('validateDespesa — quantidade e unidade', () => {
  it('quantidade sem unidade nao passa', () => {
    expect(erro({ ...base, quantidade: '10' })).toContain('unidade')
  })

  it('quantidade com unidade passa', () => {
    const v = ok({ ...base, quantidade: '10', unidade: 'SC' })
    expect(v.quantidade).toBe(10)
    expect(v.unidade).toBe('SC')
  })

  it('quantidade zero nao faz sentido', () => {
    expect(erro({ ...base, quantidade: '0', unidade: 'SC' })).toContain('quantidade')
  })

  it('ambos vazios e valido', () => {
    expect(ok(base).quantidade).toBeNull()
  })
})

describe('validateDespesa — decomposicao', () => {
  it('soma que bate com o total passa', () => {
    const v = ok({
      ...base, valor_total: '100,00',
      valor_mc: '60,00', mao_obra: '40,00',
    })
    expect(v.valor_mc).toBe(60)
    expect(v.mao_obra).toBe(40)
  })

  it('soma que nao bate e recusada', () => {
    expect(erro({
      ...base, valor_total: '100,00', valor_mc: '60,00', mao_obra: '30,00',
    })).toContain('não bate')
  })

  it('tolera diferenca de ate um centavo', () => {
    const v = ok({
      ...base, valor_total: '100,00',
      valor_mc: '33,33', mao_obra: '33,33', equipamento: '33,34',
    })
    expect(v.equipamento).toBe(33.34)
  })

  it('parte negativa e recusada', () => {
    expect(erro({ ...base, valor_mc: '-10' })).toContain('negativos')
  })

  it('sem decomposicao nao ha o que conferir', () => {
    expect(ok(base).valor_mc).toBeNull()
  })
})

describe('naturezaDerivada', () => {
  it('mapeia o rateio para a coluna legada', () => {
    expect(naturezaDerivada(100)).toBe('negocio')
    expect(naturezaDerivada(0)).toBe('pessoal')
    expect(naturezaDerivada(50)).toBe('misto')
  })

  it('indeterminado vira misto, nunca um extremo', () => {
    expect(naturezaDerivada(null)).toBe('misto')
  })
})
