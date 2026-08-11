import { redirect } from 'next/navigation'
import { requireAnyPermission } from '@/lib/authz'
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
  await requireAnyPermission(['verificacao:ler', 'verificacao:criar'])
  const { id } = await params

  const data = await getOrderById(id)
  if (!data) redirect('/pedidos')
  if (!ALLOWED.includes(data.order.status)) redirect(`/pedidos/${id}`)

  const [species, containers] = await Promise.all([
    getSpeciesForSelect(),
    getContainersForSelect(),
  ])

  // Motivo do retorno (A3): ultima transicao para pendente_alteracao com observacao.
  const pendingChangeReason =
    [...data.history]
      .reverse()
      .find((h) => h.to_status === 'pendente_alteracao' && h.notes)?.notes ?? null

  return (
    <VerificationChecklist
      orderId={id}
      orderNumber={data.order.order_number}
      status={data.order.status}
      items={data.items}
      species={species}
      containers={containers}
      pendingChangeReason={pendingChangeReason}
    />
  )
}
