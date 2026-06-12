import { describe, it, expect } from 'vitest'
import { buildNominatimUrl, parseNominatimResponse } from '../geocode'

describe('buildNominatimUrl', () => {
  it('monta a busca cidade, UF restrita ao Brasil com limit 1', () => {
    const url = buildNominatimUrl({ city: 'Rio do Sul', state: 'SC' })
    expect(url).toContain('https://nominatim.openstreetmap.org/search?')
    expect(url).toContain('q=Rio+do+Sul%2C+SC')
    expect(url).toContain('countrycodes=br')
    expect(url).toContain('limit=1')
    expect(url).toContain('format=jsonv2')
  })

  it('sem UF busca so pela cidade', () => {
    expect(buildNominatimUrl({ city: 'Ituporanga' })).toContain('q=Ituporanga')
  })

  it('sem cidade nao ha o que geocodificar', () => {
    expect(buildNominatimUrl({ city: null, state: 'SC' })).toBeNull()
    expect(buildNominatimUrl({ city: '   ' })).toBeNull()
  })
})

describe('parseNominatimResponse', () => {
  it('extrai lat/lng do primeiro resultado (strings do Nominatim)', () => {
    const json = [{ lat: '-27.4144', lon: '-49.6028', display_name: 'Ituporanga, SC' }]
    expect(parseNominatimResponse(json)).toEqual({ lat: -27.4144, lng: -49.6028 })
  })

  it('resposta vazia ou inesperada retorna null', () => {
    expect(parseNominatimResponse([])).toBeNull()
    expect(parseNominatimResponse(null)).toBeNull()
    expect(parseNominatimResponse({ error: 'x' })).toBeNull()
    expect(parseNominatimResponse([{ lat: 'abc', lon: '-49' }])).toBeNull()
  })

  it('coordenadas fora do globo sao rejeitadas', () => {
    expect(parseNominatimResponse([{ lat: '120', lon: '-49' }])).toBeNull()
    expect(parseNominatimResponse([{ lat: '-27', lon: '200' }])).toBeNull()
  })
})
