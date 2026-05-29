import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { toISODateLocal } from '@/lib/date-utils'
import { getOrderById, getOrderLoads } from '../../actions'
import SeparationManager, { type RealItem } from './SeparationManager'
import { type Load } from './LoadSeparation'

export const dynamic = 'force-dynamic'

export default async function SepararPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('admin', 'gerencia')
  const { id } = await params

  const data = await getOrderById(id)
  if (!data) redirect('/pedidos')
  if (data.order.status !== 'aprovado' && data.order.status !== 'separando') {
    redirect(`/pedidos/${id}`)
  }

  // Itens "reais": especificos + filhos de genericos
  const realItems: RealItem[] = []
  for (const it of data.items) {
    if (it.is_generic) {
      for (const c of it.children) {
        realItems.push({
          order_item_id: c.id,
          species_name: c.species_name,
          species_tags: c.species_tags ?? null,
          container_name: c.container_name,
          quantity: c.quantity,
        })
      }
    } else {
      realItems.push({
        order_item_id: it.id,
        species_name: it.species_name,
        species_tags: it.species_tags ?? null,
        container_name: it.container_name,
        quantity: it.quantity,
      })
    }
  }

  const loads = (await getOrderLoads(id)) as Load[]

  const dd = data.order.delivery_date
  const deliveryDate = dd
    ? typeof dd === 'string'
      ? dd.slice(0, 10)
      : toISODateLocal(new Date(dd))
    : null

  return (
    <SeparationManager
      orderId={id}
      orderNumber={data.order.order_number}
      customerName={data.order.customer_name}
      deliveryDate={deliveryDate}
      realItems={realItems}
      loads={loads}
    />
  )
}
