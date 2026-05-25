// Utilitarios de texto para busca/autocomplete.
// Funcoes puras, pensadas para quem digita rapido e sem cuidado:
// ignora maiusculas/minusculas, acentos e espacos nas pontas.

// Diacriticos combinantes (acentos) no padrao Unicode: U+0300 ate U+036F.
const COMBINING_MARKS = /[̀-ͯ]/g

/**
 * Normaliza um texto para comparacao "tolerante": minusculo, sem acentos
 * (diacriticos) e sem espacos nas pontas. Ex: "  Ipê Amarelo " -> "ipe amarelo".
 * Usado para que "ipe" encontre "Ipê" no autocomplete.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD') // separa letra base do acento (ê -> e + combinante)
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
}

/**
 * true se `haystack` contem `needle` ignorando acento, caixa e espacos nas pontas.
 * Busca vazia casa com tudo.
 */
export function matchesSearch(haystack: string, needle: string): boolean {
  const n = normalizeText(needle)
  if (!n) return true
  return normalizeText(haystack).includes(n)
}
