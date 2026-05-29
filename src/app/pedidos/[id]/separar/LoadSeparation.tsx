'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import SpeciesTags from '@/components/SpeciesTags'
import { getPreviousBusinessDay, isSameDay, addDays } from '@/lib/date-utils'
import { toggleLoadItemSeparated, finishLoad } from '../../actions'

export interface LoadItem {
  id: string
  order_item_id: string
  quantity: number
  is_separated: boolean
  species_name: string | null
  species_photo: string | null
  species_tags: string[] | null
  container_name: string
}
export interface Load {
  id: string
  load_number: number
  status: string
  items: LoadItem[]
}

interface Props {
  orderNumber: number
  customerName: string
  deliveryDate: string | null
  loads: Load[]
}

interface ToastState {
  message: string
  type: ToastType
}

// Banner de urgencia conforme a data de entrega
function urgencyBanner(deliveryDate: string | null): { text: string; cls: string } | null {
  if (!deliveryDate) return null
  const delivery = new Date(`${deliveryDate}T00:00:00`)
  if (Number.isNaN(delivery.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = addDays(today, 1)
  const loadDay = getPreviousBusinessDay(delivery)

  if (isSameDay(today, delivery)) {
    return { text: 'ENTREGA HOJE', cls: 'bg-red-600 text-white' }
  }
  if (isSameDay(tomorrow, delivery)) {
    return { text: 'ENTREGA AMANHÃ', cls: 'bg-red-500 text-white' }
  }
  if (isSameDay(today, loadDay)) {
    return { text: 'CARREGAR HOJE', cls: 'bg-orange-500 text-white' }
  }
  return null
}

export default function LoadSeparation({
  orderNumber,
  customerName,
  deliveryDate,
  loads,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [activeLoad, setActiveLoad] = useState(loads[0]?.id ?? '')
  // estado local de separacao por item (otimista)
  const [sep, setSep] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    for (const l of loads) for (const it of l.items) m[it.id] = it.is_separated
    return m
  })
  const [doneLoads, setDoneLoads] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(loads.map((l) => [l.id, l.status === 'pronto'])),
  )

  const banner = urgencyBanner(deliveryDate)
  const current = loads.find((l) => l.id === activeLoad) ?? loads[0]

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  function loadProgress(load: Load): { done: number; total: number } {
    const total = load.items.length
    const done = load.items.filter((it) => sep[it.id]).length
    return { done, total }
  }

  async function handleToggle(item: LoadItem) {
    const next = !sep[item.id]
    setSep((s) => ({ ...s, [item.id]: next }))
    const result = await toggleLoadItemSeparated(item.id, next)
    if (result.error) {
      setSep((s) => ({ ...s, [item.id]: !next }))
      showToast(`Erro: ${result.error}`, 'error')
    }
  }

  function handleFinishLoad(load: Load) {
    startTransition(async () => {
      const result = await finishLoad(load.id)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      setDoneLoads((d) => ({ ...d, [load.id]: true }))
      showToast(
        result.orderReady
          ? `Pedido #${orderNumber} pronto para envio!`
          : `Carga ${load.load_number} pronta!`,
        'success',
      )
      router.refresh()
    })
  }

  if (!current) {
    return <p className="p-8 text-center text-gray-400">Nenhuma carga.</p>
  }

  const prog = loadProgress(current)
  const allSeparated = prog.total > 0 && prog.done === prog.total
  const currentDone = doneLoads[current.id]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <h1 className="text-lg font-bold">
          Pedido #{orderNumber} — {customerName}
        </h1>
        {banner && (
          <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${banner.cls}`}>
            ⚠ {banner.text}
          </span>
        )}
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-28">
        {/* Abas de cargas */}
        {loads.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {loads.map((l) => {
              const p = loadProgress(l)
              const done = doneLoads[l.id]
              return (
                <button
                  key={l.id}
                  onClick={() => setActiveLoad(l.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border-2 ${
                    l.id === activeLoad
                      ? 'border-green-700 bg-green-700 text-white'
                      : done
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Carga {l.load_number} ({p.done}/{p.total})
                </button>
              )
            })}
          </div>
        )}

        {/* Progresso da carga atual */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>
              Separados: {prog.done} de {prog.total}
            </span>
            {currentDone && <span className="text-green-700 font-bold">✓ Pronta</span>}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: prog.total ? `${(prog.done / prog.total) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Itens da carga */}
        <div className="space-y-3">
          {current.items.map((it) => {
            const separated = sep[it.id]
            return (
              <div
                key={it.id}
                className={`rounded-xl border-2 p-3 ${
                  separated ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex gap-3 items-center">
                  {it.species_photo && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <Image src={it.species_photo} alt={it.species_name ?? ''} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">
                      {it.species_name}
                      <SpeciesTags tags={it.species_tags} className="ml-1.5" />
                    </p>
                    <p className="text-sm text-gray-600">
                      {it.container_name} — {it.quantity} un
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(it)}
                  disabled={currentDone}
                  className={`mt-3 w-full py-3 rounded-xl font-bold text-sm border-2 disabled:opacity-60 ${
                    separated
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {separated ? '✓ Separado' : 'Separar'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Finalizar carga */}
      {!currentDone && allSeparated && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => handleFinishLoad(current)}
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? 'Finalizando…' : `Carga ${current.load_number} Pronta`}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
