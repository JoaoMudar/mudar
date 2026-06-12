// Distancias geograficas para a rede de fornecedores (P11 Fase 4).
// Funcoes puras, sem DB nem React — testadas isoladamente.

export interface LatLng {
  lat: number
  lng: number
}

/** Sede do viveiro quando VIVEIRO_LAT/VIVEIRO_LNG nao estao definidas (Ituporanga/SC). */
export const VIVEIRO_FALLBACK: LatLng = { lat: -27.4144, lng: -49.6028 }

function parseCoord(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Coordenadas da sede a partir das envs (VIVEIRO_LAT/VIVEIRO_LNG), com
 * fallback em Ituporanga/SC. So usa o par quando AMBAS sao validas.
 */
export function viveiroCoords(
  latEnv: string | null | undefined,
  lngEnv: string | null | undefined,
): LatLng {
  const lat = parseCoord(latEnv)
  const lng = parseCoord(lngEnv)
  if (lat != null && lng != null) return { lat, lng }
  return VIVEIRO_FALLBACK
}

const EARTH_RADIUS_KM = 6371

/** Distancia em linha reta (haversine), em km, arredondada a 1 decimal. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  const km = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
  return Math.round(km * 10) / 10
}

/** Distancia do fornecedor ate a sede; null quando ele ainda nao tem lat/lng. */
export function distanceFromViveiroKm(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
  viveiro: LatLng,
): number | null {
  const nLat = typeof lat === 'string' ? Number(lat) : lat
  const nLng = typeof lng === 'string' ? Number(lng) : lng
  if (nLat == null || nLng == null || !Number.isFinite(nLat) || !Number.isFinite(nLng)) {
    return null
  }
  return haversineKm({ lat: nLat, lng: nLng }, viveiro)
}

/** "12.3" → "~12 km" (arredonda pro inteiro; distancia e estimativa em linha reta). */
export function formatDistanceKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return ''
  return `~${Math.round(km)} km`
}

export interface QuoteCandidateOrderable {
  coverage_count: number
  distance_km: number | null
  last_contacted_at: string | null
  name: string
}

/**
 * Ordem dos candidatos de cotacao (P11 F4): cobertura DESC (quem atende mais
 * itens primeiro), distancia ASC com nulls por ultimo (mais perto = frete
 * menor), contato mais antigo primeiro (distribui o outreach) e nome.
 */
export function compareQuoteCandidates(
  a: QuoteCandidateOrderable,
  b: QuoteCandidateOrderable,
): number {
  if (a.coverage_count !== b.coverage_count) return b.coverage_count - a.coverage_count
  if (a.distance_km != null || b.distance_km != null) {
    if (a.distance_km == null) return 1
    if (b.distance_km == null) return -1
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km
  }
  const aContact = a.last_contacted_at ? Date.parse(a.last_contacted_at) : -Infinity
  const bContact = b.last_contacted_at ? Date.parse(b.last_contacted_at) : -Infinity
  if (aContact !== bContact) return aContact - bContact
  return a.name.localeCompare(b.name, 'pt-BR')
}
