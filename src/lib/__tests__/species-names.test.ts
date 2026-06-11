import { describe, it, expect } from 'vitest'
import { normalizePopularName, findNameConflict, type KnownName } from '../species-names'

describe('normalizePopularName', () => {
  it('remove acentos e baixa a caixa', () => {
    expect(normalizePopularName('Ipê-Amarelo')).toBe('ipe amarelo')
    expect(normalizePopularName('ARAUCÁRIA')).toBe('araucaria')
  })

  it('troca hifen, underscore e barra por espaço', () => {
    expect(normalizePopularName('cereja-do-rio-grande')).toBe('cereja do rio grande')
    expect(normalizePopularName('guabiroba/guavirova')).toBe('guabiroba guavirova')
    expect(normalizePopularName('nome_com_underscore')).toBe('nome com underscore')
  })

  it('colapsa espaços e apara as pontas', () => {
    expect(normalizePopularName('  ipê   amarelo  ')).toBe('ipe amarelo')
  })

  it('string vazia ou só separadores vira vazia', () => {
    expect(normalizePopularName('')).toBe('')
    expect(normalizePopularName(' - / ')).toBe('')
  })
})

describe('findNameConflict', () => {
  const known: KnownName[] = [
    { speciesId: 'sp-1', name: 'Ipê-amarelo', speciesLabel: 'Ipê-amarelo' },
    { speciesId: 'sp-1', name: 'Ipê-da-serra', speciesLabel: 'Ipê-amarelo' },
    { speciesId: 'sp-2', name: 'Jacarandá', speciesLabel: 'Jacarandá' },
    { speciesId: 'sp-2', name: 'Caroba', speciesLabel: 'Jacarandá' },
  ]

  it('acha conflito com nome principal (normalizado)', () => {
    const c = findNameConflict('ipe amarelo', known)
    expect(c).toMatchObject({ speciesId: 'sp-1', speciesLabel: 'Ipê-amarelo' })
  })

  it('acha conflito com sinônimo de outra espécie', () => {
    const c = findNameConflict('CAROBA', known)
    expect(c).toMatchObject({ speciesId: 'sp-2', speciesLabel: 'Jacarandá' })
  })

  it('respeita excludeSpeciesId (manter o próprio nome não conflita)', () => {
    expect(findNameConflict('Ipê-amarelo', known, 'sp-1')).toBeNull()
    expect(findNameConflict('ipe da serra', known, 'sp-1')).toBeNull()
  })

  it('exclude de uma espécie não libera nome de outra', () => {
    const c = findNameConflict('Caroba', known, 'sp-1')
    expect(c).toMatchObject({ speciesId: 'sp-2' })
  })

  it('retorna null quando o nome está livre', () => {
    expect(findNameConflict('Pitanga', known)).toBeNull()
  })

  it('retorna null para candidato vazio', () => {
    expect(findNameConflict('   ', known)).toBeNull()
  })
})
