import nextDynamic from 'next/dynamic'
import { requireRole } from '@/lib/auth'
import { getClientes, type ClientesData } from '../queries'

const ClientesView = nextDynamic(() => import('./ClientesView'), {
  loading: () => (
    <div className="max-w-3xl mx-auto p-4">
      <div className="h-40 bg-white rounded-xl border border-gray-100 animate-pulse" />
    </div>
  ),
})

export const dynamic = 'force-dynamic'

/** Ranking e recencia de clientes (P12 Fase 2). */
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>
}) {
  await requireRole('admin', 'chefia')
  const { ano: anoParam } = await searchParams
  const ano = anoParam && /^\d{4}$/.test(anoParam) ? Number(anoParam) : undefined

  let data: ClientesData = { clientes: [], anos: [], ano: null, receitaTotal: 0 }
  try {
    data = await getClientes(ano)
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <ClientesView data={data} />
}
