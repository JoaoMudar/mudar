import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getOrderById } from '../actions'
import OrderDetailClient from './OrderDetailClient'

export const dynamic = 'force-dynamic'

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireRole('admin', 'chefia', 'gerencia')
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
