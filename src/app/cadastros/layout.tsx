import ModuleShell from '@/components/ModuleShell'
import { requireAnyPermission } from '@/lib/authz'
import { CADASTROS, canLink, linkPermissions } from '@/lib/modules'

export const metadata = { title: 'Cadastros — Viveiro Mudar' }

// Regra de corte: e cadastro se, ao apaga-lo, um movimento passado ficar sem sentido.
export default async function CadastrosLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyPermission(CADASTROS.links.flatMap(linkPermissions))
  const tabs = CADASTROS.links.filter((l) => l.tab && canLink(user, l))
  return (
    <ModuleShell title="Cadastros" items={tabs}>
      {children}
    </ModuleShell>
  )
}
