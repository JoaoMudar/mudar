import { requireRole } from '@/lib/auth'
import { viveiroCoords } from '@/lib/geo'
import { getSuppliersForMap } from '../actions'
import MapClient, { type MapSupplier } from './MapClient'

export const dynamic = 'force-dynamic'

/**
 * Mapa da rede de fornecedores (P11 Fase 4). O Leaflet so roda no client
 * (import dinamico com ssr: false dentro do MapClient).
 */
export default async function MapaFornecedoresPage() {
  await requireRole('admin', 'chefia')

  let suppliers: MapSupplier[] = []
  let pending = 0
  try {
    const result = await getSuppliersForMap()
    suppliers = result.suppliers as MapSupplier[]
    pending = result.pending
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return (
    <MapClient
      suppliers={suppliers}
      pending={pending}
      viveiro={viveiroCoords(process.env.VIVEIRO_LAT, process.env.VIVEIRO_LNG)}
    />
  )
}
