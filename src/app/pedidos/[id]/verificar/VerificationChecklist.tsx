'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import SpeciesTags from '@/components/SpeciesTags'
import GenericItemAssigner, { GenericItem } from './GenericItemAssigner'
import {
  startVerification,
  toggleItemAvailability,
  finishVerification,
  saveVerificationNotes,
} from '../../actions'
import type { AvailabilityState } from '@/lib/orders'

interface Item {
  id: string
  species_id: string | null
  species_name: string | null
  species_photo: string | null
  species_tags: string[] | null
  container_id: string
  container_name: string
  container_volume: number | null
  quantity: number
  is_generic: boolean
  is_available: boolean | null
  available_quantity: number | null
  available_container_id: string | null
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
  pendingChangeReason?: string | null
}

// Deriva o estado inicial de cada item especifico a partir das colunas persistidas.
function initialState(it: Item): AvailabilityState | null {
  if (it.is_available === true) return 'disponivel'
  if (it.is_available === false) {
    return (it.available_quantity ?? 0) > 0 ? 'parcial' : 'indisponivel'
  }
  return null
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
  pendingChangeReason,
}: Props) {
  const router = useRouter()
  const startedRef = useRef(false)
  const [isFinishing, startFinish] = useTransition()
  const [isSaving, startSave] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const specifics = items.filter((i) => !i.is_generic)
  const generics = items.filter((i) => i.is_generic)

  const [stateMap, setStateMap] = useState<Record<string, AvailabilityState | null>>(() =>
    Object.fromEntries(specifics.map((i) => [i.id, initialState(i)])),
  )
  const [partialQty, setPartialQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      specifics.map((i) => [i.id, i.available_quantity != null ? String(i.available_quantity) : '']),
    ),
  )
  const [partialContainer, setPartialContainer] = useState<Record<string, string>>(() =>
    Object.fromEntries(specifics.map((i) => [i.id, i.available_container_id ?? i.container_id])),
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

  // Parcial valido localmente: qtd no intervalo (0, total) e recipiente escolhido.
  function partialValid(it: Item): boolean {
    const qty = Number(partialQty[it.id])
    return Number.isFinite(qty) && qty > 0 && qty < it.quantity && !!partialContainer[it.id]
  }

  // Persiste o estado escolhido. Para 'parcial' so envia quando os campos estao validos.
  async function persist(it: Item, next: AvailabilityState) {
    const opts: { availableQuantity?: number; availableContainerId?: string | null; notes?: string } = {
      notes: notesMap[it.id],
    }
    if (next === 'parcial') {
      if (!partialValid(it)) return // aguarda usuario preencher qtd + recipiente
      opts.availableQuantity = Number(partialQty[it.id])
      opts.availableContainerId = partialContainer[it.id]
    }
    setSavingId(it.id)
    const result = await toggleItemAvailability(it.id, next, opts)
    setSavingId(null)
    if (result.error) showToast(`Erro: ${result.error}`, 'error')
  }

  function handleSetState(it: Item, next: AvailabilityState) {
    setStateMap((m) => ({ ...m, [it.id]: next }))
    // disponivel/indisponivel salvam na hora; parcial salva quando os campos ficarem validos.
    if (next !== 'parcial') void persist(it, next)
    else if (partialValid(it)) void persist(it, next)
  }

  // Re-salva o item se ja estiver num estado terminal (apos editar nota/qtd/recipiente).
  function resaveIfSet(it: Item) {
    const s = stateMap[it.id]
    if (s === 'disponivel' || s === 'indisponivel') void persist(it, s)
    else if (s === 'parcial' && partialValid(it)) void persist(it, 'parcial')
  }

  function isItemDone(it: Item): boolean {
    const s = stateMap[it.id]
    if (s === 'disponivel' || s === 'indisponivel') return true
    if (s === 'parcial') return partialValid(it)
    return false
  }

  const especificosDone = specifics.filter(isItemDone).length
  const genericosDone = generics.filter((i) => genericDone[i.id]).length
  const totalDone = especificosDone + genericosDone
  const total = items.length
  const allDone = totalDone === total && total > 0

  // Salva o estado atual (inclui observacoes de itens ainda nao marcados) e sai
  // para o detalhe do pedido. Os estados ja sao auto-salvos; aqui garantimos as
  // observacoes soltas, que so persistem por esta via.
  function handleSaveAndExit() {
    startSave(async () => {
      const notes = specifics.map((it) => ({ itemId: it.id, notes: notesMap[it.id] ?? '' }))
      const result = await saveVerificationNotes(orderId, notes)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      showToast('Progresso salvo', 'success')
      router.push(`/pedidos/${orderId}`)
      router.refresh()
    })
  }

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

      <div className="max-w-lg mx-auto p-4 space-y-3 pb-40">
        {/* Motivo do retorno (A3): destaque amarelo quando a chefia pediu alteracao */}
        {pendingChangeReason && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              ⚠ A chefia pediu alteração
            </p>
            <p className="text-sm text-amber-900 mt-1 whitespace-pre-line">{pendingChangeReason}</p>
          </div>
        )}

        {/* Itens especificos */}
        {specifics.map((it) => {
          const state = stateMap[it.id]
          const cardCls =
            state === 'disponivel'
              ? 'border-green-400 bg-green-50'
              : state === 'parcial'
                ? 'border-amber-400 bg-amber-50'
                : state === 'indisponivel'
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
                  <p className="font-bold text-gray-900 text-lg truncate">
                    {it.species_name}
                    <SpeciesTags tags={it.species_tags} className="ml-1.5" />
                  </p>
                  <p className="text-sm text-gray-600">
                    {it.container_name} — {it.quantity} un
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={notesMap[it.id] ?? ''}
                onChange={(e) => setNotesMap((n) => ({ ...n, [it.id]: e.target.value }))}
                onBlur={() => resaveIfSet(it)}
                placeholder="Observação (opcional)"
                className="input py-2 text-sm"
              />

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={savingId === it.id}
                  onClick={() => handleSetState(it, 'indisponivel')}
                  className={`py-3 rounded-xl font-bold text-sm border-2 disabled:opacity-50 ${
                    state === 'indisponivel'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-red-600 border-red-300'
                  }`}
                >
                  ✗ Indisp.
                </button>
                <button
                  type="button"
                  disabled={savingId === it.id}
                  onClick={() => handleSetState(it, 'parcial')}
                  className={`py-3 rounded-xl font-bold text-sm border-2 disabled:opacity-50 ${
                    state === 'parcial'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-amber-600 border-amber-300'
                  }`}
                >
                  ≈ Parcial
                </button>
                <button
                  type="button"
                  disabled={savingId === it.id}
                  onClick={() => handleSetState(it, 'disponivel')}
                  className={`py-3 rounded-xl font-bold text-sm border-2 disabled:opacity-50 ${
                    state === 'disponivel'
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-green-700 border-green-300'
                  }`}
                >
                  ✓ Disp.
                </button>
              </div>

              {/* Painel de parcial: quantidade disponivel + recipiente real */}
              {state === 'parcial' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 mb-1">
                      Qtd disponível (de {it.quantity})
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={it.quantity - 1}
                      value={partialQty[it.id] ?? ''}
                      onChange={(e) => setPartialQty((q) => ({ ...q, [it.id]: e.target.value }))}
                      onBlur={() => resaveIfSet(it)}
                      placeholder="Qtd"
                      className="input px-2 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 mb-1">
                      Recipiente
                    </label>
                    <select
                      value={partialContainer[it.id] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        setPartialContainer((c) => ({ ...c, [it.id]: v }))
                      }}
                      onBlur={() => resaveIfSet(it)}
                      className="input px-2 py-3"
                    >
                      <option value="">Recip.…</option>
                      {containers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
              container_id: it.container_id,
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

      {/* Barra inferior: salvar progresso sempre; finalizar quando tudo verificado */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {allDone && (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isFinishing || isSaving}
              className="btn-primary"
            >
              {isFinishing ? 'Enviando…' : 'Enviar para Chefia'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={isSaving || isFinishing}
            className="w-full py-3 rounded-xl font-bold text-green-700 border-2 border-green-300 bg-white disabled:opacity-50"
          >
            {isSaving ? 'Salvando…' : 'Salvar e continuar depois'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
