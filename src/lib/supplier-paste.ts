// Parsing de listas de especies coladas de FORNECEDORES (texto cru do WhatsApp).
// Diferenca para o order-paste: a lista de fornecedor costuma trazer PRECO
// ("Ipê amarelo 30cm R$ 4,50") e TAMANHO. Este modulo extrai preco e tamanho
// da linha e delega o resto (nome + match com o catalogo) ao order-paste.
// Funcoes puras, sem DB nem React — rodam no client e sao testadas isoladamente.

import {
  matchSpecies,
  parseOrderLines,
  type PasteRow,
  type SpeciesOption,
} from './order-paste'

export interface SupplierPasteRow extends PasteRow {
  /** Preco unitario extraido da linha (em reais), ou null. */
  price: number | null
  /** Tamanho extraido da linha (ex: '30-50cm', '1m'), ou null. */
  size: string | null
}

/**
 * Converte um valor monetario BR em numero: "4,50" -> 4.5; "1.234,56" -> 1234.56.
 * Sem virgula, ponto seguido de exatamente 2 digitos e tratado como decimal
 * ("4.50" -> 4.5); demais pontos sao separador de milhar ("1.000" -> 1000).
 */
export function parsePriceBR(token: string): number | null {
  const t = token.trim()
  if (!/^[\d.,]+$/.test(t)) return null
  let normalized: string
  if (t.includes(',')) {
    normalized = t.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{2}$/.test(t)) {
    normalized = t
  } else {
    normalized = t.replace(/\./g, '')
  }
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? n : null
}

// "R$ 4,50" em qualquer posicao (forma explicita, prioritaria).
const EXPLICIT_PRICE = /R\$\s*([\d.,]+)/i
// Valor decimal com centavos no FIM da linha, com separador antes: "ipê - 4,50".
const TRAILING_PRICE = /[\s\-–—:=]([\d.]+,\d{2})\s*$/

/**
 * Extrai o preco de uma linha e devolve a linha sem ele.
 * Prioriza "R$ ..." (qualquer posicao); sem R$, aceita decimal com centavos no fim.
 * Numeros inteiros sem R$ NAO viram preco (sao quantidade — ex: "Ipê 500").
 */
export function extractPriceToken(line: string): { rest: string; price: number | null } {
  const explicit = line.match(EXPLICIT_PRICE)
  if (explicit) {
    const price = parsePriceBR(explicit[1])
    if (price !== null) {
      return { rest: line.replace(explicit[0], ' ').replace(/\s+/g, ' ').trim(), price }
    }
  }
  const trailing = line.match(TRAILING_PRICE)
  if (trailing) {
    const price = parsePriceBR(trailing[1])
    if (price !== null) {
      // Remove tambem o separador que antecede o preco ("ipê - 4,50" -> "ipê").
      const rest = line.slice(0, trailing.index).replace(/[\s\-–—:=]+$/, '').trim()
      return { rest, price }
    }
  }
  return { rest: line, price: null }
}

// Tamanho: "30cm", "30-50cm", "30 a 50cm", "1m", "1,5m", "1.80m", "2 metros".
// (?!\w) impede casar o "m" de palavras ("100 mudas" nao e tamanho).
const SIZE_TOKEN =
  /(\d+(?:[.,]\d+)?\s*(?:-|a|até)\s*)?\d+(?:[.,]\d+)?\s*(?:cm|cms|m|mt|mts|metros?)(?!\w)/i

/** Extrai o tamanho da muda de uma linha e devolve a linha sem ele. */
export function extractSizeToken(line: string): { rest: string; size: string | null } {
  const match = line.match(SIZE_TOKEN)
  if (!match) return { rest: line, size: null }
  const size = match[0].replace(/\s+/g, ' ').trim()
  const rest = line.replace(match[0], ' ').replace(/\s+/g, ' ').trim()
  return { rest, size }
}

/**
 * Lista colada do fornecedor pronta para a tela de revisao:
 * preco/tamanho extraidos por linha + nome casado com o catalogo (sinonimos
 * e nome cientifico inclusos, via matchSpecies).
 */
export function buildSupplierPasteRows(
  text: string,
  species: SpeciesOption[],
): SupplierPasteRow[] {
  const out: SupplierPasteRow[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim()
    if (!raw) continue
    const { rest: noPrice, price } = extractPriceToken(raw)
    const { rest: noSize, size } = extractSizeToken(noPrice)
    // Delega nome + quantidade ao parser do order-paste (1 linha por vez,
    // preservando o descarte de ruido: linha sem nome vira nada).
    const [parsed] = parseOrderLines(noSize)
    if (!parsed) continue
    out.push({
      raw,
      name: parsed.name,
      quantity: parsed.quantity,
      match: matchSpecies(parsed.name, species),
      price,
      size,
    })
  }
  return out
}
