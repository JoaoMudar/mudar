'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import { validateLoadsSplit } from '@/lib/orders'
import { createDefaultLoad, createMultipleLoads, type LoadInput } from '../../actions'
import LoadSeparation, { type Load } from './LoadSeparation'

export interface RealItem {
  order_item_id: string
  species_name: string | null
  container_name: string
  quantity: number
}

interface Props {
  orderId: string
  orderNumber: number
  customerName: string
  deliveryDate: string | null
  realItems: RealItem[]
  loads: Load[]
}

interface ToastState {
  message: string
  type: ToastType
}

export default function SeparationManager({
  orderId,
  orderNumber,
  customerName,
  deliveryDate,
  realItems,
  loads,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [mode, setMode] = useState<'choose' | 'divide'>('choose')
  // matriz cargaIndex -> { order_item_id: quantidade(string) }
  const [cargas, setCargas] = useState<Record<string, string>[]>(() => {
    const first: Record<string, string> = {}
    for (const ri of realItems) first[ri.order_item_id] = String(ri.quantity)
    const second: Record<string, string> = {}
    for (const ri of realItems) second[ri.order_item_id] = '0'
    return [first, second]
  })

  // Se ja existem cargas, vai direto para a separacao
  if (loads.length > 0) {
    return (
      <LoadSeparation
        orderNumber={orderNumber}
        customerName={customerName}
        deliveryDate={deliveryDate}
        loads={loads}
      />
    )
  }

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  const originalMap: Record<string, number> = {}
  for (const ri of realItems) originalMap[ri.order_item_id] = ri.quantity

  const loadsData: LoadInput[] = cargas.map((c) => ({
    items: realItems.map((ri) => ({
      order_item_id: ri.order_item_id,
      quantity: Number(c[ri.order_item_id]) || 0,
    })),
  }))
  const splitError = validateLoadsSplit(originalMap, loadsData)

  function setQty(cargaIdx: number, itemId: string, value: string) {
    setCargas((cs) => cs.map((c, i) => (i === cargaIdx ? { ...c, [itemId]: value } : c)))
  }
  function addCarga() {
    const empty: Record<string, string> = {}
    for (const ri of realItems) empty[ri.order_item_id] = '0'
    setCargas((cs) => [...cs, empty])
  }
  function removeCarga(idx: number) {
    setCargas((cs) => (cs.length <= 1 ? cs : cs.filter((_, i) => i !== idx)))
  }

  function handleSingleLoad() {
    startTransition(async () => {
      const result = await createDefaultLoad(orderId)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      router.refresh()
    })
  }

  function handleConfirmDivide() {
    if (splitError) {
      showToast(splitError, 'error')
      return
    }
    startTransition(async () => {
      const result = await createMultipleLoads(orderId, loadsData)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      router.refresh()
    })
  }

  // soma por item across cargas (para feedback)
  function itemTotal(itemId: string): number {
    return cargas.reduce((acc, c) => acc + (Number(c[itemId]) || 0), 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href={`/pedidos/${orderId}`} className="text-sm text-green-300 hover:text-white mb-1 inline-block">
          ← Voltar
        </Link>
        <h1 className="text-lg font-bold">
          Separar Pedido #{orderNumber} — {customerName}
        </h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-28">
        {mode === 'choose' ? (
          <>
            <p className="text-sm text-gray-500">{realItems.length} itens para separar</p>
            <div className="space-y-2">
              {realItems.map((ri) => (
                <div
                  key={ri.order_item_id}
                  className="flex justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-gray-900">{ri.species_name}</span>
                  <span className="text-gray-600">
                    {ri.container_name} — {ri.quantity}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleSingleLoad}
                disabled={isPending}
                className="btn-primary"
              >
                {isPending ? 'Criando…' : 'Cabe em 1 viagem'}
              </button>
              <button
                type="button"
                onClick={() => setMode('divide')}
                className="btn-secondary"
              >
                Dividir em cargas
              </button>
            </div>
          </>
        ) : (
          <>
            {cargas.map((carga, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-800">Carga {idx + 1}</h2>
                  {cargas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCarga(idx)}
                      className="text-red-600 text-sm font-semibold"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {realItems.map((ri) => (
                  <div key={ri.order_item_id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-700 min-w-0 truncate">
                      {ri.species_name} <span className="text-gray-400">({ri.container_name})</span>
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={carga[ri.order_item_id]}
                        onChange={(e) => setQty(idx, ri.order_item_id, e.target.value)}
                        className="w-20 border-2 border-gray-300 rounded-lg px-2 py-1 text-right focus:border-green-600 focus:outline-none"
                      />
                      <span className="text-gray-400">/{ri.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <button
              type="button"
              onClick={addCarga}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-semibold text-gray-500"
            >
              + Adicionar carga
            </button>

            {/* Validacao por item */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm space-y-1">
              <p className="font-semibold text-gray-700 mb-1">Validação</p>
              {realItems.map((ri) => {
                const total = itemTotal(ri.order_item_id)
                const ok = total === ri.quantity
                return (
                  <p key={ri.order_item_id} className={ok ? 'text-green-700' : 'text-red-600'}>
                    {ok ? '✓' : '✗'} {ri.species_name}: {total} / {ri.quantity}
                  </p>
                )
              })}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('choose')} className="btn-secondary py-3">
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmDivide}
                disabled={isPending || !!splitError}
                className="btn-primary"
              >
                {isPending ? 'Confirmando…' : 'Confirmar divisão'}
              </button>
            </div>
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
