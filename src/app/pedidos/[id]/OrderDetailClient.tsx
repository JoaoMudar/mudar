'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import OrderAnalysis from './OrderAnalysis'
import { cancelOrder } from '../actions'
import {
  ORDER_STATUS_META,
  SALE_CHANNEL_LABEL,
  type OrderStatus,
  type SaleChannel,
} from '@/lib/orders'

interface Child {
  id: string
  species_name: string | null
  container_name: string
  quantity: number
}
interface Item {
  id: string
  species_name: string | null
  container_name: string
  container_volume: number | null
  quantity: number
  is_generic: boolean
  is_available: boolean | null
  availability_notes: string | null
  children: Child[]
}
interface Order {
  id: string
  order_number: number
  status: OrderStatus
  sale_channel: SaleChannel
  delivery_date: string | Date | null
  notes: string | null
  created_at: string | Date
  customer_name: string
  customer_phone: string | null
  customer_city: string | null
  created_by_name: string
}
interface HistoryEntry {
  from_status: string | null
  to_status: string
  notes: string | null
  created_at: string | Date
  changed_by_name: string
}

interface Props {
  order: Order
  items: Item[]
  history: HistoryEntry[]
  role: 'admin' | 'chefia' | 'gerencia' | 'funcionario'
}

function fmtDate(value: string | Date | null): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AvailabilityIcon({ value }: { value: boolean | null }) {
  if (value === true) return <span className="text-green-600 font-bold">✓</span>
  if (value === false) return <span className="text-red-600 font-bold">✗</span>
  return <span className="text-gray-400 font-bold">?</span>
}

export default function OrderDetailClient({ order, items, history, role }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)

  const isChefia = role === 'admin' || role === 'chefia'
  const isGerencia = role === 'admin' || role === 'gerencia'
  const meta = ORDER_STATUS_META[order.status]

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  function handleCancel() {
    if (!window.confirm(`Cancelar o pedido #${order.order_number}?`)) return
    startTransition(async () => {
      const result = await cancelOrder(order.id)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      showToast('Pedido cancelado.', 'success')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href="/pedidos" className="text-sm text-green-300 hover:text-white mb-1 inline-block">
          ← Pedidos
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Pedido #{order.order_number}</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${meta.badge}`}>
            {meta.label}
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-5">
        {/* Dados do cliente / pedido */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-1">
          <p className="text-lg font-bold text-gray-900">{order.customer_name}</p>
          {order.customer_phone && <p className="text-gray-600">{order.customer_phone}</p>}
          <div className="grid grid-cols-2 gap-2 pt-2 text-gray-600">
            <p><span className="text-gray-400">Canal:</span> {SALE_CHANNEL_LABEL[order.sale_channel]}</p>
            <p><span className="text-gray-400">Entrega:</span> {fmtDate(order.delivery_date)}</p>
            <p><span className="text-gray-400">Criado:</span> {fmtDate(order.created_at)}</p>
            <p><span className="text-gray-400">Por:</span> {order.created_by_name}</p>
          </div>
          {order.notes && (
            <p className="pt-2 text-gray-700 border-t border-gray-100 mt-2">{order.notes}</p>
          )}
        </section>

        {/* Itens */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Itens do pedido</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Espécie</th>
                  <th className="px-4 py-2 font-semibold">Recipiente</th>
                  <th className="px-4 py-2 font-semibold text-right">Qtd</th>
                  <th className="px-4 py-2 font-semibold text-center">Disp.</th>
                  <th className="px-4 py-2 font-semibold">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <FragmentRow key={it.id} it={it} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Acoes por status/perfil */}
        <section className="space-y-3">
          {order.status === 'verificado' && isChefia && (
            <OrderAnalysis
              orderId={order.id}
              items={items.map((i) => ({
                id: i.id,
                is_generic: i.is_generic,
                is_available: i.is_available,
                species_name: i.species_name,
                container_name: i.container_name,
                quantity: i.quantity,
              }))}
            />
          )}

          {(order.status === 'cadastrado' ||
            order.status === 'verificando_disponibilidade' ||
            order.status === 'pendente_alteracao') &&
            isGerencia && (
              <Link href={`/pedidos/${order.id}/verificar`} className="btn-primary block text-center">
                {order.status === 'pendente_alteracao' ? 'Re-verificar disponibilidade' : 'Iniciar verificação'}
              </Link>
            )}

          {order.status === 'pendente_alteracao' && isChefia && (
            <Link href={`/pedidos/${order.id}/editar`} className="btn-primary block text-center">
              Editar itens
            </Link>
          )}

          {(order.status === 'aprovado' || order.status === 'separando') && isGerencia && (
            <Link href={`/pedidos/${order.id}/separar`} className="btn-primary block text-center">
              {order.status === 'aprovado' ? 'Organizar e separar' : 'Continuar separação'}
            </Link>
          )}

          {isChefia &&
            order.status !== 'cancelado' &&
            order.status !== 'pronto_envio' && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="w-full text-red-600 font-semibold py-3 rounded-xl border-2 border-red-200 disabled:opacity-50"
              >
                Cancelar pedido
              </button>
            )}
        </section>

        {/* Historico */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-bold text-gray-800 mb-3">Histórico</h2>
          <ol className="space-y-3">
            {history.map((h, idx) => (
              <li key={idx} className="flex gap-3 text-sm">
                <span className="text-gray-300 mt-0.5">•</span>
                <div>
                  <p className="text-gray-800">
                    <span className="font-semibold">
                      {ORDER_STATUS_META[h.to_status as OrderStatus]?.label ?? h.to_status}
                    </span>{' '}
                    — {h.changed_by_name}
                  </p>
                  <p className="text-gray-400 text-xs">{fmtDateTime(h.created_at)}</p>
                  {h.notes && <p className="text-gray-600 text-xs mt-0.5">{h.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

interface ToastState {
  message: string
  type: ToastType
}

// Linha de item + (se generico) linhas filhas indentadas
function FragmentRow({ it }: { it: Item }) {
  return (
    <>
      <tr className={it.is_generic ? 'bg-blue-50/50' : ''}>
        <td className="px-4 py-2 font-medium text-gray-900">
          {it.is_generic ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-xs font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">GEN</span>
              <span className="text-gray-600">Mín: {it.container_name}</span>
            </span>
          ) : (
            it.species_name
          )}
        </td>
        <td className="px-4 py-2 text-gray-600">{it.is_generic ? '—' : it.container_name}</td>
        <td className="px-4 py-2 text-right text-gray-900">{it.quantity}</td>
        <td className="px-4 py-2 text-center"><AvailabilityIcon value={it.is_available} /></td>
        <td className="px-4 py-2 text-gray-500 text-xs">{it.availability_notes ?? ''}</td>
      </tr>
      {it.children.map((c) => (
        <tr key={c.id} className="bg-blue-50/30 text-gray-600">
          <td className="px-4 py-1.5 pl-8">↳ {c.species_name}</td>
          <td className="px-4 py-1.5">{c.container_name}</td>
          <td className="px-4 py-1.5 text-right">{c.quantity}</td>
          <td className="px-4 py-1.5"></td>
          <td className="px-4 py-1.5"></td>
        </tr>
      ))}
    </>
  )
}
