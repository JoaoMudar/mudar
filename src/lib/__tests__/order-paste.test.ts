import { describe, it, expect } from 'vitest'
import {
  parseOrderLines,
  matchSpecies,
  diceCoefficient,
  buildPasteRows,
  type SpeciesOption,
} from '../order-paste'

const SPECIES: SpeciesOption[] = [
  { id: 's1', common_name: 'Ipê-amarelo' },
  { id: 's2', common_name: 'Araucária' },
  { id: 's3', common_name: 'Pitanga' },
  { id: 's4', common_name: 'Guabiroba' },
  { id: 's5', common_name: 'Cedro-rosa' },
]

describe('parseOrderLines', () => {
  it('numero no fim, varios separadores', () => {
    expect(parseOrderLines('Ipê amarelo 500')).toEqual([
      { raw: 'Ipê amarelo 500', name: 'Ipê amarelo', quantity: 500 },
    ])
    expect(parseOrderLines('Ipê amarelo - 500')[0]).toMatchObject({ name: 'Ipê amarelo', quantity: 500 })
    expect(parseOrderLines('Ipê amarelo: 500')[0]).toMatchObject({ name: 'Ipê amarelo', quantity: 500 })
    expect(parseOrderLines('Ipê amarelo x500')[0]).toMatchObject({ name: 'Ipê amarelo', quantity: 500 })
  })

  it('numero no inicio', () => {
    expect(parseOrderLines('200 araucaria')[0]).toMatchObject({ name: 'araucaria', quantity: 200 })
    expect(parseOrderLines('2x ipê amarelo')[0]).toMatchObject({ name: 'ipê amarelo', quantity: 2 })
    expect(parseOrderLines('1.000 - guabiroba')[0]).toMatchObject({ name: 'guabiroba', quantity: 1000 })
  })

  it('separador de milhar (ponto e virgula) vira inteiro', () => {
    expect(parseOrderLines('guabiroba 1.000')[0].quantity).toBe(1000)
    expect(parseOrderLines('guabiroba 1,000')[0].quantity).toBe(1000)
    expect(parseOrderLines('guabiroba 1500')[0].quantity).toBe(1500)
  })

  it('unidade grudada na quantidade e ignorada', () => {
    expect(parseOrderLines('pitanga 100 mudas')[0]).toMatchObject({ name: 'pitanga', quantity: 100 })
    expect(parseOrderLines('pitanga 100un')[0]).toMatchObject({ name: 'pitanga', quantity: 100 })
  })

  it('marcadores de lista sao removidos', () => {
    expect(parseOrderLines('- ipê 500')[0]).toMatchObject({ name: 'ipê', quantity: 500 })
    expect(parseOrderLines('• ipê 500')[0]).toMatchObject({ name: 'ipê', quantity: 500 })
    expect(parseOrderLines('1) ipê amarelo 500')[0]).toMatchObject({ name: 'ipê amarelo', quantity: 500 })
    expect(parseOrderLines('2. araucaria 200')[0]).toMatchObject({ name: 'araucaria', quantity: 200 })
  })

  it('linha sem quantidade mantem nome e quantity null', () => {
    expect(parseOrderLines('Ipê amarelo')[0]).toMatchObject({ name: 'Ipê amarelo', quantity: null })
  })

  it('linhas vazias e ruido (so numero) sao descartadas', () => {
    expect(parseOrderLines('\n\n  \n')).toEqual([])
    expect(parseOrderLines('500')).toEqual([])
    expect(parseOrderLines('---')).toEqual([])
  })

  it('texto multilinha com formatos misturados', () => {
    const text = `Ipê amarelo - 500
200 araucaria
pitangas 100
guabiroba 1.000`
    const rows = parseOrderLines(text)
    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.quantity)).toEqual([500, 200, 100, 1000])
  })
})

describe('diceCoefficient', () => {
  it('strings iguais = 1', () => {
    expect(diceCoefficient('pitanga', 'pitanga')).toBe(1)
  })
  it('strings sem nada em comum = 0', () => {
    expect(diceCoefficient('ipe', 'xyz')).toBe(0)
  })
  it('typo proximo tem score alto', () => {
    expect(diceCoefficient('aracaria', 'araucaria')).toBeGreaterThan(0.7)
  })
  it('vazio nao quebra', () => {
    expect(diceCoefficient('', '')).toBe(0)
    expect(diceCoefficient('a', '')).toBe(0)
  })
})

