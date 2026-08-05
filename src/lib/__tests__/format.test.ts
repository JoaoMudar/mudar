import { describe, it, expect } from 'vitest'
import {
  formatBRL,
  formatBRLInteiro,
  formatCompactBRL,
  formatPct,
  parseValorBR,
  formatDateBR,
  formatDayMonthBR,
  formatDateTimeBR,
  formatMonthYearBR,
  formatListaMeses,
} from '../format'

// O Node normaliza o espaco do simbolo de moeda como NBSP em pt-BR; comparamos
// sem depender disso.
const semNbsp = (s: string) => s.replace(/ /g, ' ')

describe('formatBRL', () => {
  it('formata valor com centavos', () => {
    expect(semNbsp(formatBRL(1234.5))).toBe('R$ 1.234,50')
  })

  it('aceita string (numeric do Postgres chega como texto)', () => {
    expect(semNbsp(formatBRL('508809.55'))).toBe('R$ 508.809,55')
  })

  it('valor ausente ou invalido vira string vazia', () => {
    expect(formatBRL(null)).toBe('')
    expect(formatBRL(undefined)).toBe('')
    expect(formatBRL('')).toBe('')
    expect(formatBRL('abc')).toBe('')
  })

  it('zero e um valor valido, nao vazio', () => {
    expect(semNbsp(formatBRL(0))).toBe('R$ 0,00')
  })

  it('negativo mantem o sinal', () => {
    expect(semNbsp(formatBRL(-57589))).toContain('57.589,00')
  })
})

describe('formatBRLInteiro', () => {
  it('arredonda e some com os centavos', () => {
    expect(semNbsp(formatBRLInteiro(1234.5))).toBe('R$ 1.235')
    expect(semNbsp(formatBRLInteiro(184129.4))).toBe('R$ 184.129')
  })
})

describe('formatCompactBRL', () => {
  it('milhoes com uma casa', () => {
    expect(formatCompactBRL(2723309)).toBe('R$ 2,7 mi')
  })

  it('acima de 10 milhoes dispensa a casa decimal', () => {
    expect(formatCompactBRL(21563883)).toBe('R$ 22 mi')
  })

  it('milhares arredondados', () => {
    expect(formatCompactBRL(184129)).toBe('R$ 184 mil')
    expect(formatCompactBRL(1000)).toBe('R$ 1 mil')
  })

  it('abaixo de mil sai inteiro', () => {
    expect(formatCompactBRL(950)).toBe('R$ 950')
    expect(formatCompactBRL(0)).toBe('R$ 0')
  })

  it('negativo preserva o sinal', () => {
    expect(formatCompactBRL(-2723309)).toBe('-R$ 2,7 mi')
  })
})

describe('formatPct', () => {
  it('uma casa decimal com virgula', () => {
    expect(formatPct(47.4)).toBe('47,4%')
    expect(formatPct(100)).toBe('100,0%')
  })

  it('respeita o numero de casas pedido', () => {
    expect(formatPct(47.44, 0)).toBe('47%')
    expect(formatPct(47.444, 2)).toBe('47,44%')
  })

  it('null vira travessao — margem suprimida em ano incompleto e estado real', () => {
    expect(formatPct(null)).toBe('—')
    expect(formatPct(undefined)).toBe('—')
    expect(formatPct('')).toBe('—')
  })

  it('zero nao e tratado como ausente', () => {
    expect(formatPct(0)).toBe('0,0%')
  })
})

describe('parseValorBR', () => {
  it('formato pt-BR com milhar e decimal', () => {
    expect(parseValorBR('1.234,56')).toBe(1234.56)
    expect(parseValorBR('508.809,55')).toBe(508809.55)
  })

  it('formato de maquina com ponto decimal', () => {
    expect(parseValorBR('1234.56')).toBe(1234.56)
    expect(parseValorBR('0.5')).toBe(0.5)
  })

  it('ponto como milhar quando sobram 3 digitos', () => {
    expect(parseValorBR('1.234')).toBe(1234)
    expect(parseValorBR('1.234.567')).toBe(1234567)
  })

  it('ignora o simbolo de moeda e espacos', () => {
    expect(parseValorBR('R$ 1.234,56')).toBe(1234.56)
    expect(parseValorBR(' 42 ')).toBe(42)
  })

  it('so virgula decimal, sem milhar', () => {
    expect(parseValorBR('42,90')).toBe(42.9)
  })

  it('numero passa direto', () => {
    expect(parseValorBR(1234.56)).toBe(1234.56)
  })

  it('negativo', () => {
    expect(parseValorBR('-1.234,56')).toBe(-1234.56)
  })

  it('entrada invalida vira null', () => {
    expect(parseValorBR('abc')).toBeNull()
    expect(parseValorBR('')).toBeNull()
    expect(parseValorBR(null)).toBeNull()
    expect(parseValorBR('12a3')).toBeNull()
  })
})

