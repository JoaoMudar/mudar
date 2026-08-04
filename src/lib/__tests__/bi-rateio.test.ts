import { describe, it, expect } from 'vitest'
import {
  resolverRateio,
  valorNegocio,
  valorPessoal,
  PCT_MISTO_PADRAO,
  type RegraRateio,
} from '../bi-rateio'

// Espelha o seed da migracao 20260805000001: Combustivel (misto) com regra por
// centro, e a linha-padrao sem centro.
const regras: RegraRateio[] = [
  { categoriaId: 10, centroCusto: 'Viveiro', pctNegocio: 100 },
  { categoriaId: 10, centroCusto: 'Casa', pctNegocio: 0 },
  { categoriaId: 10, centroCusto: 'Sítio', pctNegocio: 50 },
  { categoriaId: 10, centroCusto: null, pctNegocio: 50 },
  { categoriaId: 20, centroCusto: null, pctNegocio: 70 },
]

describe('resolverRateio — ramo 1: categoria de negocio manda', () => {
  it('categoria negocio da 100% mesmo com centro pessoal', () => {
    // Este e o caso que corrige o vazamento reverso: R$63.311 de mao de obra e
    // insumos que a planilha marcou 'pessoal' e ficavam fora do DRE.
    const r = resolverRateio({
      categoriaId: 1,
      categoriaNatureza: 'negocio',
      centroCusto: 'Casa',
      centroNatureza: 'pessoal',
    }, regras)
    expect(r.pctNegocio).toBe(100)
    expect(r.classificacao).toBe('categoria_negocio')
  })
})

describe('resolverRateio — ramo 2: categoria pessoal manda', () => {
  it('categoria pessoal da 0% mesmo com centro de negocio', () => {
    // Corrige o vazamento direto: R$48.793 de mercado/moradia/lazer que estavam
    // marcados 'negocio' na linha e entravam no DRE.
    const r = resolverRateio({
      categoriaId: 2,
      categoriaNatureza: 'pessoal',
      centroCusto: 'Viveiro',
      centroNatureza: 'negocio',
    }, regras)
    expect(r.pctNegocio).toBe(0)
    expect(r.classificacao).toBe('categoria_pessoal')
  })
})

describe('resolverRateio — ramo 3: categoria misto usa o rateio', () => {
  it('regra do centro de custo tem prioridade sobre a padrao', () => {
    const r = resolverRateio({
      categoriaId: 10,
      categoriaNatureza: 'misto',
      centroCusto: 'Viveiro',
      centroNatureza: 'negocio',
    }, regras)
    expect(r.pctNegocio).toBe(100)
    expect(r.classificacao).toBe('rateio_centro')
  })

  it('mesma categoria em centro pessoal zera', () => {
    const r = resolverRateio({
      categoriaId: 10,
      categoriaNatureza: 'misto',
      centroCusto: 'Casa',
      centroNatureza: 'pessoal',
    }, regras)
    expect(r.pctNegocio).toBe(0)
    expect(r.classificacao).toBe('rateio_centro')
  })

  it('centro sem regra propria cai na linha-padrao da categoria', () => {
    const r = resolverRateio({
      categoriaId: 20,
      categoriaNatureza: 'misto',
      centroCusto: 'Campo',
      centroNatureza: 'negocio',
    }, regras)
    expect(r.pctNegocio).toBe(70)
    expect(r.classificacao).toBe('rateio_padrao')
  })

  it('sem centro nenhum tambem cai na linha-padrao', () => {
    const r = resolverRateio({
      categoriaId: 20,
      categoriaNatureza: 'misto',
      centroCusto: null,
      centroNatureza: null,
    }, regras)
    expect(r.pctNegocio).toBe(70)
    expect(r.classificacao).toBe('rateio_padrao')
  })

  it('categoria misto sem nenhuma regra cadastrada usa o padrao de 50%', () => {
    const r = resolverRateio({
      categoriaId: 99,
      categoriaNatureza: 'misto',
      centroCusto: 'Viveiro',
      centroNatureza: 'negocio',
    }, regras)
    expect(r.pctNegocio).toBe(PCT_MISTO_PADRAO)
    expect(r.classificacao).toBe('rateio_fallback')
  })
})

