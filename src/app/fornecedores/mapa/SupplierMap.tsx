'use client'

import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDistanceKm, haversineKm, type LatLng } from '@/lib/geo'
import { SUPPLIER_STATUS_META, type SupplierStatus } from '@/lib/suppliers'
import type { MapSupplier } from './MapClient'

interface Props {
  suppliers: MapSupplier[]
  viveiro: LatLng
}

// Cor do marcador por estagio do relacionamento (mesma semantica dos badges).
const STATUS_COLOR: Record<SupplierStatus, string> = {
  lead: '#2563eb',
  active: '#16a34a',
  inactive: '#9ca3af',
  do_not_contact: '#dc2626',
}

/**
 * Mapa Leaflet (so client — importado com ssr: false). CircleMarker em vez de
 * icone padrao do Leaflet para nao depender dos assets de imagem do pacote.
 */
export default function SupplierMap({ suppliers, viveiro }: Props) {
  return (
    <MapContainer
      center={[viveiro.lat, viveiro.lng]}
      zoom={8}
      scrollWheelZoom
      style={{ height: '65vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CircleMarker
        center={[viveiro.lat, viveiro.lng]}
        radius={10}
        pathOptions={{ color: '#14532d', fillColor: '#14532d', fillOpacity: 0.9 }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]}>
          Viveiro Mudar
        </Tooltip>
      </CircleMarker>

      {suppliers.map((s) => {
        const lat = Number(s.lat)
        const lng = Number(s.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        const distance = formatDistanceKm(haversineKm({ lat, lng }, viveiro))
        const meta = SUPPLIER_STATUS_META[s.status]
        return (
          <CircleMarker
            key={s.id}
            center={[lat, lng]}
            radius={8}
            pathOptions={{
              color: STATUS_COLOR[s.status] ?? '#16a34a',
              fillColor: STATUS_COLOR[s.status] ?? '#16a34a',
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <div className="text-sm space-y-0.5">
                <p className="font-bold">{s.name}</p>
                <p>
                  {[s.city && `${s.city}${s.state ? `/${s.state}` : ''}`, distance]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p>
                  {meta?.label ?? s.status} · {s.species_count} espécie(s)
                </p>
                <a href={`/fornecedores/${s.id}`} className="font-semibold text-green-700">
                  Abrir cadastro →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
