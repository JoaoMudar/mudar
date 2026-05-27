import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/notifications'

export async function GET() {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const [unreadCount, notifications] = await Promise.all([
    getUnreadCount(user.id),
    getNotifications(user.id, 20),
  ])

  return NextResponse.json({ unreadCount, notifications })
}

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { action, notificationId } = body

  if (action === 'markAsRead' && notificationId) {
    await markAsRead(notificationId, user.id)
  } else if (action === 'markAllAsRead') {
    await markAllAsRead(user.id)
  } else {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
