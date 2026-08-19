import ModuleShell from '@/components/ModuleShell'
import { requireAnyPermission } from '@/lib/authz'
import { ADMIN_LINKS, canLink, linkPermissions } from '@/lib/modules'

export const metadata = { title: 'Administração — Viveiro Mudar' }

// /admin nao e modulo de negocio: e administracao de sistema. Espécies,
// recipientes e insumos foram para /cadastros, custos fixos para /financeiro e
// coleta de sementes para /producao — aqui ficam usuarios e sessoes.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyPermission(ADMIN_LINKS.flatMap(linkPermissions))
  return (
    <ModuleShell title="Administração" items={ADMIN_LINKS.filter((l) => canLink(user, l))}>
      {children}
    </ModuleShell>
  )
}
