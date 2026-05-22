import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import {
  getOrderById,
  getSpeciesForSelect,
  getContainersForSelect,
} from '../../actions'
import EditItemsForm from './EditItemsForm'

export const dynamic = 'force-dynamic'

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('admin', 'chefia')
  const { id } = await params

  const data = await getOrderById(id)
  if (!data) redirect('/pedidos')
  // Edicao de itens so faz sentido em pendente_alteracao
  if (data.order.status !== 'pendente_alteracao') redirect(`/pedidos/${id}`)

  const [species, containers] = await Promise.all([
    getSpeciesForSelect(),
    getContainersForSelect(),
  ])

  return (
    <EditItemsForm
      orderId={id}
      orderNumber={data.order.order_number}
      items={data.items}
      species={species}
      containers={containers}
    />
  )
}
