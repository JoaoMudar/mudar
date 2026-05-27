import { requireAuth } from '@/lib/auth'
import { listMySessions, type SessionRow } from './actions'
import SessoesClient from './SessoesClient'

export const metadata = { title: 'Aparelhos conectados — Viveiro Mudar' }
export const dynamic = 'force-dynamic'

export default async function SessoesPage() {
  await requireAuth()

  let sessions: SessionRow[] = []
  try {
    sessions = await listMySessions()
  } catch {
    // Banco indisponivel durante build — renderizado fresh em runtime (force-dynamic)
  }

  return <SessoesClient initialSessions={sessions} />
}
