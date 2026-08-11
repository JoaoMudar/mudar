import { requirePermission } from '@/lib/authz'
import { getSuppliers } from './actions'
import FornecedoresManager from './FornecedoresManager'

export const dynamic = 'force-dynamic'

export default async function FornecedoresPage() {
  await requirePermission('fornecedor:criar')

  let suppliers: Awaited<ReturnType<typeof getSuppliers>> = []
  try {
    suppliers = await getSuppliers()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <FornecedoresManager initialSuppliers={suppliers} />
}
