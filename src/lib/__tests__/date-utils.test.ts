import { describe, it, expect } from 'vitest'
import {
  isWeekend,
  addDays,
  getPreviousBusinessDay,
  isSameDay,
  toISODateLocal,
} from '../date-utils'

describe('isWeekend', () => {
  it('reconhece sabado e domingo', () => {
    expect(isWeekend(new Date(2026, 5, 6))).toBe(true) // sabado
    expect(isWeekend(new Date(2026, 5, 7))).toBe(true) // domingo
  })
  it('dias uteis nao sao fim de semana', () => {
    expect(isWeekend(new Date(2026, 5, 1))).toBe(false) // segunda
    expect(isWeekend(new Date(2026, 5, 5))).toBe(false) // sexta
  })
})

describe('addDays', () => {
  it('soma e subtrai dias', () => {
    expect(toISODateLocal(addDays(new Date(2026, 5, 1), 5))).toBe('2026-06-06')
    expect(toISODateLocal(addDays(new Date(2026, 5, 1), -1))).toBe('2026-05-31')
  })
})

describe('getPreviousBusinessDay', () => {
  it('entrega segunda -> carregamento sexta anterior', () => {
    // 2026-06-01 e segunda-feira
    const result = getPreviousBusinessDay(new Date(2026, 5, 1))
    expect(toISODateLocal(result)).toBe('2026-05-29') // sexta
  })
  it('entrega terca -> carregamento segunda', () => {
    const result = getPreviousBusinessDay(new Date(2026, 5, 2))
    expect(toISODateLocal(result)).toBe('2026-06-01')
  })
  it('entrega quarta -> carregamento terca', () => {
    const result = getPreviousBusinessDay(new Date(2026, 5, 3))
    expect(toISODateLocal(result)).toBe('2026-06-02')
  })
  it('entrega sabado -> carregamento sexta', () => {
    const result = getPreviousBusinessDay(new Date(2026, 5, 6))
    expect(toISODateLocal(result)).toBe('2026-06-05')
  })
})

describe('isSameDay', () => {
  it('compara apenas ano/mes/dia', () => {
    expect(isSameDay(new Date(2026, 5, 1, 8), new Date(2026, 5, 1, 20))).toBe(true)
    expect(isSameDay(new Date(2026, 5, 1), new Date(2026, 5, 2))).toBe(false)
  })
})

describe('toISODateLocal', () => {
  it('formata com zero a esquerda', () => {
    expect(toISODateLocal(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
