import { requireAuth } from '@/lib/auth'
import { PRODUCAO, canLink } from '@/lib/modules'
import ModuleLinkList from '@/components/ModuleLinkList'

export default async function ProducaoPage() {
  const user = await requireAuth()
  return (
    <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
      <p className="text-sm text-gray-600">{PRODUCAO.summary}</p>
      <ModuleLinkList links={PRODUCAO.links.filter((l) => canLink(user, l))} />
    </div>
  )
}
