import { describe, it, expect } from 'vitest'
import { normalizeQuoteChannel, validateQuoteItems } from '../quotes'

describe('normalizeQuoteChannel', () => {
  it('aceita canais validos', () => {
    expect(normalizeQuoteChannel('whatsapp')).toBe('whatsapp')
    expect(normalizeQuoteChannel('manual')).toBe('manual')
  })

  it('invalido/vazio vira whatsapp (canal padrao)', () => {
    expect(normalizeQuoteChannel('pombo-correio')).toBe('whatsapp')
    expect(normalizeQuoteChannel(null)).toBe('whatsapp')
    expect(normalizeQuoteChannel(undefined)).toBe('whatsapp')
  })
})

describe('validateQuoteItems', () => {
  it('lista valida passa', () => {
    expect(validateQuoteItems([{ species_id: 'sp1', quantity: 10 }])).toBeNull()
  })

  it('lista vazia ou ausente falha', () => {
    expect(validateQuoteItems([])).toMatch(/ao menos uma espécie/i)
    expect(validateQuoteItems(null)).toMatch(/ao menos uma espécie/i)
  })

  it('item sem especie falha', () => {
    expect(validateQuoteItems([{ species_id: '', quantity: 5 }])).toMatch(/espécie/i)
  })

  it('quantidade zero/negativa/NaN falha', () => {
    expect(validateQuoteItems([{ species_id: 'sp1', quantity: 0 }])).toMatch(/quantidade/i)
    expect(validateQuoteItems([{ species_id: 'sp1', quantity: -2 }])).toMatch(/quantidade/i)
    expect(validateQuoteItems([{ species_id: 'sp1', quantity: NaN }])).toMatch(/quantidade/i)
  })
})
