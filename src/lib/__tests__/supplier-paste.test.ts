import { describe, it, expect } from 'vitest'
import {
  parsePriceBR,
  extractPriceToken,
  extractSizeToken,
  buildSupplierPasteRows,
} from '../supplier-paste'
import type { SpeciesOption } from '../order-paste'

const SPECIES: SpeciesOption[] = [
  { id: 'sp-ipe', common_name: 'Ipê-amarelo', scientific_name: 'Handroanthus chrysotrichus' },
  { id: 'sp-arau', common_name: 'Araucária', popular_names: ['pinheiro brasileiro'] },
  { id: 'sp-pit', common_name: 'Pitanga' },
]

describe('parsePriceBR', () => {
  it('virgula como decimal', () => {
    expect(parsePriceBR('4,50')).toBe(4.5)
    expect(parsePriceBR('12,00')).toBe(12)
  })
  it('milhar com ponto + decimal com virgula', () => {
    expect(parsePriceBR('1.234,56')).toBe(1234.56)
  })
  it('ponto com exatamente 2 casas e decimal', () => {
    expect(parsePriceBR('4.50')).toBe(4.5)
  })
  it('ponto de milhar sem virgula', () => {
    expect(parsePriceBR('1.000')).toBe(1000)
  })
  it('inteiro simples', () => {
    expect(parsePriceBR('5')).toBe(5)
  })
  it('lixo retorna null', () => {
    expect(parsePriceBR('abc')).toBeNull()
    expect(parsePriceBR('')).toBeNull()
  })
})

describe('extractPriceToken', () => {
  it('R$ explicito no fim', () => {
    expect(extractPriceToken('Ipê amarelo 30cm R$ 4,50')).toEqual({
      rest: 'Ipê amarelo 30cm',
      price: 4.5,
    })
  })
  it('R$ sem espaco e no meio', () => {
    const { rest, price } = extractPriceToken('Ipê R$4,50 cada')
    expect(price).toBe(4.5)
    expect(rest).toBe('Ipê cada')
  })
  it('decimal com centavos no fim sem R$', () => {
    expect(extractPriceToken('Araucária 1m - 12,00')).toEqual({
      rest: 'Araucária 1m',
      price: 12,
    })
  })
  it('inteiro no fim NAO vira preco (e quantidade)', () => {
    expect(extractPriceToken('Ipê amarelo 500')).toEqual({
      rest: 'Ipê amarelo 500',
      price: null,
    })
  })
  it('linha sem preco fica intacta', () => {
    expect(extractPriceToken('pitanga')).toEqual({ rest: 'pitanga', price: null })
  })
})

describe('extractSizeToken', () => {
  it('tamanho simples em cm', () => {
    expect(extractSizeToken('Ipê amarelo 30cm')).toEqual({
      rest: 'Ipê amarelo',
      size: '30cm',
    })
  })
  it('faixa de tamanho', () => {
    expect(extractSizeToken('Ipê 30-50cm')).toEqual({ rest: 'Ipê', size: '30-50cm' })
  })
  it('metros com decimal', () => {
    expect(extractSizeToken('Palmeira 1,5m')).toEqual({ rest: 'Palmeira', size: '1,5m' })
  })
  it('"mudas" nao e tamanho (m de palavra)', () => {
    expect(extractSizeToken('Ipê 100 mudas')).toEqual({
      rest: 'Ipê 100 mudas',
      size: null,
    })
  })
  it('linha sem tamanho fica intacta', () => {
    expect(extractSizeToken('pitanga')).toEqual({ rest: 'pitanga', size: null })
  })
})

describe('buildSupplierPasteRows', () => {
  it('linha completa: nome + tamanho + preco', () => {
    const rows = buildSupplierPasteRows('Ipê amarelo 30cm R$ 4,50', SPECIES)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: 'Ipê amarelo',
      price: 4.5,
      size: '30cm',
    })
    expect(rows[0].match.status).toBe('exact')
    expect(rows[0].match.speciesId).toBe('sp-ipe')
  })

  it('casa por sinonimo', () => {
    const rows = buildSupplierPasteRows('pinheiro brasileiro 1m - 12,00', SPECIES)
    expect(rows[0].match.speciesId).toBe('sp-arau')
    expect(rows[0].price).toBe(12)
    expect(rows[0].size).toBe('1m')
  })

  it('linha so com nome (sem preco/tamanho)', () => {
    const rows = buildSupplierPasteRows('pitanga', SPECIES)
    expect(rows[0]).toMatchObject({ name: 'pitanga', price: null, size: null })
    expect(rows[0].match.speciesId).toBe('sp-pit')
  })

  it('varias linhas, descartando vazias e ruido', () => {
    const text = 'Ipê amarelo R$ 4,50\n\n---\nAraucária 1m'
    const rows = buildSupplierPasteRows(text, SPECIES)
    expect(rows).toHaveLength(2)
    expect(rows[0].price).toBe(4.5)
    expect(rows[1].size).toBe('1m')
  })

  it('nome desconhecido vira status none', () => {
    const rows = buildSupplierPasteRows('jabuticabeira gigante R$ 30,00', SPECIES)
    expect(rows[0].match.status).toBe('none')
    expect(rows[0].price).toBe(30)
  })

  it('raw preserva a linha original com preco e tamanho', () => {
    const rows = buildSupplierPasteRows('Ipê amarelo 30cm R$ 4,50', SPECIES)
    expect(rows[0].raw).toBe('Ipê amarelo 30cm R$ 4,50')
  })
})
