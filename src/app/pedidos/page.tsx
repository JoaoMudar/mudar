import { requireRole } from '@/lib/auth'
import { getOrders } from './actions'
import PedidosList, { type OrderRow } from './PedidosList'

export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const user = await requireRole('admin', 'chefia', 'gerencia')

  let orders: OrderRow[] = []
  try {
    orders = (await getOrders()) as OrderRow[]
  } catch {
    // Banco indisponível durante o build — renderizado fresh em runtime.
  }

  return <PedidosList orders={orders} role={user.role} />
}
