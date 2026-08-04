/**
 * Regras de periodo parcial — o que impede o painel de mentir.
 *
 * O DEFEITO QUE ISTO RESOLVE
 * A despesa de 2024 para em jul e a de 2026 em abr, mas a receita segue ate
 * dez/2024 e jul/2026. Dividir uma receita cheia por uma despesa pela metade
 * produz margem de 74,1% em 2024 e 79,2% em 2026 — numeros que nao existem.
 * Sao os maiores candidatos a uma decisao errada tomada com o painel na mao.
 *
 * A politica, aplicada em toda tela:
 *   - ano incompleto entra esmaecido/hachurado, com a tag "parcial";
 *   - margem e percentuais anuais viram travessao, nao numero;
 *   - comparacao ano a ano usa a janela em que os DOIS anos tem dado.
 *
 * Modulo puro: recebe o que a view financeiro.vw_bi_cobertura devolve e decide.
 */

import { formatListaMeses, formatMonthYearBR } from './format'

/** Uma linha de financeiro.vw_bi_cobertura. */
export interface Cobertura {
  ano: number
  meses_faltantes: number[]
  meses_comparaveis: number
  ultimo_mes_despesa: number | null
  ultimo_mes_receita: number | null
  completo: boolean
}

/** Um ano e "confiavel" para margem anual quando nao falta mes e ja terminou. */
export function anoConfiavel(c: Cobertura | undefined | null): boolean {
  return !!c?.completo
}

/**
 * Margem que pode ir para a tela. Devolve null (a tela mostra "—") quando o ano
 * esta incompleto, mesmo que o banco tenha um numero.
 *
 * Preferimos esconder a mostrar errado: um travessao gera a pergunta certa
 * ("por que nao tem?"), um 79% falso gera a decisao errada.
 */
export function margemExibivel(
  margem: number | null | undefined,
  c: Cobertura | undefined | null,
  incluirIncompletos = false,
): number | null {
  if (margem == null) return null
  if (!incluirIncompletos && !anoConfiavel(c)) return null
  return margem
}

/** Opacidade da barra/area do ano: incompleto entra esmaecido. */
export function opacidadeAno(c: Cobertura | undefined | null, parcialOpacidade = 0.45): number {
  return anoConfiavel(c) ? 1 : parcialOpacidade
}

/**
 * Frase do aviso de periodo parcial. Devolve null quando nao ha o que avisar,
 * para a tela simplesmente nao renderizar a faixa.
 *
 * Ex.: "Última despesa lançada: abr/2026. Faltam mai, jun e jul — o painel está
 *       subestimando o custo de 2026."
 */
export function avisoPeriodoParcial(c: Cobertura | undefined | null): string | null {
  if (!c || c.meses_faltantes.length === 0) return null

  const faltam = formatListaMeses(c.meses_faltantes)
  const ultimo =
    c.ultimo_mes_despesa != null
      ? formatMonthYearBR(c.ano, c.ultimo_mes_despesa)
      : null

  const inicio = ultimo
    ? `Última despesa lançada: ${ultimo}.`
    : `Nenhuma despesa lançada em ${c.ano}.`

  return `${inicio} Faltam ${faltam} — o painel está subestimando o custo de ${c.ano}.`
}

/** Texto curto da janela usada na comparacao. Ex.: "jan–abr". */
export function rotuloJanela(meses: number): string {
  if (meses <= 0) return '—'
  if (meses >= 12) return 'ano completo'
  return `jan–${formatListaMeses([meses])}`
}

export interface ResumoPendencia {
  /** Total de meses sem lancar, somando todos os anos. */
  totalMeses: number
  /** Frase pronta para o card da home. Ex.: "mai–jul/2026 e ago–dez/2024". */
  descricao: string
  anos: number[]
}

/**
 * Consolida os meses faltantes de todos os anos para o alerta da home.
 * Anos mais recentes primeiro — e o que a pessoa vai lancar antes.
 */
export function resumirPendencias(coberturas: readonly Cobertura[]): ResumoPendencia | null {
  const comFalta = coberturas
    .filter((c) => c.meses_faltantes.length > 0)
    .sort((a, b) => b.ano - a.ano)

  if (comFalta.length === 0) return null

  const totalMeses = comFalta.reduce((s, c) => s + c.meses_faltantes.length, 0)
  const descricao = comFalta
    .map((c) => `${formatListaMeses(c.meses_faltantes)}/${c.ano}`)
    .join(' e ')

  return { totalMeses, descricao, anos: comFalta.map((c) => c.ano) }
}

/** Estado de um mes na grade da tela de preenchimento. */
export type EstadoMes = 'completo' | 'parcial' | 'vazio' | 'futuro'

/**
 * Classifica um mes para a grade ano x mes.
 *
 * `parcial` existe porque um mes pode ter algumas linhas sem estar fechado — e
 * o caso de ago/2024 (37 lancamentos, R$7,4k contra os ~R$30k tipicos). Marcar
 * como completo esconderia o buraco; como vazio, apagaria o trabalho ja feito.
 */
export function estadoDoMes(
  ano: number,
  mes: number,
  lancamentos: number,
  faltantes: readonly number[],
  hoje = new Date(),
): EstadoMes {
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1
  if (ano > anoAtual || (ano === anoAtual && mes > mesAtual)) return 'futuro'
  if (faltantes.includes(mes)) return 'vazio'
  if (lancamentos > 0 && lancamentos < 20) return 'parcial'
  return 'completo'
}
