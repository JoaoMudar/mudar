'use client'

import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { COR } from '@/components/charts/palette'
import { formatBRLInteiro } from '@/lib/format'
import type { LatLng } from '@/lib/geo'
import type { MunicipioVenda } from '../queries'

interface Props {
  municipios: MunicipioVenda[]
  /** Resolvido no servidor (VIVEIRO_LAT/LNG), como em fornecedores/mapa/page.tsx. */
  viveiro: LatLng
}

/**
 * Mapa de vendas por municipio (so client — importado com ssr: false).
 *
 * CircleMarker em vez do icone padrao do Leaflet para nao depender dos assets de
 * imagem do pacote — mesmo motivo de src/app/fornecedores/mapa/SupplierMap.tsx.
 */
export default function VendasMapa({ municipios, viveiro }: Props) {
  const comCoord = municipios.filter(
    (m) => m.latitude != null && m.longitude != null && m.receita > 0,
  )
  const maxReceita = Math.max(...comCoord.map((m) => m.receita), 1)

  // Raio pela RAIZ da receita: area do circulo fica proporcional ao valor.
  // Escalar o raio direto exageraria os grandes (area cresce ao quadrado).
  const raio = (receita: number) => 4 + Math.sqrt(receita / maxReceita) * 18

  return (
    <MapContainer
      center={[viveiro.lat, viveiro.lng]}
      zoom={7}
      scrollWheelZoom
      style={{ height: '60vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CircleMarker
        center={[viveiro.lat, viveiro.lng]}
        radius={6}
        pathOptions={{ color: '#14532d', fillColor: '#14532d', fillOpacity: 1 }}
      >
        <Tooltip direction="top" offset={[0, -6]}>Viveiro Mudar</Tooltip>
      </CircleMarker>

      {comCoord.map((m) => (
        <CircleMarker
          key={`${m.municipio}-${m.uf}`}
          center={[m.latitude!, m.longitude!]}
          radius={raio(m.receita)}
          pathOptions={{
            color: COR.receita,
            fillColor: COR.receita,
            fillOpacity: 0.45,
            weight: 1.5,
          }}
        >
          <Tooltip direction="top">
            <span className="font-semibold">{m.municipio}/{m.uf}</span>
            <br />
            {formatBRLInteiro(m.receita)} · {m.notas} {m.notas === 1 ? 'nota' : 'notas'}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