describe('matchSpecies', () => {
  it('casa exato ignorando acento e hifen', () => {
    const m = matchSpecies('ipe amarelo', SPECIES)
    expect(m.status).toBe('exact')
    expect(m.speciesId).toBe('s1')
  })
  it('casa exato com acento na entrada', () => {
    expect(matchSpecies('Araucária', SPECIES).speciesId).toBe('s2')
  })
  it('casa plural com singular do cadastro', () => {
    const m = matchSpecies('pitangas', SPECIES)
    expect(m.speciesId).toBe('s3')
    expect(m.status).toBe('exact')
  })
  it('typo vira provavel (likely) e pre-seleciona', () => {
    const m = matchSpecies('aracaria', SPECIES)
    expect(m.status).toBe('likely')
    expect(m.speciesId).toBe('s2')
  })
  it('contem parcial casa como provavel', () => {
    const m = matchSpecies('cedro', SPECIES)
    expect(m.speciesId).toBe('s5')
    expect(m.status).toBe('likely')
  })
  it('nome desconhecido nao sugere especie', () => {
    const m = matchSpecies('xaxim', SPECIES)
    expect(m.status).toBe('none')
    expect(m.speciesId).toBeNull()
  })
  it('nome vazio = none', () => {
    expect(matchSpecies('', SPECIES).status).toBe('none')
  })

  it('match pelo principal nao preenche matchedVia', () => {
    expect(matchSpecies('ipe amarelo', SPECIES).matchedVia).toBeNull()
  })
})

describe('matchSpecies — sinônimos e nome científico', () => {
  const WITH_NAMES: SpeciesOption[] = [
    {
      id: 's1',
      common_name: 'Ipê-amarelo',
      scientific_name: 'Handroanthus albus',
      popular_names: ['Ipê-da-serra'],
    },
    { id: 's2', common_name: 'Jacarandá', popular_names: ['Caroba', 'Carobinha'] },
    { id: 's3', common_name: 'Pitanga' },
  ]

  it('casa exato por sinônimo, retornando a espécie dona e matchedVia', () => {
    const m = matchSpecies('caroba', WITH_NAMES)
    expect(m.status).toBe('exact')
    expect(m.speciesId).toBe('s2')
    expect(m.speciesName).toBe('Jacarandá')
    expect(m.matchedVia).toBe('Caroba')
  })

  it('casa exato pelo nome científico', () => {
    const m = matchSpecies('handroanthus albus', WITH_NAMES)
    expect(m.status).toBe('exact')
    expect(m.speciesId).toBe('s1')
    expect(m.matchedVia).toBe('Handroanthus albus')
  })

  it('fuzzy em sinônimo vira provável com matchedVia', () => {
    const m = matchSpecies('carobinia', WITH_NAMES) // typo de "Carobinha"
    expect(m.status).toBe('likely')
    expect(m.speciesId).toBe('s2')
    expect(m.matchedVia).toBe('Carobinha')
  })

  it('plural de sinônimo casa exato', () => {
    const m = matchSpecies('carobas', WITH_NAMES)
    expect(m.status).toBe('exact')
    expect(m.speciesId).toBe('s2')
  })

  it('principal exato vence sinônimo fuzzy de outra espécie', () => {
    const species: SpeciesOption[] = [
      { id: 'a', common_name: 'Pitanga' },
      { id: 'b', common_name: 'Goiaba', popular_names: ['Pitangao'] },
    ]
    const m = matchSpecies('pitanga', species)
    expect(m.speciesId).toBe('a')
    expect(m.status).toBe('exact')
    expect(m.matchedVia).toBeNull()
  })

  it('retrocompatível: SpeciesOption sem os campos novos segue funcionando', () => {
    const m = matchSpecies('pitanga', WITH_NAMES)
    expect(m.speciesId).toBe('s3')
    expect(m.status).toBe('exact')
  })
})

describe('buildPasteRows', () => {
  it('combina parse + casamento', () => {
    const text = `Ipê amarelo 500
xaxim 50`
    const rows = buildPasteRows(text, SPECIES)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ quantity: 500, match: { status: 'exact', speciesId: 's1' } })
    expect(rows[1]).toMatchObject({ quantity: 50, match: { status: 'none', speciesId: null } })
  })
})
