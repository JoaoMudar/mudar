'use client'

import { useState, useTransition } from 'react'
import { recordQuoteResponse, type QuoteResponseItemInput } from './actions'
import type { QuoteRow } from './QuotesList'

interface Props {
  quote: QuoteRow
  onClose: () => void
  onSaved: () => void
}

/**
 * Modal para anotar a resposta do fornecedor: preco por especie + resposta
 * crua opcional (colada do WhatsApp). Os precos alimentam o catalogo do
 * fornecedor (upsert em supplier_species, source='quote').
 */
export default function RecordResponseForm({ quote, onClose, onSaved }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const item of quote.items) {
      initial[item.id] = item.quoted_unit_price != null ? String(item.quoted_unit_price) : ''
    }
    return initial
  })
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const item of quote.items) initial[item.id] = item.response_notes ?? ''
    return initial
  })
  const [rawResponse, setRawResponse] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const items: QuoteResponseItemInput[] = []
    for (const item of quote.items) {
      const text = (prices[item.id] ?? '').trim()
      let price: number | null = null
      if (text !== '') {
        price = Number(text.replace(/\./g, '').replace(',', '.'))
        if (!Number.isFinite(price) || price < 0) {
          setError(`Preço inválido em "${item.common_name}".`)
          return
        }
      }
      items.push({
        quote_item_id: item.id,
        quoted_unit_price: price,
        response_notes: itemNotes[item.id] || null,
      })
    }
    startTransition(async () => {
      const result = await recordQuoteResponse(quote.id, {
        rawResponse: rawResponse || null,
        items,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <div>
          <h2 className="font-bold text-gray-900">Resposta de {quote.supplier_name}</h2>
          <p className="text-xs text-gray-500">
            Anote o preço de cada espécie. O que ficar em branco fica como “sem preço”.
          </p>
        </div>

        <div className="space-y-2">
          {quote.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 p-3">
              <p className="font-semibold text-gray-800 text-sm">
                {item.quantity}x {item.common_name}
                {item.size ? ` (${item.size})` : ''}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="label" htmlFor={`rr-price-${item.id}`}>Preço unit. (R$)</label>
                  <input
                    id={`rr-price-${item.id}`}
                    type="text"
                    inputMode="decimal"
                    value={prices[item.id] ?? ''}
                    onChange={(e) => setPrices({ ...prices, [item.id]: e.target.value })}
                    placeholder="4,50"
                    className="input py-2"
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`rr-notes-${item.id}`}>Obs.</label>
                  <input
                    id={`rr-notes-${item.id}`}
                    type="text"
                    value={itemNotes[item.id] ?? ''}
                    onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                    placeholder="só a partir de março…"
                    className="input py-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="rr-raw">
            Resposta colada do WhatsApp (opcional, fica guardada)
          </label>
          <textarea
            id="rr-raw"
            value={rawResponse}
            onChange={(e) => setRawResponse(e.target.value)}
            rows={3}
            className="input text-sm"
          />
        </div>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {isPending ? 'Salvando…' : 'Salvar resposta'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-gray-600 bg-gray-100"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
