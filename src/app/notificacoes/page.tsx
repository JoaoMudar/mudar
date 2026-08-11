import Link from 'next/link'
import { requirePermission } from '@/lib/authz'
import { getNotifications } from '@/lib/notifications'
import NotificacoesClient from './NotificacoesClient'

export default async function NotificacoesPage() {
  const user = await requirePermission('notificacao_propria:ler')
  const notifications = await getNotifications(user.id, 50)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/" className="text-green-200 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold">Notificações</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        <NotificacoesClient initialNotifications={notifications} />
      </div>
    </main>
  )
}
