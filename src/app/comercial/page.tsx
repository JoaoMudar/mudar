import ModuleShell from '@/components/ModuleShell'
import ModuleLinkList from '@/components/ModuleLinkList'
import { requireAnyPermission } from '@/lib/authz'
import { COMERCIAL, canLink, linkPermissions } from '@/lib/modules'

export const metadata = { title: 'Comercial — Viveiro Mudar' }

// /pedidos e /fornecedores/* continuam nas URLs antigas de proposito: sao 30
// arquivos apontando para elas e `notifications.link` guarda caminho de pedido
// gravado no banco. Este modulo agrupa a navegacao, nao as rotas — por isso
// nao tem layout nem abas: o usuario sai daqui para as telas onde elas estao.
export default async function ComercialPage() {
  const user = await requireAnyPermission(COMERCIAL.links.flatMap(linkPermissions))
  return (
    <ModuleShell title="Comercial" items={[]}>
      <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
        <p className="text-sm text-gray-600">{COMERCIAL.summary}</p>
        <ModuleLinkList links={COMERCIAL.links.filter((l) => canLink(user, l))} />
      </div>
    </ModuleShell>
  )
}
