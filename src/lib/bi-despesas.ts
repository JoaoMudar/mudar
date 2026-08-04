/**
 * Validacao do lancamento de despesa — o formulario que substitui a planilha.
 *
 * O ponto nao e so gravar: e nao repetir os defeitos que a planilha deixou no
 * historico. Cada regra daqui fecha um deles na origem:
 *   - categoria OBRIGATORIA        -> nao nasce pendencia nova (havia 7.449)
 *   - ano/mes derivados de `data`  -> eixo de tempo nunca mais diverge (1.360)
 *   - data futura bloqueada        -> nao cria balde de mes que ainda nao veio
 *   - valor > 0                    -> nao entra linha-fantasma de R$0 (1.900)
 *   - natureza derivada da categoria -> o vazamento negocio/pessoal nao renasce
 *
 * Modulo puro, no padrao de src/lib/customers.ts.
 */

import { parseValorBR } from './format'

export const ANO_MINIMO = 2020

/** Acima disso o formulario pede confirmacao — nao bloqueia, so chama a atencao. */
export const VALOR_ALERTA = 50_000
export const VALOR_MAXIMO = 1_000_000

export interface DespesaInput {
  data?: string | null
  descricao?: string | null
  valor_total?: string | number | null
  categoria_id?: number | string | null
  centro_custo?: string | null
  quantidade?: string | number | null
  unidade?: string | null
  valor_mc?: string | number | null
  mao_obra?: string | number | null
  equipamento?: string | number | null
  deslocamento?: string | number | null
}

export interface DespesaValida {
  data: string
  ano: number
  mes: number
  descricao: string
  valor_total: number
  categoria_id: number
  centro_custo: string
  quantidade: number | null
  unidade: string | null
  valor_mc: number | null
  mao_obra: number | null
  equipamento: number | null
  deslocamento: number | null
}

/** Deriva ano/mes de uma data ISO. E isto que impede a divergencia de eixo. */
export function deriveAnoMes(dataISO: string): { ano: number; mes: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO)
  if (!m) return null
  const ano = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  // Rejeita 31/02 e afins: o Date normalizaria para marco em silencio.
  const d = new Date(ano, mes - 1, dia)
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null
  return { ano, mes }
}

function numeroOpcional(v: unknown): number | null {
  if (v == null || v === '') return null
  return parseValorBR(v as string | number)
}

/**
 * Valida e normaliza. Devolve `{ erro }` com mensagem em portugues pronta para a
 * tela, ou `{ valor }` com tudo ja convertido.
 */
export function validateDespesa(
  input: DespesaInput,
  hoje = new Date(),
): { erro: string } | { valor: DespesaValida } {
  // --- data ---
  const dataStr = (input.data ?? '').trim()
  if (!dataStr) return { erro: 'Informe a data.' }
  const anoMes = deriveAnoMes(dataStr)
  if (!anoMes) return { erro: 'Data inválida.' }

  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  if (dataStr > hojeISO) return { erro: 'A data não pode ser no futuro.' }
  if (anoMes.ano < ANO_MINIMO) {
    return { erro: `O painel só cobre de ${ANO_MINIMO} em diante.` }
  }

  // --- descricao ---
  const descricao = (input.descricao ?? '').trim().replace(/\s+/g, ' ')
  if (descricao.length < 3) return { erro: 'Descreva a despesa (mínimo 3 letras).' }
  if (descricao.length > 200) return { erro: 'Descrição muito longa (máximo 200 letras).' }

  // --- valor ---
  const valor = parseValorBR(input.valor_total ?? null)
  if (valor == null) return { erro: 'Informe o valor.' }
  if (!(valor > 0)) return { erro: 'O valor precisa ser maior que zero.' }
  if (valor > VALOR_MAXIMO) return { erro: 'Valor acima do limite. Confira se digitou certo.' }

  // --- categoria: obrigatoria, e o ponto do formulario ---
  const categoriaId = Number(input.categoria_id)
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    return { erro: 'Escolha a categoria.' }
  }

  const centro = (input.centro_custo ?? '').trim()
  if (!centro) return { erro: 'Escolha o centro de custo.' }

  // --- quantidade/unidade andam juntas ---
  const quantidade = numeroOpcional(input.quantidade)
  const unidade = (input.unidade ?? '').trim() || null
  if (quantidade != null && !(quantidade > 0)) {
    return { erro: 'A quantidade precisa ser maior que zero.' }
  }
  if (quantidade != null && !unidade) return { erro: 'Informe a unidade da quantidade.' }

  // --- decomposicao opcional: se preenchida, tem que fechar com o total ---
  const mc = numeroOpcional(input.valor_mc)
  const mao = numeroOpcional(input.mao_obra)
  const equip = numeroOpcional(input.equipamento)
  const desloc = numeroOpcional(input.deslocamento)
  const partes = [mc, mao, equip, desloc].filter((p): p is number => p != null)
  if (partes.length > 0) {
    if (partes.some((p) => p < 0)) return { erro: 'Os valores detalhados não podem ser negativos.' }
    const soma = partes.reduce((s, p) => s + p, 0)
    if (Math.abs(soma - valor) > 0.01) {
      return {
        erro: `A soma do detalhamento (${soma.toFixed(2)}) não bate com o valor total (${valor.toFixed(2)}).`,
      }
    }
  }

  return {
    valor: {
      data: dataStr,
      ano: anoMes.ano,
      mes: anoMes.mes,
      descricao,
      valor_total: valor,
      categoria_id: categoriaId,
      centro_custo: centro,
      quantidade, unidade,
      valor_mc: mc, mao_obra: mao, equipamento: equip, deslocamento: desloc,
    },
  }
}

/**
 * `despesas.natureza` a partir do rateio resolvido.
 *
 * Continua sendo gravada para nao degradar as views legadas (vw_dre_anual e
 * companhia, que o readmeBI.md publica), mas DEIXOU de ser fonte da verdade —
 * quem manda agora e a categoria. Ver src/lib/bi-rateio.ts.
 */
export function naturezaDerivada(pctNegocio: number | null): 'negocio' | 'pessoal' | 'misto' {
  if (pctNegocio == null) return 'misto'
  if (pctNegocio >= 100) return 'negocio'
  if (pctNegocio <= 0) return 'pessoal'
  return 'misto'
}
