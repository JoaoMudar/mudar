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
  available_quantity: number | null
  available_container_name: string | null
}

interface Props {
  orderId: string
  items: AnalysisItem[]
}

interface ToastState {
  message: string
  type: ToastType
}

// Item parcial: indisponivel no total, mas com parte disponivel (eventualmente noutro recipiente).
function isPartial(i: AnalysisItem): boolean {
  return !i.is_generic && i.is_available === false && (i.available_quantity ?? 0) > 0
}

export default function OrderAnalysis({ orderId, items }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [showChangeBox, setShowChangeBox] = useState(false)
  const [changeNotes, setChangeNotes] = useState('')

  // Totalmente indisponivel = marcado indisponivel e sem quantidade parcial.
  const fullyUnavailable = items.filter(
    (i) => !i.is_generic && i.is_available === false && (i.available_quantity ?? 0) === 0,
  )
  const partials = items.filter(isPartial)
  // Aprovaveis: disponiveis (inclui genericos definidos) + parciais (ajustados na aprovacao).
  const keepItems = items.filter((i) => i.is_available === true || isPartial(i))
  const needsPartialFlow = fullyUnavailable.length > 0 || partials.length > 0

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
    const keep = keepItems.map((i) => i.id)
    if (keep.length === 0) {
      showToast('Nenhum item disponível para aprovar.', 'error')
      return
    }
    const parts: string[] = []
    if (fullyUnavailable.length > 0) parts.push(`${fullyUnavailable.length} indisponível(is) será(ão) removido(s)`)
    if (partials.length > 0) parts.push(`${partials.length} parcial(is) ajustado(s) p/ a qtd disponível`)
    if (!window.confirm(`Aprovar o que é possível? ${parts.join('; ')}.`)) return
    run(() => approvePartial(orderId, keep), 'Pedido aprovado!')
  }

  function handleRequestChanges() {
    run(() => requestChanges(orderId, changeNotes), 'Enviado para alteração.')
    setShowChangeBox(false)
    setChangeNotes('')
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-4">
      <div className="space-y-1">
        {!needsPartialFlow ? (
          <p className="font-bold text-green-700">✓ Todos os itens disponíveis!</p>
        ) : (
          <>
            {fullyUnavailable.length > 0 && (
              <p className="font-bold text-red-600">
                {fullyUnavailable.length} de {items.length} item(ns) indisponível(is)
              </p>
            )}
            {partials.length > 0 && (
              <>
                <p className="font-bold text-amber-600">{partials.length} item(ns) parcial(is):</p>
                <ul className="text-xs text-amber-700 space-y-0.5 pl-1">
                  {partials.map((p) => (
                    <li key={p.id}>
                      ≈ {p.species_name}: {p.available_quantity} un
                      {p.available_container_name && p.available_container_name !== p.container_name
                        ? ` ${p.available_container_name}`
                        : ''}{' '}
                      <span className="text-gray-400">(pediu {p.quantity} {p.container_name})</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {!needsPartialFlow ? (
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
            {isPending ? 'Processando…' : 'Aprovar o que é possível'}
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
              className="flex-1 bg-orange-600 text-white text-base font-bold py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 shadow-md"
            >
              Solicitar alteração
            </button>
            <button
              type="button"
              onClick={() => setShowChangeBox(false)}
              className="bg-gray-100 text-gray-800 font-semibold px-5 py-4 rounded-2xl active:scale-95 transition-transform"
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