describe('resolverRateio — ramo 4: sem categoria, deduz do centro', () => {
  it('centro de negocio', () => {
    const r = resolverRateio({
      categoriaId: null,
      categoriaNatureza: null,
      centroCusto: 'Viveiro',
      centroNatureza: 'negocio',
    }, regras)
    expect(r.pctNegocio).toBe(100)
    expect(r.classificacao).toBe('centro_custo')
  })

  it('centro pessoal', () => {
    const r = resolverRateio({
      categoriaId: null,
      categoriaNatureza: null,
      centroCusto: 'Casa',
      centroNatureza: 'pessoal',
    }, regras)
    expect(r.pctNegocio).toBe(0)
    expect(r.classificacao).toBe('centro_custo')
  })

  it('centro misto (Sitio, A revisar) fica no meio', () => {
    const r = resolverRateio({
      categoriaId: null,
      categoriaNatureza: null,
      centroCusto: 'Sítio',
      centroNatureza: 'misto',
    }, regras)
    expect(r.pctNegocio).toBe(50)
    expect(r.classificacao).toBe('centro_custo')
  })
})

describe('resolverRateio — ramo 5: indeterminado', () => {
  it('sem categoria e sem centro devolve null, nunca 0 nem 100', () => {
    // Sao ~7% do valor. Chutar qualquer extremo falsearia o DRE, entao a UI
    // mostra como "Nao classificado".
    const r = resolverRateio({
      categoriaId: null,
      categoriaNatureza: null,
      centroCusto: null,
      centroNatureza: null,
    }, regras)
    expect(r.pctNegocio).toBeNull()
    expect(r.classificacao).toBe('sem_classificacao')
  })
})

describe('resolverRateio — robustez', () => {
  it('lista de regras vazia nao quebra o ramo misto', () => {
    const r = resolverRateio({
      categoriaId: 10,
      categoriaNatureza: 'misto',
      centroCusto: 'Viveiro',
      centroNatureza: 'negocio',
    })
    expect(r.pctNegocio).toBe(PCT_MISTO_PADRAO)
  })

  it('pct fora de 0..100 e limitado', () => {
    const ruins: RegraRateio[] = [{ categoriaId: 5, centroCusto: null, pctNegocio: 150 }]
    const r = resolverRateio({
      categoriaId: 5,
      categoriaNatureza: 'misto',
      centroCusto: null,
      centroNatureza: null,
    }, ruins)
    expect(r.pctNegocio).toBe(100)
  })
})

describe('valorNegocio / valorPessoal', () => {
  it('divide conforme o percentual', () => {
    expect(valorNegocio(1000, 60)).toBe(600)
    expect(valorPessoal(1000, 60)).toBe(400)
  })

  it('100% joga tudo para o negocio', () => {
    expect(valorNegocio(1234.56, 100)).toBe(1234.56)
    expect(valorPessoal(1234.56, 100)).toBe(0)
  })

  it('0% joga tudo para o pessoal', () => {
    expect(valorNegocio(1234.56, 0)).toBe(0)
    expect(valorPessoal(1234.56, 0)).toBe(1234.56)
  })

  it('INVARIANTE: negocio + pessoal = valor, ao centavo', () => {
    // E o check que o bi:sanity roda contra o banco inteiro. Se quebrar aqui,
    // quebra la. Valores escolhidos para forcar arredondamento feio.
    for (const [valor, pct] of [
      [1000, 60], [1234.56, 33], [0.01, 50], [99.99, 7], [3333.33, 66],
    ] as const) {
      const n = valorNegocio(valor, pct)!
      const p = valorPessoal(valor, pct)!
      expect(Math.round((n + p) * 100) / 100).toBe(valor)
    }
  })

  it('pct null devolve null nos dois lados', () => {
    expect(valorNegocio(1000, null)).toBeNull()
    expect(valorPessoal(1000, null)).toBeNull()
  })
})
