import { requireRole } from '@/lib/auth'
import { getSuppliers } from './actions'
import FornecedoresManager from './FornecedoresManager'

export const dynamic = 'force-dynamic'

export default async function FornecedoresPage() {
  await requireRole('admin', 'chefia')

  let suppliers: Awaited<ReturnType<typeof getSuppliers>> = []
  try {
    suppliers = await getSuppliers()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <FornecedoresManager initialSuppliers={suppliers} />
}
