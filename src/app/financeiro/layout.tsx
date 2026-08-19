import ModuleShell from '@/components/ModuleShell'
import { requireAnyPermission } from '@/lib/authz'
import { FINANCEIRO, canLink, linkPermissions } from '@/lib/modules'

export const metadata = { title: 'Financeiro — Viveiro Mudar' }

// Dashboards, extratos, compras, custeio e precificacao entram aqui quando a rotina existir.
export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyPermission(FINANCEIRO.links.flatMap(linkPermissions))
  const tabs = FINANCEIRO.links.filter((l) => l.tab && canLink(user, l))
  return (
    <ModuleShell title="Financeiro" items={tabs}>
      {children}
    </ModuleShell>
  )
}