describe('formatDateBR', () => {
  it('ISO vira dd/mm/aaaa', () => {
    expect(formatDateBR('2026-05-14')).toBe('14/05/2026')
  })

  it('nao volta um dia por causa de fuso (bug classico do new Date)', () => {
    // Em UTC-3, `new Date('2026-01-01')` cai em 31/12/2025.
    expect(formatDateBR('2026-01-01')).toBe('01/01/2026')
  })

  it('aceita timestamp ISO completo', () => {
    expect(formatDateBR('2026-05-14T13:45:00.000Z')).toBe('14/05/2026')
  })

  it('aceita objeto Date', () => {
    expect(formatDateBR(new Date(2026, 4, 14))).toBe('14/05/2026')
  })

  it('ausente ou invalido vira vazio', () => {
    expect(formatDateBR(null)).toBe('')
    expect(formatDateBR('')).toBe('')
    expect(formatDateBR('14/05/2026')).toBe('')
    expect(formatDateBR(new Date('lixo'))).toBe('')
  })
})

describe('formatDateBR — fallback configuravel', () => {
  it('aceita um texto para o caso vazio (as telas usam travessao)', () => {
    expect(formatDateBR(null, '—')).toBe('—')
    expect(formatDateBR('', '—')).toBe('—')
    expect(formatDateBR('lixo', '—')).toBe('—')
    expect(formatDateBR(new Date('lixo'), '—')).toBe('—')
  })

  it('data valida ignora o fallback', () => {
    expect(formatDateBR('2026-05-14', '—')).toBe('14/05/2026')
  })
})

describe('formatDayMonthBR', () => {
  it('corta o ano', () => {
    expect(formatDayMonthBR('2026-05-14')).toBe('14/05')
  })

  it('respeita o fallback', () => {
    expect(formatDayMonthBR(null, '—')).toBe('—')
  })
})

describe('formatDateTimeBR', () => {
  it('inclui hora e minuto', () => {
    const s = formatDateTimeBR(new Date(2026, 4, 14, 13, 45))
    expect(s).toContain('14/05')
    expect(s).toContain('13:45')
  })

  it('respeita o fallback', () => {
    expect(formatDateTimeBR(null, '—')).toBe('—')
    expect(formatDateTimeBR('lixo', '—')).toBe('—')
  })
})

describe('formatMonthYearBR', () => {
  it('ano e mes separados', () => {
    expect(formatMonthYearBR(2026, 5)).toBe('mai/2026')
    expect(formatMonthYearBR(2024, 12)).toBe('dez/2024')
  })

  it('aceita a forma AAAA-MM', () => {
    expect(formatMonthYearBR('2026-05')).toBe('mai/2026')
    expect(formatMonthYearBR('2026-5')).toBe('mai/2026')
  })

  it('mes fora de 1..12 vira vazio', () => {
    expect(formatMonthYearBR(2026, 0)).toBe('')
    expect(formatMonthYearBR(2026, 13)).toBe('')
    expect(formatMonthYearBR('lixo')).toBe('')
  })
})

describe('formatListaMeses', () => {
  it('um mes', () => {
    expect(formatListaMeses([5])).toBe('mai')
  })

  it('dois meses usam "e"', () => {
    expect(formatListaMeses([5, 6])).toBe('mai e jun')
  })

  it('tres ou mais: virgula e "e" no ultimo — caso real de 2026', () => {
    expect(formatListaMeses([5, 6, 7])).toBe('mai, jun e jul')
  })

  it('caso real de 2024 (ago a dez)', () => {
    expect(formatListaMeses([8, 9, 10, 11, 12])).toBe('ago, set, out, nov e dez')
  })

  it('vazio ou ausente vira string vazia', () => {
    expect(formatListaMeses([])).toBe('')
    expect(formatListaMeses(null)).toBe('')
  })
})
