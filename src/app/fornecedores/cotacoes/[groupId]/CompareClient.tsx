'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import { formatPriceBR } from '@/lib/suppliers'
import { applyMarkup, isBelowMinMargin, marginOf } from '@/lib/pricing'
import { buildCustomerQuoteMessage, buildWaLink } from '@/lib/whatsapp'
import { QUOTE_STATUS_META, type QuoteChannel, type QuoteStatus } from '@/lib/quotes'
import { saveQuoteChoices } from '../actions'

export interface GroupItemRow {
  id: string
  species_id: string
  common_name: string
  quantity: number
  size: string | null
  quoted_unit_price: string | number | null
  response_notes: string | null
  is_chosen: boolean
  sale_unit_price: string | number | null
}

export interface GroupQuoteRow {
  id: string
  request_group_id: string
  supplier_id: string
  order_id: string | null
  channel: QuoteChannel
  status: QuoteStatus
  sent_at: string | null
  responded_at: string | null
  notes: string | null
  created_at: string
  supplier_name: string
  contact_name: string | null
  whatsapp: string | null
  city: string | null
  state: string | null
  order_number: number | null
  customer_name: string | null
  customer_phone: string | null
  items: GroupItemRow[]
}

interface Props {
  groupId: string
  quotes: GroupQuoteRow[]
  minMarginPct: number
  senderName: string
}

interface ToastState {
  message: string
  type: ToastType
}

/** Linha da matriz: uma especie (+tamanho) com a oferta de cada fornecedor. */
interface MatrixRow {
  key: string
  common_name: string
  quantity: number
  size: string | null
  /** Paralelo a `quotes`; null = fornecedor nao cotou este item. */
  cells: (GroupItemRow | null)[]
  bestPrice: number | null
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : null
}

