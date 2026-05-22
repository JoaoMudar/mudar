'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  return `há ${Math.floor(diff / 86400)}d`
}

export default function NotificacoesClient({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [filter, setFilter] = useState<'todas' | 'nao_lidas'>('todas')
  const router = useRouter()

  const filtered =
    filter === 'nao_lidas'
      ? notifications.filter(n => !n.read)
      : notifications

  async function handleMarkAllRead() {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllAsRead' }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead', notificationId: n.id }),
      })
      setNotifications(prev =>
        prev.map(item => (item.id === n.id ? { ...item, read: true } : item)),
      )
    }
    if (n.link) {
      router.push(n.link)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div>
      {/* Filtros + ação */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('todas')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === 'todas'
                ? 'bg-green-700 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('nao_lidas')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === 'nao_lidas'
                ? 'bg-green-700 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            Não lidas {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-green-700 hover:text-green-900 font-medium"
          >
            Marcar todas lidas
          </button>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">
          {filter === 'nao_lidas'
            ? 'Nenhuma notificação não lida'
            : 'Nenhuma notificação'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                !n.read
                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                )}
                <div className={!n.read ? '' : 'pl-4'}>
                  <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
