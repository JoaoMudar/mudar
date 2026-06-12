// Tipos e metadados de cotacao com fornecedores (P11 Fase 2).
// Funcoes puras, sem DB nem React.

export type QuoteStatus = 'queued' | 'sent' | 'responded' | 'no_reply' | 'cancelled'
export type QuoteChannel = 'whatsapp' | 'email' | 'instagram' | 'manual'

export const QUOTE_CHANNELS: QuoteChannel[] = ['whatsapp', 'email', 'instagram', 'manual']

export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; badge: string }> = {
  queued: { label: 'Aguardando envio', badge: 'bg-amber-100 text-amber-800' },
  sent: { label: 'Enviada', badge: 'bg-blue-100 text-blue-800' },
  responded: { label: 'Respondida', badge: 'bg-green-100 text-green-800' },
  no_reply: { label: 'Sem resposta', badge: 'bg-gray-200 text-gray-600' },
  cancelled: { label: 'Cancelada', badge: 'bg-red-100 text-red-700' },
}

export const QUOTE_CHANNEL_LABEL: Record<QuoteChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  instagram: 'Instagram',
  manual: 'Outro canal',
}

/** Item de cotacao (o que sera pedido aos fornecedores). */
export interface QuoteItemInput {
  species_id: string
  quantity: number
  size?: string | null
  /** Rastreio do item do pedido de origem; null na cotacao avulsa. */
  order_item_id?: string | null
}

export function normalizeQuoteChannel(value: string | null | undefined): QuoteChannel {
  return QUOTE_CHANNELS.includes(value as QuoteChannel) ? (value as QuoteChannel) : 'whatsapp'
}

/** Valida a lista de itens de uma cotacao; retorna mensagem de erro ou null. */
export function validateQuoteItems(items: QuoteItemInput[] | null | undefined): string | null {
  if (!items || items.length === 0) return 'Adicione ao menos uma espécie à cotação.'
  for (const item of items) {
    if (!item.species_id) return 'Toda linha da cotação precisa de uma espécie.'
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return 'Quantidade deve ser maior que zero.'
    }
  }
  return null
}

/**
 * Taxa de resposta (%) do outreach: respondidas sobre tudo que saiu
 * (sent + responded + no_reply). Sem outreach ainda → null (nao ha taxa).
 * P11 Fase 5 (dashboard).
 */
export function responseRatePct(responded: number, outreach: number): number | null {
  if (!Number.isFinite(responded) || !Number.isFinite(outreach) || outreach <= 0) return null
  return Math.round((responded / outreach) * 100)
}
