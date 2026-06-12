import { requireRole } from '@/lib/auth'
import { getQuotes } from './actions'
import QuotesList from './QuotesList'

export const dynamic = 'force-dynamic'

export default async function CotacoesPage() {
  await requireRole('admin', 'chefia')

  let quotes: Awaited<ReturnType<typeof getQuotes>> = []
  try {
    quotes = await getQuotes()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <QuotesList initialQuotes={quotes} />
}
