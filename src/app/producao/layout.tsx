import ModuleShell from '@/components/ModuleShell'
import { requireAnyPermission } from '@/lib/authz'
import { PRODUCAO, canLink, linkPermissions } from '@/lib/modules'

export const metadata = { title: 'Produção — Viveiro Mudar' }

// Agenda, atividade, lotes, perdas e estoque estao no mapa mas ainda nao tem tela (P13).
export default async function ProducaoLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyPermission(PRODUCAO.links.flatMap(linkPermissions))
  const tabs = PRODUCAO.links.filter((l) => l.tab && canLink(user, l))
  return (
    <ModuleShell title="Produção" items={tabs}>
      {children}
    </ModuleShell>
  )
}
