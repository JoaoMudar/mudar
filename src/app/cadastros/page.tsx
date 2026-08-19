import { requireAuth } from '@/lib/auth'
import { CADASTROS, canLink } from '@/lib/modules'
import ModuleLinkList from '@/components/ModuleLinkList'

export default async function CadastrosPage() {
  const user = await requireAuth()
  return (
    <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
      <p className="text-sm text-gray-600">{CADASTROS.summary}</p>
      <ModuleLinkList links={CADASTROS.links.filter((l) => canLink(user, l))} />
    </div>
  )
}
