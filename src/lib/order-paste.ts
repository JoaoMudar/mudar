// Parsing e casamento de pedidos "colados" (texto cru do WhatsApp).
// Funcoes puras, sem DB nem React, para serem testadas isoladamente e
// rodarem no client (o formulario ja carrega todas as especies ativas).
//
// Fluxo: texto cru -> parseOrderLines (nome + quantidade por linha)
//                  -> matchSpecies (casa cada nome com o cadastro)
//                  -> buildPasteRows (junta tudo para a tela de revisao)

import { normalizePopularName } from './species-names'

export interface ParsedLine {
  /** Linha original, exatamente como colada (para exibir na revisao). */
  raw: string
  /** Nome da especie extraido da linha (pode ser '' se a linha so tinha numero). */
  name: string
  /** Quantidade extraida, ou null quando nenhuma foi reconhecida. */
  quantity: number | null
}

export interface SpeciesOption {
  id: string
  common_name: string
  /** Nome cientifico — tambem casa no reconhecimento. Opcional (retrocompat). */
  scientific_name?: string | null
  /** Sinonimos (outros nomes populares) — tambem casam. Opcional (retrocompat). */
  popular_names?: string[]
}

export type MatchStatus = 'exact' | 'likely' | 'none'

export interface SpeciesMatch {
  status: MatchStatus
  /** id da melhor especie reconhecida; null quando status = 'none'. */
  speciesId: string | null
  speciesName: string | null
  /** Confianca 0..1 (1 = casamento exato). */
  score: number
  /** Nome pelo qual a especie foi reconhecida, quando NAO foi o principal. */
  matchedVia?: string | null
}

export interface PasteRow {
  raw: string
  name: string
  quantity: number | null
  match: SpeciesMatch
}

// Acima deste limiar de semelhanca (Dice) tratamos como "provavel" (⚠).
const LIKELY_THRESHOLD = 0.6
// Casamento por "contem" (um nome dentro do outro) ja vale como provavel forte.
const CONTAINS_SCORE = 0.85

// ============================================================
// Parsing de linhas
// ============================================================

// Marcadores de lista no inicio: "- ", "* ", "• ", "1) ", "1. " (indice ate 2 digitos).
const LIST_MARKER = /^\s*(?:[-*•·–—]|\d{1,2}[.)])\s+/
// Unidades comuns que podem vir grudadas na quantidade (ignoradas).
const UNIT_SUFFIX = '(?:un|und|unds?|unid(?:ades?)?|mudas?|p(?:c|ç)s?|p(?:c|ç)as?)?'

/** Converte um token numerico ("1.000", "1,000", "500") em inteiro positivo, ou null. */
function parseQuantityToken(tok: string): number | null {
  const digits = tok.replace(/[.,]/g, '')
  if (!/^\d+$/.test(digits)) return null
  const n = parseInt(digits, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Limpa o nome: colapsa espacos e remove pontuacao/separadores das pontas. */
function cleanName(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:–—.x×]+|[\s\-:–—.x×]+$/gi, '')
    .trim()
}

/**
 * Extrai nome + quantidade de uma unica linha ja sem marcador de lista.
 * Prioriza numero no FIM ("Ipê amarelo 500"); depois numero no INICIO ("500 ipê", "2x ipê").
 */
function extractNameAndQuantity(line: string): { name: string; quantity: number | null } {
  // Numero no fim, com separador opcional (-, :, x) e unidade opcional.
  const trailing = line.match(
    new RegExp(`^(.+?)[\\s\\-:–—xX×]*\\s*([\\d.,]+)\\s*${UNIT_SUFFIX}\\s*$`, 'i'),
  )
  if (trailing) {
    const qty = parseQuantityToken(trailing[2])
    const name = cleanName(trailing[1])
    if (qty !== null && name) return { name, quantity: qty }
  }

  // Numero no inicio: "500 ipê", "2x ipê amarelo", "1.000 - ipê".
  const leading = line.match(/^([\d.,]+)\s*[xX×]?\s*[-:.]?\s*(.+)$/)
  if (leading) {
    const qty = parseQuantityToken(leading[1])
    const name = cleanName(leading[2])
    if (qty !== null && name) return { name, quantity: qty }
  }

  // Sem numero reconhecido: a linha inteira e o nome.
  return { name: cleanName(line), quantity: null }
}

/**
 * Quebra o texto colado em linhas e extrai nome + quantidade de cada uma.
 * Linhas vazias ou compostas so de numeros/pontuacao sao descartadas.
 */
