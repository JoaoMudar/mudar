/**
 * Paleta dos graficos do BI.
 *
 * Validada contra a superficie real dos cards do app (#ffffff, nao o cinza da
 * pagina) com o validador do skill dataviz:
 *
 *   node scripts/validate_palette.js \
 *     "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4,#008300,#4a3aa7,#e34948" \
 *     --mode light --surface "#ffffff"
 *
 *   Faixa de luminosidade PASS · Piso de croma PASS
 *   Separacao CVD  PASS (pior par adjacente DE 9.1)
 *   Piso visao normal PASS (19.6)
 *   Contraste WARN: aqua 2.82, amarelo 2.17, magenta 2.69  -> exigem rotulo
 *                   visivel ou tabela (ChartCard tem "ver tabela" sempre)
 *
 * O app nao tem modo escuro, entao so o modo claro e definido — inventar um
 * tema escuro que ninguem ve seria codigo morto.
 *
 * REGRAS QUE ESTE ARQUIVO EXISTE PARA MANTER
 * - Slots categoricos em ordem fixa, nunca ciclados. A 9a serie vira "Outros".
 * - Categoria nominal (grupo de despesa, especie, cliente) = UMA cor para todas
 *   as barras. Escurecer conforme o valor duplicaria o que o tamanho ja diz.
 * - Magnitude continua (heatmap) = uma unica matiz, claro -> escuro.
 * - Divergente (resultado acima/abaixo de zero) = azul <-> vermelho com cinza
 *   neutro no meio.
 * - Cor de status nunca vira cor de serie, e sempre acompanha icone + rotulo.
 */

/** Slots categoricos, em ordem fixa. Use a partir do slot 1, sem pular. */
export const SERIES = [
  '#2a78d6', // 1 azul
  '#eb6834', // 2 laranja
  '#1baf7a', // 3 aqua      (contraste 2.82 — exige rotulo/tabela)
  '#eda100', // 4 amarelo   (2.17)
  '#e87ba4', // 5 magenta   (2.69)
  '#008300', // 6 verde
  '#4a3aa7', // 7 violeta
  '#e34948', // 8 vermelho
] as const

/** Papeis nomeados, para o codigo das telas nao carregar hex solto. */
export const COR = {
  receita: SERIES[0],
  despesa: SERIES[1],
  /** Serie unica / categorias nominais. */
  padrao: SERIES[0],
} as const

/**
 * Rampa sequencial (azul claro -> escuro) para magnitude continua: heatmap de
 * receita por ano x mes. Passo 100 = perto de zero.
 */
export const SEQUENCIAL = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef',
  '#6da7ec', '#5598e7', '#3987e5', '#2a78d6',
  '#256abf', '#1c5cab', '#184f95', '#104281',
] as const

/**
 * Escolhe o passo da rampa para um valor em [0..max].
 * Zero devolve a cor de "vazio" — mes sem lancamento nao pode parecer mes fraco.
 */
export function corSequencial(valor: number, max: number): string {
  if (!(max > 0) || !(valor > 0)) return VAZIO
  const i = Math.min(
    SEQUENCIAL.length - 1,
    Math.floor((valor / max) * SEQUENCIAL.length),
  )
  return SEQUENCIAL[i]
}

/** Par divergente + meio neutro. Resultado positivo x negativo. */
export const DIVERGENTE = {
  positivo: '#2a78d6',
  negativo: '#d03b3b',
  neutro: '#f0efec',
} as const

/**
 * Cores de status. Reservadas para estado (bom/atencao/critico) — nunca para
 * identificar uma serie. Sempre com icone + rotulo junto, porque `warning` fica
 * abaixo de 3:1 no branco de proposito.
 */
export const STATUS = {
  bom: '#0ca30c',
  atencao: '#fab219',
  serio: '#ec835a',
  critico: '#d03b3b',
} as const

/** Cromo do grafico: tudo um tom acima da superficie, nunca tracejado. */
export const CROMO = {
  grade: '#e1e0d9',
  eixo: '#c3c2b7',
  tintaMuda: '#898781',
  tintaSecundaria: '#52514e',
  tintaPrimaria: '#0b0b0b',
  superficie: '#ffffff',
  /** Preenchimento de dado ausente/incompleto — cinza, nunca uma cor de serie. */
  vazio: '#e5e5e2',
} as const

export const VAZIO = CROMO.vazio

/**
 * Ano incompleto (2024, 2026) entra com opacidade reduzida e hachura, para nao
 * ser lido como um ano comparavel. Ver src/lib/bi-periodo.ts.
 */
export const OPACIDADE_PARCIAL = 0.45

/** Props comuns de eixo/grade do Recharts, para as telas nao repetirem. */
export const EIXO_PROPS = {
  stroke: CROMO.eixo,
  tick: { fill: CROMO.tintaMuda, fontSize: 11 },
  tickLine: false,
} as const

export const GRADE_PROPS = {
  stroke: CROMO.grade,
  strokeDasharray: '0', // solida: tracejado leria como projecao/limite
  vertical: false,
} as const
