import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/authz'
import { getOrderById } from '../actions'
import OrderDetailClient from './OrderDetailClient'

export const dynamic = 'force-dynamic'

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requirePermission('pedido:ler')
  const { id } = await params

  const data = await getOrderById(id)
  if (!data) redirect('/pedidos')

  return (
    <OrderDetailClient
      order={data.order}
      items={data.items}
      history={data.history}
      role={user.role}
    />
  )
}
