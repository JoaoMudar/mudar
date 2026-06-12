import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getOrderById, getSpeciesForSelect } from '@/app/pedidos/actions'
import QuoteWizard, { type WizardItem } from '@/app/fornecedores/cotacoes/QuoteWizard'

export const dynamic = 'force-dynamic'

/**
 * Fluxo A da cotacao: a partir de um pedido. Pre-carrega os itens marcados
 * como NAO disponiveis na verificacao (o motivo tipico de cotar fora) —
 * o usuario pode ajustar/adicionar no passo 1.
 */
export default async function CotarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireRole('admin', 'chefia')
  const { id } = await params

  const [result, species] = await Promise.all([getOrderById(id), getSpeciesForSelect()])
  if (!result) notFound()
  const { order, items } = result

  const initialItems: WizardItem[] = items
    .filter((i) => i.species_id && i.is_available === false)
    .map((i) => ({
      species_id: i.species_id as string,
      species_name: (i.species_name as string) ?? '',
      quantity: i.quantity as number,
      size: (i.container_name as string) ?? '',
      order_item_id: i.id as string,
    }))

  return (
    <QuoteWizard
      allSpecies={species}
      senderName={user.display_name}
      orderId={order.id}
      orderLabel={`Pedido #${order.order_number} — ${order.customer_name}`}
      initialItems={initialItems}
      backHref={`/pedidos/${order.id}`}
      backLabel={`Pedido #${order.order_number}`}
    />
  )
}
