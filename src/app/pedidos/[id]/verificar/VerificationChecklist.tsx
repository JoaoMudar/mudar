'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import GenericItemAssigner, { GenericItem } from './GenericItemAssigner'
import {
  startVerification,
  toggleItemAvailability,
  finishVerification,
} from '../../actions'

interface Item {
  id: string
  species_id: string | null
  species_name: string | null
  species_photo: string | null
  container_id: string
  container_name: string
  container_volume: number | null
  quantity: number
  is_generic: boolean
  is_available: boolean | null
  availability_notes: string | null
  children: GenericItem['children']
}
interface Species {
  id: string
  common_name: string
}
interface Container {
  id: string
  name: string
  volume_liters: number | null
}

interface Props {
  orderId: string
  orderNumber: number
  status: string
  items: Item[]
  species: Species[]
  containers: Container[]
}

interface ToastState {
  message: string
  type: ToastType
}

export default function VerificationChecklist({
  orderId,
  orderNumber,
  status,
  items,
  species,
  containers,
}: Props) {
  const router = useRouter()
  const startedRef = useRef(false)
  const [isFinishing, startFinish] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const specifics = items.filter((i) => !i.is_generic)
  const generics = items.filter((i) => i.is_generic)

  const [avail, setAvail] = useState<Record<string, boolean | null>>(() =>
    Object.fromEntries(specifics.map((i) => [i.id, i.is_available])),
  )
  const [notesMap, setNotesMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(specifics.map((i) => [i.id, i.availability_notes ?? ''])),
  )
  const [genericDone, setGenericDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(generics.map((i) => [i.id, i.is_available === true])),
  )

  // Inicia verificacao automaticamente ao abrir (idempotente no servidor)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (status === 'cadastrado' || status === 'pendente_alteracao') {
      startVerification(orderId)
    }
  }, [orderId, status])

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  async function handleToggle(itemId: string, value: boolean) {
    const prev = avail[itemId]
    setAvail((a) => ({ ...a, [itemId]: value }))
    setSavingId(itemId)
    const result = await toggleItemAvailability(itemId, value, notesMap[itemId])
    setSavingId(null)
    if (result.error) {
      setAvail((a) => ({ ...a, [itemId]: prev }))
      showToast(`Erro: ${result.error}`, 'error')
    }
  }

  async function handleNotesBlur(itemId: string) {
    const value = avail[itemId]
    if (value === null || value === undefined) return
    await toggleItemAvailability(itemId, value, notesMap[itemId])
  }

  const especificosDone = specifics.filter((i) => avail[i.id] !== null && avail[i.id] !== undefined).length
  const genericosDone = generics.filter((i) => genericDone[i.id]).length
  const totalDone = especificosDone + genericosDone
  const total = items.length
  const allDone = totalDone === total && total > 0

  function handleFinish() {
    startFinish(async () => {
      const result = await finishVerification(orderId)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      showToast('Verificação enviada para chefia', 'success')
      router.push('/pedidos')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4 sticky top-0 z-10">
        <Link href={`/pedidos/${orderId}`} className="text-sm text-green-300 hover:text-white mb-1 inline-block">
          ← Voltar
        </Link>
        <h1 className="text-xl font-bold">Verificar Pedido #{orderNumber}</h1>
        <div className="mt-2">
          <div className="flex justify-between text-sm text-green-100 mb-1">
            <span>
              Verificados: {totalDone} de {total}
            </span>
            <span>
              Específicos: {especificosDone}/{specifics.length}
              {generics.length > 0 && ` · Genéricos: ${genericosDone}/${generics.length}`}
            </span>
          </div>
          <div className="h-2 bg-green-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: total ? `${(totalDone / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3 pb-28">
        {/* Itens especificos */}
        {specifics.map((it) => {
          const state = avail[it.id]
          const cardCls =
            state === true
              ? 'border-green-400 bg-green-50'
              : state === false
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white'
          return (
            <div key={it.id} className={`rounded-xl border-2 p-4 space-y-3 ${cardCls}`}>
              <div className="flex gap-3">
                {it.species_photo && (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <Image src={it.species_photo} alt={it.species_name ?? ''} fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-lg truncate">{it.species_name}</p>
                  <p className="text-sm text-gray-600">
                    {it.container_name} — {it.quantity} un
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={notesMap[it.id] ?? ''}
                onChange={(e) => setNotesMap((n) => ({ ...n, [it.id]: e.target.value }))}
                onBlur={() => handleNotesBlur(it.id)}
                placeholder="Observação (opcional)"
                className="input py-2 text-sm"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={savingId === it.id}
                  onClick={() => handleToggle(it.id, false)}
                  className={`py-3 rounded-xl font-bold text-sm border-2 disabled:opacity-50 ${
                    state === false
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-red-600 border-red-300'
                  }`}
                >
                  ✗ Indisponível
                </button>
                <button
                  type="button"
                  disabled={savingId === it.id}
                  onClick={() => handleToggle(it.id, true)}
                  className={`py-3 rounded-xl font-bold text-sm border-2 disabled:opacity-50 ${
                    state === true
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-green-700 border-green-300'
                  }`}
                >
                  ✓ Disponível
                </button>
              </div>
            </div>
          )
        })}

        {/* Itens genericos */}
        {generics.map((it) => (
          <GenericItemAssigner
            key={it.id}
            item={{
              id: it.id,
              quantity: it.quantity,
              container_name: it.container_name,
              container_volume: it.container_volume,
              is_available: it.is_available,
              children: it.children,
            }}
            species={species}
            containers={containers}
            onSaved={() => setGenericDone((g) => ({ ...g, [it.id]: true }))}
            showToast={showToast}
          />
        ))}
      </div>

      {/* Botao finalizar */}
      {allDone && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={handleFinish}
              disabled={isFinishing}
              className="btn-primary"
            >
              {isFinishing ? 'Enviando…' : 'Enviar para Chefia'}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
