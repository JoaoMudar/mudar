import { requireAnyPermission } from '@/lib/authz'
import { can } from '@/lib/permissions'
import { PESSOA_ROLES } from '@/lib/modules'
import type { PartyListRow } from '@/lib/parties'
import { getPeople } from './actions'
import PessoasList from './PessoasList'

export const dynamic = 'force-dynamic'

export default async function PessoasPage() {
  const user = await requireAnyPermission(PESSOA_ROLES.map((p) => p.readPermission))

  const visibleRoles = PESSOA_ROLES.filter((p) => can(user, p.readPermission)).map((p) => p.role)
  const creatableRoles = PESSOA_ROLES.filter(
    (p) => p.createPermission && can(user, p.createPermission),
  ).map((p) => p.role)

  let people: PartyListRow[] = []
  try {
    people = await getPeople()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return (
    <PessoasList people={people} visibleRoles={visibleRoles} creatableRoles={creatableRoles} />
  )
}
