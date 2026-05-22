'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import { approveOrder, approvePartial, requestChanges } from '../actions'

interface AnalysisItem {
  id: string
  is_generic: boolean
  is_available: boolean | null
  species_name: string | null
  container_name: string
  quantity: number
}

interface Props {
  orderId: string
  items: AnalysisItem[]
}

interface ToastState {
  message: string
  type: ToastType
}

export default function OrderAnalysis({ orderId, items }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [showChangeBox, setShowChangeBox] = useState(false)
  const [changeNotes, setChangeNotes] = useState('')

  const unavailable = items.filter((i) => !i.is_generic && i.is_available === false)
  const available = items.filter((i) => i.is_available === true)
  const allAvailable = unavailable.length === 0

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    startTransition(async () => {
      const result = await fn()
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      showToast(okMsg, 'success')
      router.refresh()
    })
  }

  function handleApprove() {
    if (!window.confirm('Aprovar este pedido?')) return
    run(() => approveOrder(orderId), 'Pedido aprovado!')
  }

  function handleApprovePartial() {
    const keep = available.map((i) => i.id)
    if (keep.length === 0) {
      showToast('Nenhum item disponível para aprovar.', 'error')
      return
    }
    if (!window.confirm(`Aprovar apenas os ${keep.length} itens disponíveis? Os indisponíveis serão removidos.`)) return
    run(() => approvePartial(orderId, keep), 'Pedido aprovado parcialmente!')
  }

  function handleRequestChanges() {
    run(() => requestChanges(orderId, changeNotes), 'Enviado para alteração.')
    setShowChangeBox(false)
    setChangeNotes('')
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-4">
      <div>
        {allAvailable ? (
          <p className="font-bold text-green-700">✓ Todos os itens disponíveis!</p>
        ) : (
          <p className="font-bold text-red-600">
            {unavailable.length} de {items.length} item(ns) indisponível(is)
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {allAvailable ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? 'Processando…' : 'Aprovar Pedido'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleApprovePartial}
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? 'Processando…' : 'Aprovar apenas disponíveis'}
          </button>
        )}
        <Link href={`/pedidos/${orderId}/editar`} className="btn-secondary text-center">
          Editar pedido
        </Link>
      </div>

      {showChangeBox ? (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <textarea
            rows={2}
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="O que precisa mudar? (opcional)"
            className="input resize-none text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRequestChanges}
              disabled={isPending}
              className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
            >
              Solicitar alteração
            </button>
            <button
              type="button"
              onClick={() => setShowChangeBox(false)}
              className="btn-secondary py-3"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowChangeBox(true)}
          className="text-sm font-semibold text-orange-600"
        >
          Solicitar alteração à gerência
        </button>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