export function parseOrderLines(text: string): ParsedLine[] {
  const out: ParsedLine[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim()
    if (!raw) continue
    // Linha sem nenhuma letra (so numeros/pontuacao, ex: "500" ou "---") e ruido.
    if (!/[a-zA-ZÀ-ɏ]/.test(raw)) continue
    const stripped = raw.replace(LIST_MARKER, '')
    const { name, quantity } = extractNameAndQuantity(stripped)
    if (!name) continue // linha sem nome (ex: so um numero) — ruido
    out.push({ raw, name, quantity })
  }
  return out
}

// ============================================================
// Casamento com o cadastro de especies
// ============================================================

/** Forma canonica para comparar: a mesma normalizacao da unicidade de nomes. */
function canonical(s: string): string {
  return normalizePopularName(s)
}

/** Remove plural simples ('s' final) de cada palavra com mais de 3 letras. */
function singularize(s: string): string {
  return s
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ')
}

/**
 * Semelhanca de Sørensen–Dice por bigramas de caractere (0..1).
 * Robusta para nomes curtos com erro de digitacao/plural.
 */
export function diceCoefficient(a: string, b: string): number {
  const na = a.replace(/\s+/g, '')
  const nb = b.replace(/\s+/g, '')
  if (na === nb) return na.length === 0 ? 0 : 1
  if (na.length < 2 || nb.length < 2) return 0
  const counts = new Map<string, number>()
  for (let i = 0; i < na.length - 1; i++) {
    const bg = na.slice(i, i + 2)
    counts.set(bg, (counts.get(bg) ?? 0) + 1)
  }
  let overlap = 0
  for (let i = 0; i < nb.length - 1; i++) {
    const bg = nb.slice(i, i + 2)
    const c = counts.get(bg) ?? 0
    if (c > 0) {
      overlap++
      counts.set(bg, c - 1)
    }
  }
  return (2 * overlap) / (na.length - 1 + (nb.length - 1))
}

/** Todos os nomes pelos quais uma especie pode ser reconhecida. */
function allNames(sp: SpeciesOption): string[] {
  const names = [sp.common_name, ...(sp.popular_names ?? [])]
  if (sp.scientific_name) names.push(sp.scientific_name)
  return names
}

/**
 * Casa um nome livre com a melhor especie do cadastro, considerando o nome
 * principal, os sinonimos e o nome cientifico de cada especie.
 * - 'exact'  → igualdade normalizada (ou plural) com qualquer um dos nomes
 * - 'likely' → um contem o outro, ou semelhanca >= limiar (pre-seleciona o palpite)
 * - 'none'   → nada parecido (sem especie sugerida)
 */
export function matchSpecies(name: string, species: SpeciesOption[]): SpeciesMatch {
  const target = canonical(name)
  if (!target) return { status: 'none', speciesId: null, speciesName: null, score: 0 }
  const targetSing = singularize(target)

  let best: { sp: SpeciesOption; score: number; exact: boolean; via: string } | null = null
  outer: for (const sp of species) {
    for (const candidateName of allNames(sp)) {
      const cand = canonical(candidateName)
      if (!cand) continue
      const candSing = singularize(cand)

      const exact = cand === target || candSing === targetSing
      let score: number
      if (exact) {
        score = 1
      } else {
        const contains =
          cand.includes(target) ||
          target.includes(cand) ||
          candSing.includes(targetSing) ||
          targetSing.includes(candSing)
        const dice = Math.max(diceCoefficient(target, cand), diceCoefficient(targetSing, candSing))
        score = contains ? Math.max(dice, CONTAINS_SCORE) : dice
      }

      if (!best || score > best.score) best = { sp, score, exact, via: candidateName }
      if (exact) break outer
    }
  }

  if (!best) return { status: 'none', speciesId: null, speciesName: null, score: 0 }

  let status: MatchStatus
  if (best.exact) status = 'exact'
  else if (best.score >= LIKELY_THRESHOLD) status = 'likely'
  else status = 'none'

  if (status === 'none') {
    return { status, speciesId: null, speciesName: null, score: best.score }
  }
  return {
    status,
    speciesId: best.sp.id,
    speciesName: best.sp.common_name,
    score: best.score,
    matchedVia: best.via === best.sp.common_name ? null : best.via,
  }
}

/** Junta parse + casamento: a lista pronta para a tela de revisao. */
export function buildPasteRows(text: string, species: SpeciesOption[]): PasteRow[] {
  return parseOrderLines(text).map((line) => ({
    ...line,
    match: matchSpecies(line.name, species),
  }))
}
