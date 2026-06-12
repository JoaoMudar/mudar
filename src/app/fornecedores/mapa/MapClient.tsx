'use client'

import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import type { LatLng } from '@/lib/geo'
import type { SupplierStatus } from '@/lib/suppliers'
import { geocodePendingSuppliers } from '../actions'

export interface MapSupplier {
  id: string
  name: string
  city: string | null
  state: string | null
  status: SupplierStatus
  lat: string | number
  lng: string | number
  species_count: number
}

interface Props {
  suppliers: MapSupplier[]
  /** Fornecedores ativos com cidade que ainda nao tentaram geocodificar. */
  pending: number
  viveiro: LatLng
}

interface ToastState {
  message: string
  type: ToastType
}

// Leaflet mexe em window/document → so client, sem SSR.
const SupplierMap = nextDynamic(() => import('./SupplierMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[65vh] flex items-center justify-center text-gray-400 text-sm">
      Carregando mapa…
    </div>
  ),
})

/**
 * Mapa da rede + geocodificacao sob demanda: o botao processa um lote pequeno
 * por clique (politica do Nominatim, 1 req/s) e o resultado fica cacheado no
 * banco — cada clique avanca a fila de pendentes.
 */
export default function MapClient({ suppliers, pending, viveiro }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)

  function handleGeocode() {
    startTransition(async () => {
      const result = await geocodePendingSuppliers()
      if (result.error) {
        setToast({ message: result.error, type: 'error' })
        return
      }
      const found = result.updated ?? 0
      const left = result.pending ?? 0
      setToast({
        message:
          found > 0
            ? `${found} fornecedor(es) localizados. ${left > 0 ? `Faltam ${left}.` : 'Tudo localizado!'}`
            : left > 0
              ? `Nenhuma cidade encontrada neste lote. Faltam ${left}.`
              : 'Nenhum fornecedor pendente.',
        type: found > 0 ? 'success' : 'error',
      })
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link
          href="/fornecedores"
          className="text-sm text-green-300 hover:text-white mb-1 inline-block"
        >
          ← Fornecedores
        </Link>
        <h1 className="text-xl font-bold">Mapa da rede</h1>
        <p className="text-sm text-green-200">
          {suppliers.length} fornecedor(es) no mapa · distâncias em linha reta
        </p>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-800">
              {pending} fornecedor(es) com cidade ainda sem localização no mapa.
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={handleGeocode}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-amber-600 text-white shrink-0 disabled:opacity-50"
            >
              {isPending ? 'Localizando…' : 'Localizar agora'}
            </button>
          </div>
        )}

        {suppliers.length === 0 && pending === 0 ? (
          <p className="text-gray-400 text-center py-10 text-sm">
            Nenhum fornecedor com cidade cadastrada ainda. Preencha cidade/UF no
            cadastro do fornecedor para ele aparecer aqui.
          </p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SupplierMap suppliers={suppliers} viveiro={viveiro} />
          </div>
        )}

        <p className="text-xs text-gray-400">
          Localização aproximada pela cidade (OpenStreetMap/Nominatim). O viveiro é o
          ponto verde escuro.
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
