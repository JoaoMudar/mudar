'use client'

import { useState, useEffect, useCallback } from 'react'
import Toast, { ToastType } from '@/components/Toast'
import { enqueue, getAll, remove } from '@/lib/offline-queue'
import { registrarUso } from './actions'

interface Option {
  id: string
  label: string
}

interface Props {
  inputs: Option[]
  species: Option[]
  containers: Option[]
}

interface ToastState {
  message: string
  type: ToastType
}

export default function RegistrarForm({ inputs, species, containers }: Props) {
  const [inputId, setInputId]       = useState('')
  const [speciesId, setSpeciesId]   = useState('')
  const [containerId, setContainerId] = useState('')
  const [quantity, setQuantity]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]           = useState<ToastState | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  const refreshPendingCount = useCallback(async () => {
    try {
      const queued = await getAll()
      setPendingCount(queued.length)
    } catch {}
  }, [])

  // Tenta enviar itens pendentes na queue
  const flushQueue = useCallback(async () => {
    try {
      const queued = await getAll()
      for (const item of queued) {
        try {
          await registrarUso({
            input_id: item.input_id,
            species_id: item.species_id,
            container_id: item.container_id,
            quantity: item.quantity,
            usage_date: item.usage_date,
          })
          await remove(item.id)
        } catch {
          break // Para no primeiro erro e tenta novamente mais tarde
        }
      }
      await refreshPendingCount()
    } catch {}
  }, [refreshPendingCount])

  useEffect(() => {
    refreshPendingCount()

    const handleOnline = () => {
      flushQueue()
      showToast('Conexão restaurada. Enviando registros pendentes…', 'success')
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [flushQueue, refreshPendingCount, showToast])

  const isValid = inputId && speciesId && containerId && quantity && Number(quantity) > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)

    const payload = {
      input_id: inputId,
      species_id: speciesId,
      container_id: containerId,
      quantity: Number(quantity),
      usage_date: new Date().toISOString().slice(0, 10),
    }

    try {
      if (!navigator.onLine) throw new Error('offline')

      await registrarUso(payload)
      showToast('Registrado com sucesso!', 'success')
    } catch (err) {
      const isOffline = !navigator.onLine || (err as Error).message === 'offline'

      if (isOffline) {
        await enqueue(payload)
        await refreshPendingCount()
        showToast('Sem internet. Salvo localmente — será enviado ao conectar.', 'offline')
      } else {
        showToast('Erro ao registrar. Tente novamente.', 'error')
      }
    } finally {
      setSubmitting(false)
      // Limpa o formulário em caso de sucesso ou offline (offline = salvo)
      if (navigator.onLine || !navigator.onLine) {
        setQuantity('')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-green-700 text-white px-4 py-5">
        <h1 className="text-xl font-bold">Registrar Uso de Insumo</h1>
        {pendingCount > 0 && (
          <p className="text-sm text-green-200 mt-1">
            {pendingCount} registro{pendingCount > 1 ? 's' : ''} aguardando conexão
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 flex-1">
        {/* Insumo */}
        <div className="flex flex-col gap-1">
          <label htmlFor="input" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Insumo
          </label>
          <select
            id="input"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-base bg-white focus:border-green-600 focus:outline-none"
          >
            <option value="">Selecione o insumo…</option>
            {inputs.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Espécie */}
        <div className="flex flex-col gap-1">
          <label htmlFor="species" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Espécie
          </label>
          <select
            id="species"
            value={speciesId}
            onChange={(e) => setSpeciesId(e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-base bg-white focus:border-green-600 focus:outline-none"
          >
            <option value="">Selecione a espécie…</option>
            {species.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Recipiente */}
        <div className="flex flex-col gap-1">
          <label htmlFor="container" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Recipiente
          </label>
          <select
            id="container"
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
            required
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-base bg-white focus:border-green-600 focus:outline-none"
          >
            <option value="">Selecione o recipiente…</option>
            {containers.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Quantidade */}
        <div className="flex flex-col gap-1">
          <label htmlFor="quantity" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Quantidade utilizada
          </label>
          <input
            id="quantity"
            type="number"
            inputMode="decimal"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="0"
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-base bg-white focus:border-green-600 focus:outline-none"
          />
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="mt-auto w-full bg-green-700 text-white text-lg font-bold py-5 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {submitting ? 'Registrando…' : 'Registrar'}
        </button>
      </form>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
