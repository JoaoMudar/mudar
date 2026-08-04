import nextDynamic from 'next/dynamic'
import { requireRole } from '@/lib/auth'
import { getCustos, type CustosData } from '../queries'

const CustosView = nextDynamic(() => import('./CustosView'), {
  loading: () => (
    <div className="max-w-3xl mx-auto p-4">
      <div className="h-40 bg-white rounded-xl border border-gray-100 animate-pulse" />
    </div>
  ),
})

export const dynamic = 'force-dynamic'

/** Estrutura de custo por grupo, centro e categoria (P12 Fase 2). */
export default async function CustosPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>
}) {
  await requireRole('admin', 'chefia')
  const { ano: anoParam } = await searchParams
  const ano = anoParam && /^\d{4}$/.test(anoParam) ? Number(anoParam) : undefined

  let data: CustosData = {
    grupos: [], centros: [], categorias: [], anos: [], ano: new Date().getFullYear(),
  }
  try {
    data = await getCustos(ano)
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <CustosView data={data} />
}
