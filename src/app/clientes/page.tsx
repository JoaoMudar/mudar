import { requirePermission } from '@/lib/authz'
import { getCustomers } from './actions'
import ClientesManager from './ClientesManager'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  await requirePermission('cliente:criar')

  let customers: any[] = []
  try {
    customers = await getCustomers()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <ClientesManager initialCustomers={customers} />
}
