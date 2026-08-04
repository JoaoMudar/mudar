/**
 * Separacao negocio x pessoal das despesas — a regra que decide quanto de cada
 * lancamento entra no DRE do viveiro.
 *
 * POR QUE ISTO EXISTE
 * O banco historico mistura gasto do viveiro com gasto da familia, e a coluna
 * `despesas.natureza` (nivel da linha) esta furada nos dois sentidos. Medido na
 * janela do BI (2020+):
 *   - R$48.793 em 449 linhas de gasto PESSOAL marcado 'negocio' (Mercado,
 *     Moradia, Assinaturas/Lazer, Saude) entrando no DRE sem dever;
 *   - R$63.311 em 158 linhas de gasto de NEGOCIO marcado 'pessoal' (Mao de obra
 *     R$31,1k, Contabilidade R$16,2k, Insumos R$14,6k) ficando de fora.
 *
 * A correcao e trocar a autoridade: quem manda passa a ser a natureza da
 * CATEGORIA, nao a da linha. Uma linha em "Insumos/Producao" e do negocio,
 * independente do que a planilha marcou.
 *
 * Este modulo e o espelho em TypeScript do que a view financeiro.vw_bi_despesas
 * faz em SQL. Os dois tem que concordar — os testes fixam a regra, e o
 * `npm run bi:sanity` confere o resultado agregado contra o banco.
 */

export type Natureza = 'negocio' | 'pessoal' | 'misto'

/**
 * Como o valor de um lancamento foi classificado. Interessa para a UI conseguir
 * mostrar "por que este gasto entrou (ou nao) no negocio".
 */
export type Classificacao =
  | 'categoria_negocio'     // categoria e de negocio -> 100%
  | 'categoria_pessoal'     // categoria e pessoal -> 0%
  | 'rateio_centro'         // misto, com regra especifica do centro de custo
  | 'rateio_padrao'         // misto, caindo na linha-padrao da categoria
  | 'rateio_fallback'       // misto sem nenhuma linha de rateio -> 50%
  | 'centro_custo'          // sem categoria, deduzido pela natureza do centro
  | 'sem_classificacao'     // sem categoria e sem centro -> nao da para dizer

export interface RegraRateio {
  categoriaId: number
  /** null = linha-padrao da categoria, usada quando o centro nao tem regra. */
  centroCusto: string | null
  pctNegocio: number
}

export interface EntradaRateio {
  categoriaId: number | null
  categoriaNatureza: Natureza | null
  centroCusto: string | null
  centroNatureza: Natureza | null
}

export interface ResultadoRateio {
  /** null = indeterminado. NUNCA cai para 0 ou 100 no silencio. */
  pctNegocio: number | null
  classificacao: Classificacao
}

/** Percentual padrao de uma categoria 'misto' sem nenhuma regra cadastrada. */
export const PCT_MISTO_PADRAO = 50

/** natureza do centro de custo -> quanto disso e negocio. */
function pctPorNatureza(n: Natureza): number {
  if (n === 'negocio') return 100
  if (n === 'pessoal') return 0
  return PCT_MISTO_PADRAO
}

/**
 * Resolve quanto (%) de um lancamento pertence ao negocio.
 *
 * Precedencia — a ordem importa e e o coracao da correcao:
 *   1. categoria 'negocio'  -> 100  (categoria manda sobre a linha)
 *   2. categoria 'pessoal'  -> 0
 *   3. categoria 'misto'    -> rateio por (categoria, centro), senao
 *                              (categoria, NULL), senao 50
 *   4. sem categoria        -> deduz pela natureza do centro de custo
 *   5. sem categoria e sem centro -> null / 'sem_classificacao'
 *
 * Repare que `despesas.natureza` (nivel da linha) nao aparece em lugar nenhum.
 * E de proposito: e justamente a coluna nao confiavel.
 */
export function resolverRateio(
  entrada: EntradaRateio,
  regras: readonly RegraRateio[] = [],
): ResultadoRateio {
  const { categoriaId, categoriaNatureza, centroCusto, centroNatureza } = entrada

  // 1 e 2 — a categoria decide sozinha.
  if (categoriaId != null && categoriaNatureza === 'negocio') {
    return { pctNegocio: 100, classificacao: 'categoria_negocio' }
  }
  if (categoriaId != null && categoriaNatureza === 'pessoal') {
    return { pctNegocio: 0, classificacao: 'categoria_pessoal' }
  }

  // 3 — misto: procura a regra mais especifica primeiro.
  if (categoriaId != null && categoriaNatureza === 'misto') {
    const doCentro =
      centroCusto == null
        ? undefined
        : regras.find((r) => r.categoriaId === categoriaId && r.centroCusto === centroCusto)
    if (doCentro) {
      return { pctNegocio: clampPct(doCentro.pctNegocio), classificacao: 'rateio_centro' }
    }

    const padrao = regras.find((r) => r.categoriaId === categoriaId && r.centroCusto === null)
    if (padrao) {
      return { pctNegocio: clampPct(padrao.pctNegocio), classificacao: 'rateio_padrao' }
    }

    return { pctNegocio: PCT_MISTO_PADRAO, classificacao: 'rateio_fallback' }
  }

  // 4 — sem categoria: o centro de custo e o que sobra.
  if (centroNatureza != null) {
    return { pctNegocio: pctPorNatureza(centroNatureza), classificacao: 'centro_custo' }
  }

  // 5 — nada a declarar. Deixar explicito e melhor do que chutar: sao ~7% do
  // valor, e some-los como 0 ou 100 falsearia o DRE nas duas pontas.
  return { pctNegocio: null, classificacao: 'sem_classificacao' }
}

function clampPct(p: number): number {
  if (!Number.isFinite(p)) return PCT_MISTO_PADRAO
  return Math.min(100, Math.max(0, Math.round(p)))
}

/**
 * Parte do valor que entra no DRE do negocio. `null` quando indeterminado — a UI
 * mostra como "Nao classificado", nunca como zero.
 */
export function valorNegocio(valor: number, pctNegocio: number | null): number | null {
  if (pctNegocio == null || !Number.isFinite(valor)) return null
  return arredondaCentavos(valor * (pctNegocio / 100))
}

/** Complemento de valorNegocio. Os dois somados devolvem o valor cheio. */
export function valorPessoal(valor: number, pctNegocio: number | null): number | null {
  if (pctNegocio == null || !Number.isFinite(valor)) return null
  const neg = arredondaCentavos(valor * (pctNegocio / 100))
  // Subtrai em vez de calcular por (100-pct): garante negocio + pessoal == valor
  // ao centavo, que e o invariante checado pelo bi:sanity.
  return arredondaCentavos(valor - neg)
}

function arredondaCentavos(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Rotulo curto para a UI explicar a classificacao sem abrir documentacao. */
export const CLASSIFICACAO_LABEL: Record<Classificacao, string> = {
  categoria_negocio: 'Negócio (categoria)',
  categoria_pessoal: 'Pessoal (categoria)',
  rateio_centro: 'Rateio por centro de custo',
  rateio_padrao: 'Rateio padrão da categoria',
  rateio_fallback: 'Rateio padrão (50%)',
  centro_custo: 'Deduzido do centro de custo',
  sem_classificacao: 'Não classificado',
}
