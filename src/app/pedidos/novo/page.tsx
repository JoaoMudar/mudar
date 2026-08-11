import { requirePermission } from '@/lib/authz'
import { getSpeciesForSelect, getContainersForSelect } from '../actions'
import { getCustomers } from '@/app/clientes/actions'
import OrderForm from './OrderForm'

export const dynamic = 'force-dynamic'

export default async function NovoPedidoPage() {
  await requirePermission('pedido:criar')

  let customers: Awaited<ReturnType<typeof getCustomers>> = []
  let species: Awaited<ReturnType<typeof getSpeciesForSelect>> = []
  let containers: Awaited<ReturnType<typeof getContainersForSelect>> = []
  try {
    ;[customers, species, containers] = await Promise.all([
      getCustomers(),
      getSpeciesForSelect(),
      getContainersForSelect(),
    ])
  } catch {
    // Banco indisponível durante o build — renderizado fresh em runtime.
  }

  return <OrderForm customers={customers} species={species} containers={containers} />
}
