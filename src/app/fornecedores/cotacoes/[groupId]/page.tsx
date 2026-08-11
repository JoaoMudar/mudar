import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/authz'
import { parseMarginPct } from '@/lib/pricing'
import { getQuoteGroup } from '../actions'
import CompareClient, { type GroupQuoteRow } from './CompareClient'

export const dynamic = 'force-dynamic'

/**
 * Comparacao de um disparo de cotacao (P11 Fase 3): matriz especie x
 * fornecedor com menor preco destacado, escolha do vencedor por especie,
 * preco de venda com piso minimo e mensagem de fechamento para o cliente.
 */
export default async function CompararCotacaoPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const user = await requirePermission('cotacao:ler')
  const { groupId } = await params

  const quotes = (await getQuoteGroup(groupId)) as GroupQuoteRow[]
  if (quotes.length === 0) notFound()

  return (
    <CompareClient
      groupId={groupId}
      quotes={quotes}
      minMarginPct={parseMarginPct(process.env.QUOTE_MIN_MARGIN_PCT)}
      senderName={user.display_name}
    />
  )
}
