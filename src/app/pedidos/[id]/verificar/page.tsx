import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import {
  getOrderById,
  getSpeciesForSelect,
  getContainersForSelect,
} from '../../actions'
import VerificationChecklist from './VerificationChecklist'

export const dynamic = 'force-dynamic'

const ALLOWED = ['cadastrado', 'verificando_disponibilidade', 'pendente_alteracao']

export default async function VerificarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('admin', 'gerencia')
  const { id } = await params

  const data = await getOrderById(id)
  if (!data) redirect('/pedidos')
  if (!ALLOWED.includes(data.order.status)) redirect(`/pedidos/${id}`)

  const [species, containers] = await Promise.all([
    getSpeciesForSelect(),
    getContainersForSelect(),
  ])

  return (
    <VerificationChecklist
      orderId={id}
      orderNumber={data.order.order_number}
      status={data.order.status}
      items={data.items}
      species={species}
      containers={containers}
    />
  )
}
