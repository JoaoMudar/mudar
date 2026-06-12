// Geocoding de fornecedores via Nominatim/OpenStreetMap (P11 Fase 4).
// Helpers PUROS (montar URL, interpretar resposta) — o fetch fica na action.
//
// Politica de uso do Nominatim (https://operations.osmfoundation.org/policies/nominatim/):
// maximo 1 requisicao/segundo, User-Agent identificando a aplicacao, e cache
// dos resultados — por isso lat/lng/geocoded_at ficam gravados em suppliers e
// a geocodificacao e SOB DEMANDA (botao no mapa), nunca em loop automatico.

import type { LatLng } from './geo'

export const NOMINATIM_USER_AGENT =
  'viveiro-mudar/1.0 (sistema de gestao de viveiro; github.com/JoaoMudar/mudar)'

/** Pausa minima entre requisicoes consecutivas ao Nominatim (politica: 1 req/s). */
export const NOMINATIM_DELAY_MS = 1100

export interface GeocodeQueryInput {
  city?: string | null
  state?: string | null
}

/**
 * URL de busca no Nominatim para cidade/UF (restrita ao Brasil).
 * Sem cidade nao ha o que buscar → null.
 */
export function buildNominatimUrl(input: GeocodeQueryInput): string | null {
  const city = input.city?.trim()
  if (!city) return null
  const state = input.state?.trim()
  const q = state ? `${city}, ${state}` : city
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'br',
    q,
  })
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`
}

/** Extrai lat/lng do JSON do Nominatim; resposta vazia/inesperada → null. */
export function parseNominatimResponse(json: unknown): LatLng | null {
  if (!Array.isArray(json) || json.length === 0) return null
  const first = json[0] as { lat?: unknown; lon?: unknown }
  const lat = Number(first?.lat)
  const lng = Number(first?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}
