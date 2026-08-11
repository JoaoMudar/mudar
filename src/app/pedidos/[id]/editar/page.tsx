import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/authz'
import {
  getOrderById,
  getSpeciesForSelect,
  getContainersForSelect,
} from '../../actions'
import EditItemsForm from './EditItemsForm'

export const dynamic = 'force-dynamic'

// Status a partir dos quais a chefia pode editar os itens (e devolver p/ verificacao).
// aprovado/separando: edicao de ultima hora, limitada pela data de entrega (validada na action).
const EDITABLE = ['pendente_alteracao', 'verificado', 'aprovado', 'separando']

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('pedido:atualizar')
  const { id } = await params

  const data = await getOrderById(id)
  if (!data) redirect('/pedidos')
  if (!EDITABLE.includes(data.order.status)) redirect(`/pedidos/${id}`)

  const [species, containers] = await Promise.all([
    getSpeciesForSelect(),
    getContainersForSelect(),
  ])

  return (
    <EditItemsForm
      orderId={id}
      orderNumber={data.order.order_number}
      orderNotes={data.order.notes ?? null}
      items={data.items}
      species={species}
      containers={containers}
    />
  )
}
