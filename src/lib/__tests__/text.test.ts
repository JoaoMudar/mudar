import { describe, it, expect } from 'vitest'
import { normalizeText, matchesSearch } from '../text'

describe('normalizeText', () => {
  it('remove acentos', () => {
    expect(normalizeText('Ipê')).toBe('ipe')
    expect(normalizeText('Araucária')).toBe('araucaria')
    expect(normalizeText('Cedro-rosa açaí')).toBe('cedro-rosa acai')
  })
  it('coloca em minusculo', () => {
    expect(normalizeText('IPÊ AMARELO')).toBe('ipe amarelo')
  })
  it('remove espacos das pontas', () => {
    expect(normalizeText('  ipe  ')).toBe('ipe')
  })
  it('texto vazio vira vazio', () => {
    expect(normalizeText('')).toBe('')
  })
})

describe('matchesSearch', () => {
  it('encontra ignorando acento e caixa', () => {
    expect(matchesSearch('Ipê Amarelo', 'ipe')).toBe(true)
    expect(matchesSearch('Ipê Amarelo', 'IPE')).toBe(true)
    expect(matchesSearch('Ipê Amarelo', 'amarelo')).toBe(true)
  })
  it('casa busca parcial no meio do texto', () => {
    expect(matchesSearch('Araucária', 'cari')).toBe(true)
  })
  it('busca acentuada tambem encontra o normalizado', () => {
    expect(matchesSearch('Ipe Amarelo', 'ipê')).toBe(true)
  })
  it('busca vazia casa com tudo', () => {
    expect(matchesSearch('qualquer coisa', '')).toBe(true)
    expect(matchesSearch('qualquer coisa', '   ')).toBe(true)
  })
  it('retorna false quando nao encontra', () => {
    expect(matchesSearch('Ipê Amarelo', 'cedro')).toBe(false)
  })
})