/** "4,50" / "1.250,00" → numero; vazio/invalido → null. */
function parsePriceInput(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function toPriceInput(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function rowKeyOf(item: GroupItemRow): string {
  return `${item.species_id}|${item.size ?? ''}`
}

/**
 * Matriz especie x fornecedor de um disparo: menor preco destacado, toque na
 * celula escolhe o fornecedor da especie, preco de venda com sugestao no piso
 * minimo e mensagem de fechamento para o cliente (sem fornecedores/custos).
 */
export default function CompareClient({ groupId, quotes, minMarginPct, senderName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  // null = acompanha o texto gerado; string = usuario editou na mao.
  const [messageDraft, setMessageDraft] = useState<string | null>(null)

  const first = quotes[0]
  const title = first.order_id
    ? `Pedido #${first.order_number} — ${first.customer_name}`
    : 'Cotação avulsa'

  const rows = useMemo<MatrixRow[]>(() => {
    const map = new Map<string, MatrixRow>()
    quotes.forEach((q, quoteIndex) => {
      for (const item of q.items) {
        const key = rowKeyOf(item)
        let row = map.get(key)
        if (!row) {
          row = {
            key,
            common_name: item.common_name,
            quantity: item.quantity,
            size: item.size,
            cells: quotes.map(() => null),
            bestPrice: null,
          }
          map.set(key, row)
        }
        row.cells[quoteIndex] = item
      }
    })
    for (const row of map.values()) {
      const prices = row.cells
        .map((cell) => toNumber(cell?.quoted_unit_price))
        .filter((n): n is number => n != null)
      row.bestPrice = prices.length > 0 ? Math.min(...prices) : null
    }
    return [...map.values()].sort((a, b) => a.common_name.localeCompare(b.common_name, 'pt-BR'))
  }, [quotes])

  // Escolha por linha: item vencedor + preco de venda digitado.
  const [choices, setChoices] = useState<Record<string, { itemId: string; salePrice: string }>>(
    () => {
      const initial: Record<string, { itemId: string; salePrice: string }> = {}
      for (const q of quotes) {
        for (const item of q.items) {
          if (!item.is_chosen) continue
          const sale = toNumber(item.sale_unit_price)
          const cost = toNumber(item.quoted_unit_price)
          initial[rowKeyOf(item)] = {
            itemId: item.id,
            salePrice:
              sale != null
                ? toPriceInput(sale)
                : cost != null
                  ? toPriceInput(applyMarkup(cost, minMarginPct))
                  : '',
          }
        }
      }
      return initial
    },
  )

  function selectCell(rowKey: string, item: GroupItemRow) {
    const cost = toNumber(item.quoted_unit_price)
    if (cost == null) return
    setChoices((prev) => {
      if (prev[rowKey]?.itemId === item.id) {
        const next = { ...prev }
        delete next[rowKey]
        return next
      }
      // Trocou de fornecedor: re-sugere o piso (custo novo, piso novo).
      return {
        ...prev,
        [rowKey]: { itemId: item.id, salePrice: toPriceInput(applyMarkup(cost, minMarginPct)) },
      }
    })
  }

  // Itens escolhidos com custo/venda/margem resolvidos (para resumo e save).
  const chosen = useMemo(() => {
    const list: {
      row: MatrixRow
      item: GroupItemRow
      supplierName: string
      cost: number
      sale: number | null
      belowFloor: boolean
    }[] = []
    for (const row of rows) {
      const choice = choices[row.key]
      if (!choice) continue
      const quoteIndex = row.cells.findIndex((cell) => cell?.id === choice.itemId)
      const item = quoteIndex >= 0 ? row.cells[quoteIndex] : null
      if (!item) continue
      const cost = toNumber(item.quoted_unit_price)
      if (cost == null) continue
      const sale = parsePriceInput(choice.salePrice)
      list.push({
        row,
        item,
        supplierName: quotes[quoteIndex].supplier_name,
        cost,
        sale,
        belowFloor: sale != null && isBelowMinMargin(sale, cost, minMarginPct),
      })
    }
    return list
  }, [rows, choices, quotes, minMarginPct])

  const missingPrice = chosen.some((c) => c.sale == null)
  const hasBelowFloor = chosen.some((c) => c.belowFloor)
  const costTotal = chosen.reduce((sum, c) => sum + c.row.quantity * c.cost, 0)
  const saleTotal = chosen.reduce((sum, c) => sum + c.row.quantity * (c.sale ?? 0), 0)

  const generatedMessage = useMemo(() => {
    const items = chosen
      .filter((c) => c.sale != null && !c.belowFloor)
      .map((c) => ({
        speciesName: c.row.common_name,
        quantity: c.row.quantity,
        size: c.row.size,
        saleUnitPrice: c.sale as number,
      }))
    if (items.length === 0) return ''
    return buildCustomerQuoteMessage({
      customerName: first.customer_name,
      senderName,
      items,
    })
  }, [chosen, first.customer_name, senderName])

  const customerMessage = messageDraft ?? generatedMessage
  const customerWaLink = buildWaLink(first.customer_phone, customerMessage)

  function handleSave() {
    const payload = chosen.map((c) => ({
      quote_item_id: c.item.id,
      sale_unit_price: c.sale as number,
    }))
    startTransition(async () => {
      const result = await saveQuoteChoices(groupId, payload)
      if (result.error) {
        setToast({ message: result.error, type: 'error' })
        return
      }
      setToast({ message: 'Escolhas salvas!', type: 'success' })
      router.refresh()
    })
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(customerMessage)
      setToast({ message: 'Mensagem copiada!', type: 'success' })
    } catch {
      setToast({ message: 'Não foi possível copiar. Selecione o texto.', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link
          href="/fornecedores/cotacoes"
          className="text-sm text-green-300 hover:text-white mb-1 inline-block"
        >
          ← Cotações
        </Link>
        <h1 className="text-xl font-bold">Comparar preços</h1>
        <p className="text-sm text-green-200">{title}</p>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <p className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
            Toque no preço para escolher o fornecedor de cada espécie. O menor preço de
            cada linha aparece em verde.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-semibold text-gray-700 min-w-[140px]">
                    Espécie
                  </th>
                  {quotes.map((q) => {
                    const meta = QUOTE_STATUS_META[q.status]
                    return (
                      <th key={q.id} className="px-2 py-2 min-w-[110px] align-top">
                        <Link
                          href={`/fornecedores/${q.supplier_id}`}
                          className="font-semibold text-gray-800 text-xs block truncate max-w-[140px]"
                        >
                          {q.supplier_name}
                        </Link>
                        <span
                          className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-3 py-2 align-top">
                      <p className="font-semibold text-gray-900 text-xs">{row.common_name}</p>
                      <p className="text-[11px] text-gray-500">
                        {row.quantity}x{row.size ? ` · ${row.size}` : ''}
                      </p>
                    </td>
                    {row.cells.map((cell, quoteIndex) => {
                      const price = toNumber(cell?.quoted_unit_price)
                      if (!cell || price == null) {
                        return (
                          <td
                            key={quotes[quoteIndex].id}
                            className="px-2 py-2 text-center text-gray-300"
                            title={cell?.response_notes ?? undefined}
                          >
                            —
                          </td>
                        )
                      }
                      const isBest = row.bestPrice != null && price === row.bestPrice
                      const isSelected = choices[row.key]?.itemId === cell.id
                      return (
                        <td key={quotes[quoteIndex].id} className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => selectCell(row.key, cell)}
                            title={cell.response_notes ?? undefined}
                            className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              isSelected
                                ? 'bg-green-600 text-white border-green-600'
                                : isBest
                                  ? 'bg-green-50 text-green-700 border-green-300'
                                  : 'bg-white text-gray-700 border-gray-200'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}
                            {formatPriceBR(price)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {chosen.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">
              Fechamento ({chosen.length} {chosen.length === 1 ? 'espécie' : 'espécies'})
            </h2>
            <p className="text-xs text-gray-500">
              Preço de venda sugerido = custo + {minMarginPct}% (piso mínimo de segurança).
              Pode aumentar, mas não vender abaixo do piso.
            </p>

            <div className="space-y-2">
              {chosen.map((c) => {
                const margin = c.sale != null ? marginOf(c.sale, c.cost) : null
                const floor = applyMarkup(c.cost, minMarginPct)
                return (
                  <div key={c.item.id} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-800 text-sm">
                        {c.row.quantity}x {c.row.common_name}
                        {c.row.size ? ` (${c.row.size})` : ''}
                      </p>
                      <span className="text-xs text-gray-500 shrink-0">{c.supplierName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 items-end">
                      <div>
                        <p className="label">Custo (cotado)</p>
                        <p className="text-sm font-semibold text-gray-700 py-2">
                          {formatPriceBR(c.cost)}
                        </p>
                      </div>
                      <div>
                        <label className="label" htmlFor={`sale-${c.item.id}`}>
                          Venda (R$/muda)
                        </label>
                        <input
                          id={`sale-${c.item.id}`}
                          type="text"
                          inputMode="decimal"
                          value={choices[c.row.key]?.salePrice ?? ''}
                          onChange={(e) =>
                            setChoices((prev) => ({
                              ...prev,
                              [c.row.key]: { itemId: c.item.id, salePrice: e.target.value },
                            }))
                          }
                          placeholder={toPriceInput(floor)}
                          className="input py-2"
                        />
                      </div>
                    </div>
                    {c.sale == null && (
                      <p className="text-xs font-semibold text-amber-600 mt-1">
                        Informe o preço de venda.
                      </p>
                    )}
                    {c.belowFloor && (
                      <p className="text-xs font-semibold text-red-600 mt-1">
                        Abaixo do piso mínimo ({formatPriceBR(floor)}).
                      </p>
                    )}
                    {c.sale != null && !c.belowFloor && margin != null && (
                      <p className="text-xs text-green-700 mt-1">
                        Margem: {margin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between text-sm">
              <p className="text-gray-500">
                Custo total: <span className="font-semibold">{formatPriceBR(costTotal)}</span>
              </p>
              <p className="text-gray-700">
                Venda total:{' '}
                <span className="font-bold text-green-700">
                  {missingPrice ? '—' : formatPriceBR(saleTotal)}
                </span>
              </p>
            </div>

            <button
              type="button"
              disabled={isPending || missingPrice || hasBelowFloor}
              onClick={handleSave}
              className="btn-primary w-full disabled:opacity-50"
            >
              {isPending ? 'Salvando…' : 'Salvar escolhas'}
            </button>
          </section>
        )}

        {generatedMessage && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-2">
            <h2 className="font-bold text-gray-900 text-sm">Mensagem para o cliente</h2>
            <p className="text-xs text-gray-500">
              Resumo limpo: só espécies, quantidades e preço de venda — sem fornecedores
              nem custos. Edite à vontade antes de enviar.
            </p>
            <textarea
              value={customerMessage}
              onChange={(e) => setMessageDraft(e.target.value)}
              rows={Math.min(14, customerMessage.split('\n').length + 1)}
              className="input text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-600 text-green-700"
              >
                Copiar mensagem
              </button>
              {customerWaLink && (
                <a
                  href={customerWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white"
                >
                  Abrir WhatsApp do cliente
                </a>
              )}
              {messageDraft != null && (
                <button
                  type="button"
                  onClick={() => setMessageDraft(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600"
                >
                  Refazer texto
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
