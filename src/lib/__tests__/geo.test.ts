import { describe, it, expect } from 'vitest'
import {
  VIVEIRO_FALLBACK,
  compareQuoteCandidates,
  distanceFromViveiroKm,
  formatDistanceKm,
  haversineKm,
  viveiroCoords,
} from '../geo'

describe('viveiroCoords', () => {
  it('usa as envs quando ambas sao validas (aceita virgula decimal)', () => {
    expect(viveiroCoords('-27.5', '-49.5')).toEqual({ lat: -27.5, lng: -49.5 })
    expect(viveiroCoords('-27,5', '-49,5')).toEqual({ lat: -27.5, lng: -49.5 })
  })

  it('qualquer env ausente/invalida cai no fallback (Ituporanga/SC)', () => {
    expect(viveiroCoords(undefined, undefined)).toEqual(VIVEIRO_FALLBACK)
    expect(viveiroCoords('-27.5', undefined)).toEqual(VIVEIRO_FALLBACK)
    expect(viveiroCoords('abc', '-49.5')).toEqual(VIVEIRO_FALLBACK)
  })
})

describe('haversineKm', () => {
  it('mesmo ponto = 0 km', () => {
    expect(haversineKm(VIVEIRO_FALLBACK, VIVEIRO_FALLBACK)).toBe(0)
  })

  it('1 grau de latitude ≈ 111 km', () => {
    const km = haversineKm({ lat: -27, lng: -49 }, { lat: -28, lng: -49 })
    expect(km).toBeGreaterThan(110)
    expect(km).toBeLessThan(112.5)
  })

  it('Ituporanga → Florianopolis ≈ 100 km em linha reta', () => {
    const floripa = { lat: -27.5954, lng: -48.548 }
    const km = haversineKm(VIVEIRO_FALLBACK, floripa)
    expect(km).toBeGreaterThan(90)
    expect(km).toBeLessThan(115)
  })
})

describe('distanceFromViveiroKm', () => {
  it('aceita lat/lng como string (NUMERIC do pg chega como string)', () => {
    expect(distanceFromViveiroKm('-27.4144', '-49.6028', VIVEIRO_FALLBACK)).toBe(0)
  })

  it('sem coordenadas retorna null', () => {
    expect(distanceFromViveiroKm(null, null, VIVEIRO_FALLBACK)).toBeNull()
    expect(distanceFromViveiroKm('-27.4', null, VIVEIRO_FALLBACK)).toBeNull()
    expect(distanceFromViveiroKm('abc', '-49.6', VIVEIRO_FALLBACK)).toBeNull()
  })
})

describe('formatDistanceKm', () => {
  it('arredonda pro inteiro com prefixo ~', () => {
    expect(formatDistanceKm(12.3)).toBe('~12 km')
    expect(formatDistanceKm(0.4)).toBe('~0 km')
  })

  it('null/invalido vira string vazia', () => {
    expect(formatDistanceKm(null)).toBe('')
    expect(formatDistanceKm(undefined)).toBe('')
    expect(formatDistanceKm(NaN)).toBe('')
  })
})

describe('compareQuoteCandidates', () => {
  const base = { coverage_count: 2, distance_km: 50, last_contacted_at: null, name: 'B' }

  it('cobertura maior vem primeiro', () => {
    const list = [base, { ...base, coverage_count: 3, name: 'A' }]
    list.sort(compareQuoteCandidates)
    expect(list[0].coverage_count).toBe(3)
  })

  it('na mesma cobertura, mais perto vem primeiro e sem distancia vai pro fim', () => {
    const perto = { ...base, distance_km: 10, name: 'Perto' }
    const longe = { ...base, distance_km: 200, name: 'Longe' }
    const semGeo = { ...base, distance_km: null, name: 'Sem geo' }
    const list = [semGeo, longe, perto]
    list.sort(compareQuoteCandidates)
    expect(list.map((s) => s.name)).toEqual(['Perto', 'Longe', 'Sem geo'])
  })

  it('no empate de distancia, contato mais antigo (ou nunca contatado) primeiro', () => {
    const nunca = { ...base, name: 'Nunca' }
    const antigo = { ...base, last_contacted_at: '2026-01-01T00:00:00Z', name: 'Antigo' }
    const recente = { ...base, last_contacted_at: '2026-06-01T00:00:00Z', name: 'Recente' }
    const list = [recente, antigo, nunca]
    list.sort(compareQuoteCandidates)
    expect(list.map((s) => s.name)).toEqual(['Nunca', 'Antigo', 'Recente'])
  })

  it('desempate final por nome', () => {
    const list = [
      { ...base, name: 'Zeta' },
      { ...base, name: 'Alfa' },
    ]
    list.sort(compareQuoteCandidates)
    expect(list[0].name).toBe('Alfa')
  })
})
