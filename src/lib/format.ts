/**
 * Formatacao pt-BR compartilhada (moeda, percentual, data).
 *
 * Ate aqui cada tela reimplementava o seu: `formatPriceBR` em suppliers.ts e um
 * `fmtDate` local em varios componentes. O BI financeiro usa formatacao em quase
 * toda celula, entao vale centralizar — modulo puro, sem I/O, testado.
 */

/** Numero "solto" (aceita string do Postgres, que devolve numeric como texto). */
function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : null
}

/**
 * 1234.5 -> "R$ 1.234,50". Vazio para valor ausente/invalido.
 *
 * `casas` existe para valores unitarios muito pequenos (custo por semente, por
 * muda), onde 2 casas arredondariam tudo para R$ 0,00.
 */
export function formatBRL(
  value: number | string | null | undefined,
  casas = 2,
): string {
  const n = toNumber(value)
  if (n === null) return ''
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
  })
}

/** Como formatBRL, mas sem centavos: 1234.5 -> "R$ 1.235". Para tabelas densas. */
export function formatBRLInteiro(value: number | string | null | undefined): string {
  const n = toNumber(value)
  if (n === null) return ''
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * Forma curta para eixo de grafico, onde nao cabe o valor cheio:
 * 2723309 -> "R$ 2,7 mi" · 184129 -> "R$ 184 mil" · 950 -> "R$ 950".
 */
export function formatCompactBRL(value: number | string | null | undefined): string {
  const n = toNumber(value)
  if (n === null) return ''
  const abs = Math.abs(n)
  const sinal = n < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    // Acima de 10 milhoes a casa decimal nao acrescenta nada no eixo.
    const txt = m >= 10 ? Math.round(m).toString() : m.toFixed(1).replace('.', ',')
    return `${sinal}R$ ${txt} mi`
  }
  if (abs >= 1_000) {
    return `${sinal}R$ ${Math.round(abs / 1_000)} mil`
  }
  return `${sinal}R$ ${Math.round(abs)}`
}

/**
 * 47.4 -> "47,4%". `null` vira travessao — no BI um percentual ausente e um
 * estado real (ano incompleto tem a margem suprimida de proposito), nao um erro.
 */
export function formatPct(
  value: number | string | null | undefined,
  casas = 1,
): string {
  const n = toNumber(value)
  if (n === null) return '—'
  return `${n.toFixed(casas).replace('.', ',')}%`
}

/**
 * Aceita o que o usuario digita em pt-BR e tambem o formato de maquina:
 * "1.234,56" -> 1234.56 · "1234.56" -> 1234.56 · "R$ 1.234,56" -> 1234.56.
 * Devolve null quando nao da para interpretar.
 *
 * A regra: se tem virgula, a virgula e o separador decimal e o ponto e milhar.
 * Sem virgula, o ponto so e decimal se sobrarem <= 2 digitos depois dele
 * (senao "1.234" viraria 1.234 em vez de 1234).
 */
export function parseValorBR(input: string | number | null | undefined): number | null {
  if (input == null) return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : null

  const limpo = input.replace(/[R$\s ]/g, '').trim()
  if (!limpo) return null
  if (!/^-?[\d.,]+$/.test(limpo)) return null

  let normalizado: string
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else {
    const partes = limpo.split('.')
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
      // "1.234" ou "1.234.567" -> separador de milhar
      normalizado = limpo.replace(/\./g, '')
    } else {
      normalizado = limpo
    }
  }

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

export const MESES_ABREV = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
] as const

export const MESES_NOME = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const

/**
 * Data para exibicao: "2026-05-14" -> "14/05/2026".
 *
 * Le a string ISO na marra em vez de usar `new Date(s)`: para "2026-05-14" o
 * construtor interpreta como UTC e, em fuso negativo (Brasil), a data exibida
 * volta um dia. Esse bug ja apareceu em datas de pedido.
 */
export function formatDateBR(
  value: string | Date | null | undefined,
  vazio = '',
): string {
  if (!value) return vazio
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return vazio
    const d = String(value.getDate()).padStart(2, '0')
    const m = String(value.getMonth() + 1).padStart(2, '0')
    return `${d}/${m}/${value.getFullYear()}`
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return vazio
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Só dia e mês: "14/05". Para listas onde o ano é redundante. */
export function formatDayMonthBR(
  value: string | Date | null | undefined,
  vazio = '',
): string {
  const completo = formatDateBR(value, '')
  return completo ? completo.slice(0, 5) : vazio
}

/**
 * Data e hora: "14/05 13:45".
 *
 * Ao contrário de formatDateBR, aqui `new Date()` é seguro e correto: um
 * timestamp carrega fuso, então não existe o deslocamento de um dia que afeta
 * strings de data pura.
 */
export function formatDateTimeBR(
  value: string | Date | null | undefined,
  vazio = '',
): string {
  if (!value) return vazio
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return vazio
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/** 2026, 5 -> "mai/2026". Aceita tambem "2026-05". */
export function formatMonthYearBR(
  ano: number | string,
  mes?: number | string,
): string {
  let a: number
  let m: number
  if (mes === undefined) {
    const parsed = /^(\d{4})-(\d{1,2})/.exec(String(ano))
    if (!parsed) return ''
    a = Number(parsed[1])
    m = Number(parsed[2])
  } else {
    a = Number(ano)
    m = Number(mes)
  }
  if (!Number.isInteger(a) || !Number.isInteger(m) || m < 1 || m > 12) return ''
  return `${MESES_ABREV[m - 1]}/${a}`
}

/**
 * Lista de meses em texto corrido para os avisos de preenchimento:
 * [5,6,7] -> "mai, jun e jul". Vazia -> "".
 */
export function formatListaMeses(meses: readonly number[] | null | undefined): string {
  if (!meses || meses.length === 0) return ''
  const nomes = meses
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
    .map((m) => MESES_ABREV[m - 1])
  if (nomes.length === 0) return ''
  if (nomes.length === 1) return nomes[0]
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}
