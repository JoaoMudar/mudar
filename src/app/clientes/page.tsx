import { requireRole } from '@/lib/auth'
import { getCustomers } from './actions'
import ClientesManager from './ClientesManager'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  await requireRole('admin', 'chefia')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let customers: any[] = []
  try {
    customers = await getCustomers()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <ClientesManager initialCustomers={customers} />
}
