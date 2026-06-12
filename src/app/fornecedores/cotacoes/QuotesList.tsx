'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import { formatPriceBR } from '@/lib/suppliers'
import {
  QUOTE_CHANNEL_LABEL,
  QUOTE_STATUS_META,
  type QuoteChannel,
  type QuoteStatus,
} from '@/lib/quotes'
import { buildWaLink } from '@/lib/whatsapp'
import { cancelQuote, markQuoteNoReply, markQuoteSent } from './actions'
import RecordResponseForm from './RecordResponseForm'

export interface QuoteItemRow {
  id: string
  species_id: string
  common_name: string
  quantity: number
  size: string | null
  quoted_unit_price: string | number | null
  response_notes: string | null
}

export interface QuoteRow {
  id: string
  request_group_id: string
  supplier_id: string
  order_id: string | null
  channel: QuoteChannel
  status: QuoteStatus
  message_text: string
  sent_at: string | null
  responded_at: string | null
  raw_response: string | null
  notes: string | null
  created_at: string
  supplier_name: string
  contact_name: string | null
  whatsapp: string | null
  order_number: number | null
  customer_name: string | null
  items: QuoteItemRow[]
}

interface Props {
  initialQuotes: QuoteRow[]
}

interface ToastState {
  message: string
  type: ToastType
}

function fmtDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Acompanhamento das cotacoes, agrupadas por disparo (request_group_id):
 * enviar as pendentes, anotar respostas, marcar sem resposta.
 */
export default function QuotesList({ initialQuotes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [respondingQuote, setRespondingQuote] = useState<QuoteRow | null>(null)

  // Agrupa por disparo, preservando a ordem (mais recente primeiro, do SQL).
  const groups = useMemo(() => {
    const map = new Map<string, QuoteRow[]>()
    for (const q of initialQuotes) {
      const list = map.get(q.request_group_id) ?? []
      list.push(q)
      map.set(q.request_group_id, list)
    }
    return [...map.values()]
  }, [initialQuotes])

  function run(action: () => Promise<{ error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setToast({ message: result.error, type: 'error' })
        return
      }
      setToast({ message: successMessage, type: 'success' })
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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Cotações</h1>
          <Link
            href="/fornecedores/cotar"
            className="bg-white text-green-800 font-semibold text-sm px-3 py-2 rounded-xl"
          >
            + Nova cotação
          </Link>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {groups.length === 0 && (
          <p className="text-gray-400 text-center py-10 text-sm">
            Nenhuma cotação ainda. Comece por “+ Nova cotação” ou pelo botão
            “Cotar com fornecedores” dentro de um pedido.
          </p>
        )}

        {groups.map((group) => {
          const first = group[0]
          const title = first.order_id
            ? `Pedido #${first.order_number} — ${first.customer_name}`
            : 'Cotação avulsa'
          return (
            <section
              key={first.request_group_id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  {first.order_id ? (
                    <Link
                      href={`/pedidos/${first.order_id}`}
                      className="font-semibold text-green-800 text-sm truncate"
                    >
                      {title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-gray-700 text-sm">{title}</p>
                  )}
                  <span className="text-xs text-gray-400 shrink-0">
                    {fmtDateTime(first.created_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {first.items
                    .map((i) => `${i.quantity}x ${i.common_name}${i.size ? ` (${i.size})` : ''}`)
                    .join(' · ')}
                </p>
                {group.some((q) => q.status === 'responded') && (
                  <Link
                    href={`/fornecedores/cotacoes/${first.request_group_id}`}
                    className="inline-block mt-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white"
                  >
                    ⚖ Comparar preços
                  </Link>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {group.map((q) => {
                  const meta = QUOTE_STATUS_META[q.status]
                  const waLink = buildWaLink(q.whatsapp, q.message_text)
                  return (
                    <div key={q.id} className="px-3 py-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/fornecedores/${q.supplier_id}`}
                          className="font-semibold text-gray-900 text-sm truncate"
                        >
                          {q.supplier_name}
                        </Link>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      {q.channel !== 'whatsapp' && (
                        <p className="text-xs text-amber-600 font-semibold">
                          Canal: {QUOTE_CHANNEL_LABEL[q.channel]}
                        </p>
                      )}

                      {q.status === 'responded' && (
                        <ul className="space-y-0.5">
                          {q.items.map((i) => (
                            <li key={i.id} className="text-xs text-gray-600">
                              {i.common_name}
                              {i.size ? ` (${i.size})` : ''} —{' '}
                              {i.quoted_unit_price != null ? (
                                <span className="text-green-700 font-semibold">
                                  {formatPriceBR(i.quoted_unit_price)}
                                </span>
                              ) : (
                                <span className="text-gray-400">sem preço</span>
                              )}
                              {i.response_notes && (
                                <span className="text-gray-400"> · {i.response_notes}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {(q.status === 'queued' || q.status === 'sent') && (
                        <div className="flex flex-wrap gap-2">
                          {q.status === 'queued' && (
                            <>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white"
                                >
                                  Abrir WhatsApp
                                </a>
                              )}
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  run(() => markQuoteSent(q.id), 'Marcada como enviada!')
                                }
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-600 text-green-700 disabled:opacity-50"
                              >
                                ✓ Enviada
                              </button>
                            </>
                          )}
                          {q.status === 'sent' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setRespondingQuote(q)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white"
                              >
                                Anotar resposta
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  run(() => markQuoteNoReply(q.id), 'Marcada sem resposta.')
                                }
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-50"
                              >
                                Sem resposta
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (!window.confirm('Cancelar esta cotação?')) return
                              run(() => cancelQuote(q.id), 'Cotação cancelada.')
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {q.status === 'no_reply' && (
                        <button
                          type="button"
                          onClick={() => setRespondingQuote(q)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-600 text-green-700"
                        >
                          Respondeu depois? Anotar resposta
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {respondingQuote && (
        <RecordResponseForm
          quote={respondingQuote}
          onClose={() => setRespondingQuote(null)}
          onSaved={() => {
            setRespondingQuote(null)
            setToast({ message: 'Resposta anotada!', type: 'success' })
            router.refresh()
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
