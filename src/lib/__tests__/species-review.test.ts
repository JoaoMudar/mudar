import { describe, it, expect } from 'vitest'
import { isSpeciesIncomplete, googleSearchUrl } from '../species-review'

describe('isSpeciesIncomplete — heuristica de cadastro incompleto', () => {
  it('e incompleta quando nao tem nome cientifico nem tags', () => {
    expect(isSpeciesIncomplete({ scientific_name: null, tags: null })).toBe(true)
    expect(isSpeciesIncomplete({ scientific_name: '', tags: [] })).toBe(true)
    expect(isSpeciesIncomplete({})).toBe(true)
  })

  it('e completa quando tem nome cientifico', () => {
    expect(isSpeciesIncomplete({ scientific_name: 'Handroanthus albus', tags: [] })).toBe(false)
  })

  it('e completa quando tem ao menos uma tag', () => {
    expect(isSpeciesIncomplete({ scientific_name: null, tags: ['nativa'] })).toBe(false)
  })

  it('trata nome cientifico so com espacos como vazio', () => {
    expect(isSpeciesIncomplete({ scientific_name: '   ', tags: [] })).toBe(true)
  })

  it('tags vazio com nome cientifico em branco continua incompleta', () => {
    expect(isSpeciesIncomplete({ scientific_name: undefined, tags: undefined })).toBe(true)
  })
})

describe('googleSearchUrl — busca de apoio', () => {
  it('aponta para o google search', () => {
    expect(googleSearchUrl('Cambucá')).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
  })

  it('inclui o nome popular e os termos de apoio (codificados)', () => {
    const url = googleSearchUrl('Cambucá')
    const query = decodeURIComponent(url.split('q=')[1])
    expect(query).toContain('Cambucá')
    expect(query).toContain('nome científico')
    expect(query).toContain('categoria')
  })

  it('codifica espacos e acentos sem quebrar a URL', () => {
    const url = googleSearchUrl('Ipê amarelo')
    expect(url).not.toContain(' ')
    expect(decodeURIComponent(url.split('q=')[1])).toContain('Ipê amarelo')
  })
})
