import { requireRole } from '@/lib/auth'
import { getQuotesDashboard } from '../cotacoes/actions'
import DashboardView, { type DashboardData } from './DashboardView'

export const dynamic = 'force-dynamic'

/** Painel de cotacoes da rede de fornecedores (P11 Fase 5). */
export default async function DashboardFornecedoresPage() {
  await requireRole('admin', 'chefia')

  let data: DashboardData = {
    kanban: [],
    totals: { responded: 0, outreach: 0, open_count: 0 },
    topSuppliers: [],
    networkGaps: [],
  }
  try {
    data = (await getQuotesDashboard()) as DashboardData
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <DashboardView data={data} />
}
