'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ORDER_STATUS_META,
  SALE_CHANNEL_LABEL,
  type OrderStatus,
  type SaleChannel,
} from '@/lib/orders'

export interface OrderRow {
  id: string
  order_number: number
  status: OrderStatus
  sale_channel: SaleChannel
  delivery_date: string | Date | null
  created_at: string | Date
  customer_name: string
  item_count: number | string
  generic_count: number | string
}

interface Props {
  orders: OrderRow[]
  role: 'admin' | 'chefia' | 'gerencia' | 'funcionario'
}

function fmtDate(value: string | Date | null): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Tag de acao pendente para a gerencia, conforme o status do pedido.
function gerenciaTag(status: OrderStatus): { text: string; cls: string } | null {
  switch (status) {
    case 'cadastrado':
      return { text: 'VERIFICAR', cls: 'bg-orange-600 text-white' }
    case 'pendente_alteracao':
      return { text: 'RE-VERIFICAR', cls: 'bg-red-600 text-white' }
    case 'aprovado':
      return { text: 'ORGANIZAR', cls: 'bg-purple-600 text-white' }
    case 'separando':
      return { text: 'SEPARANDO', cls: 'bg-purple-500 text-white' }
    default:
      return null
  }
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  ...(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((s) => ({
    value: s,
    label: ORDER_STATUS_META[s].label,
  })),
]

export default function PedidosList({ orders, role }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('')
  const isChefia = role === 'admin' || role === 'chefia'
  const isGerencia = role === 'admin' || role === 'gerencia'

  const filtered = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders

  // Para gerencia, joga pedidos acionaveis para o topo.
  const sorted = isGerencia
    ? [...filtered].sort((a, b) => {
        const pa = gerenciaTag(a.status) ? 0 : 1
        const pb = gerenciaTag(b.status) ? 0 : 1
        return pa - pb
      })
    : filtered

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href="/" className="text-sm text-green-300 hover:text-white mb-1 inline-block">
          ← Início
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Pedidos</h1>
          {isChefia && (
            <Link
              href="/pedidos/novo"
              className="bg-white text-green-800 font-bold text-sm px-4 py-2 rounded-xl active:scale-95 transition-transform"
            >
              + Novo Pedido
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Filtro de status */}
        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-sm font-semibold text-gray-600">
            Status:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:border-green-600 focus:outline-none"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {sorted.length === 0 ? (
          <p className="text-gray-400 text-center py-16">Nenhum pedido encontrado.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((o) => {
              const meta = ORDER_STATUS_META[o.status]
              const tag = isGerencia ? gerenciaTag(o.status) : null
              const generic = Number(o.generic_count) || 0
              const total = Number(o.item_count) || 0
              return (
                <button
                  key={o.id}
                  onClick={() => router.push(`/pedidos/${o.id}`)}
                  className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">#{o.order_number}</span>
                        <span className="text-gray-700 truncate">{o.customer_name}</span>
                        {tag && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tag.cls}`}>
                            {tag.text}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {total} {total === 1 ? 'item' : 'itens'}
                        {generic > 0 && ` (${generic} a definir)`}
                        {' · '}
                        {SALE_CHANNEL_LABEL[o.sale_channel]}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        Entrega: {fmtDate(o.delivery_date)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
