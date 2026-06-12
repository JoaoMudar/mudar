// Precificacao da revenda de cotacoes (P11 Fase 3).
// Funcoes puras, sem DB nem React — testadas isoladamente.
//
// Convencao: "margem" aqui e percentual SOBRE O CUSTO (markup), a mesma conta
// da regra de negocio "preco = custo real + margem". applyMarkup e marginOf
// sao inversas: marginOf(applyMarkup(custo, 30), custo) === 30.

/** Margem minima padrao (%) sobre o custo quando a env nao define. */
export const DEFAULT_MIN_MARGIN_PCT = 30

/**
 * Le a margem minima de uma env var (ex.: QUOTE_MIN_MARGIN_PCT="25").
 * Valor ausente, nao numerico ou negativo cai no fallback.
 */
export function parseMarginPct(
  raw: string | null | undefined,
  fallback: number = DEFAULT_MIN_MARGIN_PCT,
): number {
  if (raw == null || raw.trim() === '') return fallback
  const n = Number(raw.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

/** Arredonda para centavos (2 casas). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Preco de venda a partir do custo + margem % sobre o custo, em centavos.
 * Ex.: applyMarkup(10, 30) === 13. Custo/margem invalidos retornam NaN.
 */
export function applyMarkup(cost: number, marginPct: number): number {
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(marginPct)) return NaN
  return roundMoney(cost * (1 + marginPct / 100))
}

/**
 * Margem % sobre o custo embutida num preco de venda.
 * Ex.: marginOf(13, 10) === 30. Retorna null se custo <= 0 ou inputs invalidos
 * (sem custo nao ha margem calculavel).
 */
export function marginOf(salePrice: number, cost: number): number | null {
  if (!Number.isFinite(salePrice) || !Number.isFinite(cost) || cost <= 0 || salePrice < 0) {
    return null
  }
  return roundMoney(((salePrice - cost) / cost) * 100)
}

/**
 * Piso minimo de seguranca: o preco de venda fica ABAIXO da margem minima?
 * Compara contra o piso em R$ (applyMarkup arredondado a centavos), evitando
 * falso positivo por arredondamento. Sem custo (<= 0) nao ha como validar →
 * false (a UI trata item sem preco cotado separadamente).
 */
export function isBelowMinMargin(
  salePrice: number,
  cost: number,
  minMarginPct: number,
): boolean {
  if (!Number.isFinite(salePrice) || !Number.isFinite(cost) || cost <= 0) return false
  const floor = applyMarkup(cost, minMarginPct)
  return salePrice < floor
}
