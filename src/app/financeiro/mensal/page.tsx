import nextDynamic from 'next/dynamic'
import { requireRole } from '@/lib/auth'
import { getMensal, type MensalData } from '../queries'

const MensalView = nextDynamic(() => import('./MensalView'), {
  loading: () => (
    <div className="max-w-3xl mx-auto p-4">
      <div className="h-40 bg-white rounded-xl border border-gray-100 animate-pulse" />
    </div>
  ),
})

export const dynamic = 'force-dynamic'

/** Resultado mensal e sazonalidade (P12 Fase 2). */
export default async function MensalPage() {
  await requireRole('admin', 'chefia')

  let data: MensalData = { serie: [], cobertura: [], anos: [] }
  try {
    data = await getMensal()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <MensalView data={data} />
}
