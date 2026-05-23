'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPreviousBusinessDay, isSameDay, toISODateLocal } from '@/lib/date-utils'
import { getDeliveryCalendarData } from './actions'

interface CalOrder {
  id: string
  order_number: number
  delivery_date: string
  status: string
  customer_name: string
  load_count: number | string
  ready_count: number | string
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function parseDate(value: string): Date {
  // value vem como 'YYYY-MM-DD' (ou ISO) — fixa meia-noite local
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

export default function DeliveryCalendar() {
  const router = useRouter()
  const [ref, setRef] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [orders, setOrders] = useState<CalOrder[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const year = ref.getFullYear()
  const month = ref.getMonth()

  const load = useCallback(async () => {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    try {
      const data = (await getDeliveryCalendarData(
        toISODateLocal(start),
        toISODateLocal(end),
      )) as CalOrder[]
      setOrders(data)
    } catch {
      setOrders([])
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Mapeia dia -> entregas e carregamentos
  const deliveriesByDay: Record<string, CalOrder[]> = {}
  const loadingsByDay: Record<string, CalOrder[]> = {}
  for (const o of orders) {
    const d = parseDate(o.delivery_date)
    const dk = toISODateLocal(d)
    ;(deliveriesByDay[dk] ??= []).push(o)
    const ld = toISODateLocal(getPreviousBusinessDay(d))
    ;(loadingsByDay[ld] ??= []).push(o)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function isOverdue(o: CalOrder): boolean {
    return parseDate(o.delivery_date) < today && o.status !== 'pronto_envio'
  }

  const selectedOrders = selected ? (deliveriesByDay[selected] ?? []) : []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setRef(new Date(year, month - 1, 1))}
          className="px-3 py-1 text-green-700 font-bold"
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <h2 className="font-bold text-gray-800">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={() => setRef(new Date(year, month + 1, 1))}
          className="px-3 py-1 text-green-700 font-bold"
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-xs font-semibold text-gray-400 py-1">
            {w}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`b${idx}`} />
          const cellDate = new Date(year, month, day)
          const dk = toISODateLocal(cellDate)
          const deliveries = deliveriesByDay[dk] ?? []
          const loadings = loadingsByDay[dk] ?? []
          const overdue = deliveries.some(isOverdue)
          const isToday = isSameDay(cellDate, today)

          let bg = ''
          if (overdue) bg = 'bg-red-100 text-red-800'
          else if (deliveries.length > 0) bg = 'bg-yellow-100 text-yellow-800'
          else if (loadings.length > 0) bg = 'bg-green-100 text-green-800'

          const count = deliveries.length || loadings.length
          return (
            <button
              key={dk}
              onClick={() => setSelected(dk)}
              className={`relative aspect-square rounded-lg text-sm flex flex-col items-center justify-center ${bg} ${
                isToday ? 'border-2 border-green-700' : ''
              } ${selected === dk ? 'ring-2 ring-green-600' : ''}`}
            >
              <span>{day}</span>
              {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 mt-3 text-xs text-gray-500">
        <span><span className="inline-block w-3 h-3 rounded bg-green-100 align-middle" /> Carregar</span>
        <span><span className="inline-block w-3 h-3 rounded bg-yellow-100 align-middle" /> Entrega</span>
        <span><span className="inline-block w-3 h-3 rounded bg-red-100 align-middle" /> Atrasado</span>
      </div>

      {selected && selectedOrders.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-sm font-semibold text-gray-600">
            Entregas em {selected.split('-').reverse().join('/')}
          </p>
          {selectedOrders.map((o) => (
            <button
              key={o.id}
              onClick={() => router.push(`/pedidos/${o.id}`)}
              className="w-full text-left bg-gray-50 rounded-lg px-3 py-2 text-sm active:bg-gray-100"
            >
              <span className="font-bold">#{o.order_number}</span> {o.customer_name}
              <span className="text-gray-400">
                {' '}— {Number(o.ready_count)}/{Number(o.load_count)} carga(s) prontas
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
