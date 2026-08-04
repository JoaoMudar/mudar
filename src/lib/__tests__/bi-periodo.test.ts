import { describe, it, expect } from 'vitest'
import {
  anoConfiavel,
  margemExibivel,
  opacidadeAno,
  avisoPeriodoParcial,
  rotuloJanela,
  resumirPendencias,
  estadoDoMes,
  type Cobertura,
} from '../bi-periodo'

// Casos reais medidos no banco em 04/08/2026.
const c2025: Cobertura = {
  ano: 2025, meses_faltantes: [], meses_comparaveis: 12,
  ultimo_mes_despesa: 12, ultimo_mes_receita: 12, completo: true,
}
const c2024: Cobertura = {
  ano: 2024, meses_faltantes: [9, 10, 11, 12], meses_comparaveis: 8,
  ultimo_mes_despesa: 8, ultimo_mes_receita: 12, completo: false,
}
const c2026: Cobertura = {
  ano: 2026, meses_faltantes: [5, 6, 7], meses_comparaveis: 4,
  ultimo_mes_despesa: 4, ultimo_mes_receita: 7, completo: false,
}

describe('anoConfiavel', () => {
  it('ano fechado e sem buraco e confiavel', () => {
    expect(anoConfiavel(c2025)).toBe(true)
  })

  it('2024 e 2026 nao sao — e o ponto de todo o modulo', () => {
    expect(anoConfiavel(c2024)).toBe(false)
    expect(anoConfiavel(c2026)).toBe(false)
  })

  it('ausencia de cobertura nao e confiavel', () => {
    expect(anoConfiavel(undefined)).toBe(false)
    expect(anoConfiavel(null)).toBe(false)
  })
})

describe('margemExibivel', () => {
  it('ano completo mostra a margem', () => {
    expect(margemExibivel(48.2, c2025)).toBe(48.2)
  })

  it('SUPRIME a margem falsa de 2024 (74,1%)', () => {
    expect(margemExibivel(74.1, c2024)).toBeNull()
  })

  it('SUPRIME a margem falsa de 2026 (79,2%)', () => {
    expect(margemExibivel(79.2, c2026)).toBeNull()
  })

  it('o toggle explicito libera, para quem sabe o que esta olhando', () => {
    expect(margemExibivel(79.2, c2026, true)).toBe(79.2)
  })

  it('margem ausente continua ausente', () => {
    expect(margemExibivel(null, c2025)).toBeNull()
  })
})

describe('opacidadeAno', () => {
  it('ano completo opaco, incompleto esmaecido', () => {
    expect(opacidadeAno(c2025)).toBe(1)
    expect(opacidadeAno(c2026)).toBe(0.45)
  })
})

describe('avisoPeriodoParcial', () => {
  it('descreve o buraco de 2026', () => {
    const aviso = avisoPeriodoParcial(c2026)
    expect(aviso).toContain('abr/2026')
    expect(aviso).toContain('mai, jun e jul')
    expect(aviso).toContain('subestimando')
  })

  it('descreve o buraco de 2024', () => {
    const aviso = avisoPeriodoParcial(c2024)
    expect(aviso).toContain('ago/2024')
    expect(aviso).toContain('set, out, nov e dez')
  })

  it('ano completo nao gera aviso — a faixa some da tela', () => {
    expect(avisoPeriodoParcial(c2025)).toBeNull()
  })

  it('ano sem nenhuma despesa avisa de outro jeito', () => {
    const aviso = avisoPeriodoParcial({
      ano: 2027, meses_faltantes: [1, 2], meses_comparaveis: 0,
      ultimo_mes_despesa: null, ultimo_mes_receita: null, completo: false,
    })
    expect(aviso).toContain('Nenhuma despesa lançada em 2027')
  })
})

describe('rotuloJanela', () => {
  it('janela parcial vira intervalo', () => {
    expect(rotuloJanela(4)).toBe('jan–abr')
    expect(rotuloJanela(8)).toBe('jan–ago')
  })

  it('12 meses e ano completo', () => {
    expect(rotuloJanela(12)).toBe('ano completo')
  })

  it('janela vazia', () => {
    expect(rotuloJanela(0)).toBe('—')
  })
})

describe('resumirPendencias', () => {
  it('soma os meses e descreve, recentes primeiro', () => {
    const r = resumirPendencias([c2025, c2024, c2026])!
    expect(r.totalMeses).toBe(7) // 3 de 2026 + 4 de 2024
    expect(r.descricao).toBe('mai, jun e jul/2026 e set, out, nov e dez/2024')
    expect(r.anos).toEqual([2026, 2024])
  })

  it('sem pendencia devolve null — o card nao aparece na home', () => {
    expect(resumirPendencias([c2025])).toBeNull()
    expect(resumirPendencias([])).toBeNull()
  })
})

describe('estadoDoMes', () => {
  const hoje = new Date(2026, 7, 4) // 04/08/2026

  it('mes na lista de faltantes e vazio', () => {
    expect(estadoDoMes(2026, 5, 0, [5, 6, 7], hoje)).toBe('vazio')
  })

  it('mes cheio e completo', () => {
    expect(estadoDoMes(2026, 3, 189, [5, 6, 7], hoje)).toBe('completo')
  })

  it('mes com poucos lancamentos e parcial, nao completo', () => {
    // ago/2024 real: 37 lancamentos contra os ~200 tipicos. Marcar completo
    // esconderia o buraco; marcar vazio apagaria o trabalho ja feito.
    expect(estadoDoMes(2024, 8, 15, [9, 10, 11, 12], hoje)).toBe('parcial')
  })

  it('mes no futuro nao esta faltando, esta por vir', () => {
    expect(estadoDoMes(2026, 11, 0, [], hoje)).toBe('futuro')
    expect(estadoDoMes(2027, 1, 0, [], hoje)).toBe('futuro')
  })

  it('mes corrente ainda nao e futuro', () => {
    expect(estadoDoMes(2026, 8, 30, [], hoje)).toBe('completo')
  })
})
