// Utilitarios de WhatsApp para cotacao com fornecedores (P11 Fases 2 e 3).
// Funcoes puras, sem DB nem React — rodam no client e sao testadas isoladamente.
//
// Regra do projeto: outreach 100% semi-automatico e honesto. Este modulo so
// GERA a mensagem e o link wa.me; abrir o link e enviar e sempre uma acao
// manual do usuario (nada de automacao que viole os termos do WhatsApp).

import { formatPriceBR } from './suppliers'

export interface QuoteMessageItem {
  speciesName: string
  quantity: number
  /** Tamanho desejado (texto livre, ex: '30-50cm'), ou null. */
  size?: string | null
}

export interface QuoteMessageInput {
  supplierName: string
  contactName?: string | null
  items: QuoteMessageItem[]
  /** Nome de quem assina a mensagem (usuario logado). */
  senderName: string
  /** Observacao livre opcional (prazo, local de entrega etc.). */
  extraNote?: string | null
}

/**
 * Normaliza um telefone brasileiro para o formato exigido pelo wa.me:
 * so digitos com DDI 55 (ex: '5547999998888'). Aceita com/sem +55, com/sem
 * zero de tronco ('047...'), com mascara. Retorna null se irrecuperavel.
 */
export function normalizeBrazilPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  // Zero de tronco: '047 9999-8888' -> '4799998888'.
  digits = digits.replace(/^0+/, '')
  if (!digits) return null
  // Ja com DDI 55: fixo (12) ou celular (13). Checar ANTES do caso sem DDI,
  // senao um numero de DDD 55 (regiao de Santa Maria/RS) seria corrompido.
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits
  }
  // Sem DDI: DDD + fixo (10) ou DDD + celular (11).
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  return null
}

/**
 * Monta o link wa.me com a mensagem pre-preenchida.
 * Retorna null se o telefone nao for um numero brasileiro valido.
 */
export function buildWaLink(phone: string | null | undefined, text: string): string | null {
  const normalized = normalizeBrazilPhone(phone)
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}

/**
 * Mensagem honesta de pedido de orcamento: identifica o viveiro, explica que
 * esta montando rede de fornecedores e pede preco/tamanho/disponibilidade
 * das especies listadas. O texto e um PONTO DE PARTIDA — a UI permite editar
 * antes de abrir o wa.me.
 */
export function buildQuoteRequestMessage(input: QuoteMessageInput): string {
  const greetName = input.contactName?.trim() || input.supplierName.trim()
  const lines: string[] = []
  lines.push(`Olá, ${greetName}! Tudo bem?`)
  lines.push('')
  lines.push(
    `Aqui é ${input.senderName.trim()}, do Viveiro Mudar (Alto Vale do Itajaí/SC). ` +
      'Estamos montando uma rede de viveiros parceiros para atender pedidos de mudas nativas.',
  )
  lines.push('')
  lines.push('Você teria essas mudas? Se sim, pode me passar preço, tamanho e disponibilidade?')
  lines.push('')
  for (const item of input.items) {
    const size = item.size?.trim() ? ` (${item.size.trim()})` : ''
    lines.push(`• ${item.quantity}x ${item.speciesName.trim()}${size}`)
  }
  const extra = input.extraNote?.trim()
  if (extra) {
    lines.push('')
    lines.push(extra)
  }
  lines.push('')
  lines.push('Desde já, obrigado! 🌱')
  return lines.join('\n')
}

export interface CustomerQuoteItem {
  speciesName: string
  quantity: number
  /** Tamanho (texto livre), ou null. */
  size?: string | null
  /** Preco unitario de VENDA ao cliente (ja com margem aplicada). */
  saleUnitPrice: number
}

export interface CustomerQuoteMessageInput {
  customerName?: string | null
  /** Nome de quem assina a mensagem (usuario logado). */
  senderName: string
  items: CustomerQuoteItem[]
  /** Observacao livre opcional (prazo, frete, retirada etc.). */
  extraNote?: string | null
}

/**
 * Resumo de orcamento para o CLIENTE (P11 Fase 3 — fechamento da cotacao).
 * Mostra apenas quantidade, especie, tamanho e preco de venda: NUNCA inclui
 * fornecedor nem custo — sao informacao interna do viveiro. O texto e um
 * ponto de partida; a UI permite editar antes de copiar/abrir o wa.me.
 */
export function buildCustomerQuoteMessage(input: CustomerQuoteMessageInput): string {
  const lines: string[] = []
  const name = input.customerName?.trim()
  lines.push(name ? `Olá, ${name}! Tudo bem?` : 'Olá! Tudo bem?')
  lines.push('')
  lines.push(
    `Aqui é ${input.senderName.trim()}, do Viveiro Mudar. ` +
      'Consegui as mudas que você procurava. Segue o orçamento:',
  )
  lines.push('')
  let total = 0
  for (const item of input.items) {
    const size = item.size?.trim() ? ` (${item.size.trim()})` : ''
    const subtotal = Math.round(item.quantity * item.saleUnitPrice * 100) / 100
    total = Math.round((total + subtotal) * 100) / 100
    lines.push(
      `• ${item.quantity}x ${item.speciesName.trim()}${size} — ` +
        `${formatPriceBR(item.saleUnitPrice)}/muda = ${formatPriceBR(subtotal)}`,
    )
  }
  lines.push('')
  lines.push(`Total: ${formatPriceBR(total)}`)
  const extra = input.extraNote?.trim()
  if (extra) {
    lines.push('')
    lines.push(extra)
  }
  lines.push('')
  lines.push('Qualquer ajuste de quantidade ou espécie, é só me avisar! 🌱')
  return lines.join('\n')
}
