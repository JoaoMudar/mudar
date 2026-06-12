import { describe, it, expect } from 'vitest'
import {
  DEFAULT_MIN_MARGIN_PCT,
  applyMarkup,
  isBelowMinMargin,
  marginOf,
  parseMarginPct,
} from '../pricing'

describe('parseMarginPct', () => {
  it('le numero da env, aceitando virgula decimal', () => {
    expect(parseMarginPct('25')).toBe(25)
    expect(parseMarginPct('12,5')).toBe(12.5)
    expect(parseMarginPct('0')).toBe(0)
  })

  it('valor ausente/invalido/negativo cai no fallback', () => {
    expect(parseMarginPct(undefined)).toBe(DEFAULT_MIN_MARGIN_PCT)
    expect(parseMarginPct(null)).toBe(DEFAULT_MIN_MARGIN_PCT)
    expect(parseMarginPct('')).toBe(DEFAULT_MIN_MARGIN_PCT)
    expect(parseMarginPct('abc')).toBe(DEFAULT_MIN_MARGIN_PCT)
    expect(parseMarginPct('-10')).toBe(DEFAULT_MIN_MARGIN_PCT)
    expect(parseMarginPct('abc', 15)).toBe(15)
  })
})

describe('applyMarkup', () => {
  it('aplica margem % sobre o custo, arredondando a centavos', () => {
    expect(applyMarkup(10, 30)).toBe(13)
    expect(applyMarkup(7.77, 30)).toBe(10.1) // 10.101 → 10.10
    expect(applyMarkup(5, 0)).toBe(5)
    expect(applyMarkup(0, 50)).toBe(0)
  })

  it('inputs invalidos retornam NaN', () => {
    expect(applyMarkup(-1, 30)).toBeNaN()
    expect(applyMarkup(NaN, 30)).toBeNaN()
    expect(applyMarkup(10, NaN)).toBeNaN()
  })
})

describe('marginOf', () => {
  it('e a inversa de applyMarkup (margem % sobre o custo)', () => {
    expect(marginOf(13, 10)).toBe(30)
    expect(marginOf(applyMarkup(8.4, 25), 8.4)).toBeCloseTo(25, 0)
    expect(marginOf(10, 10)).toBe(0)
    expect(marginOf(8, 10)).toBe(-20) // venda abaixo do custo = margem negativa
  })

  it('sem custo (<= 0) ou inputs invalidos retorna null', () => {
    expect(marginOf(13, 0)).toBeNull()
    expect(marginOf(13, -5)).toBeNull()
    expect(marginOf(-1, 10)).toBeNull()
    expect(marginOf(NaN, 10)).toBeNull()
  })
})

describe('isBelowMinMargin', () => {
  it('compara contra o piso em R$ (custo + margem minima)', () => {
    expect(isBelowMinMargin(12.99, 10, 30)).toBe(true) // piso = 13.00
    expect(isBelowMinMargin(13, 10, 30)).toBe(false)
    expect(isBelowMinMargin(20, 10, 30)).toBe(false)
  })

  it('nao gera falso positivo com preco sugerido arredondado', () => {
    // applyMarkup(7.77, 30) = 10.10 (margem real 29.99%): no piso, nao abaixo.
    expect(isBelowMinMargin(applyMarkup(7.77, 30), 7.77, 30)).toBe(false)
  })

  it('sem custo valido nao acusa (caso tratado na UI)', () => {
    expect(isBelowMinMargin(5, 0, 30)).toBe(false)
    expect(isBelowMinMargin(5, NaN, 30)).toBe(false)
  })
})
