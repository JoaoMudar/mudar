import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/notifications'

export async function GET() {
  const user = await getSession()
  // Unica rota HTTP do sistema, e o middleware exclui /api do matcher — a
  // guarda tem de estar aqui. `notificacao_propria` vale para todos os papeis;
  // o recorte de verdade e o `WHERE user_id` em src/lib/notifications.ts.
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!can(user, 'notificacao_propria:ler')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const [unreadCount, notifications] = await Promise.all([
    getUnreadCount(user.id),
    getNotifications(user.id, 20),
  ])

  return NextResponse.json({ unreadCount, notifications })
}

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!can(user, 'notificacao_propria:atualizar')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Corpo invalido virava 500 (e, agora, ruido no Sentry). E erro do cliente.
  let body: { action?: string; notificationId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  }
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
