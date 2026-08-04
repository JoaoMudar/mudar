'use server'

import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'

/**
 * Leituras do BI financeiro.
 *
 * Tudo aqui le as views vw_bi_* do schema `financeiro`, que ja aplicam as quatro
 * regras inegociaveis (sem totalizador, sem excluido, corte de 2020, rateio por
 * categoria). Nenhuma query deste arquivo deve recalcular essas regras na mao —
 * se precisar de um recorte novo, a view e o lugar.
 *
 * O schema e SEMPRE qualificado: o pool e compartilhado com o app (schema
 * `public`) e mexer no search_path afetaria as duas metades.
 */

export interface Cobertura {
  ano: number
  meses_faltantes: number[]
  meses_comparaveis: number
  ultimo_mes_despesa: number | null
  ultimo_mes_receita: number | null
  completo: boolean
}

export interface DreAno {
  ano: number
  receita: number
  despesa_negocio: number
  despesa_pessoal: number
  despesa_total: number
  resultado: number
  margem_pct: number | null
  janela_comp: number
  receita_comp: number
  despesa_comp: number
  receita_comp_anterior: number
  despesa_comp_anterior: number
  resultado_comp: number
  resultado_comp_anterior: number
  margem_comp_pct: number | null
  margem_comp_anterior_pct: number | null
  var_receita_comp_pct: number | null
  var_despesa_comp_pct: number | null
  completo: boolean
  meses_faltantes: number[]
  meses_comparaveis: number
  ultimo_mes_despesa: number | null
  ultimo_mes_receita: number | null
}

export interface ExecutivoData {
  dre: DreAno[]
  cobertura: Cobertura[]
  anoAtual: number
}

/** Numeric do Postgres chega como string; converter uma vez, na borda. */
function num(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}
function numOuNulo(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : null
}

function mapDre(r: Record<string, unknown>): DreAno {
  return {
    ano: num(r.ano),
    receita: num(r.receita),
    despesa_negocio: num(r.despesa_negocio),
    despesa_pessoal: num(r.despesa_pessoal),
    despesa_total: num(r.despesa_total),
    resultado: num(r.resultado),
    margem_pct: numOuNulo(r.margem_pct),
    janela_comp: num(r.janela_comp),
    receita_comp: num(r.receita_comp),
    despesa_comp: num(r.despesa_comp),
    receita_comp_anterior: num(r.receita_comp_anterior),
    despesa_comp_anterior: num(r.despesa_comp_anterior),
    resultado_comp: num(r.resultado_comp),
    resultado_comp_anterior: num(r.resultado_comp_anterior),
    margem_comp_pct: numOuNulo(r.margem_comp_pct),
    margem_comp_anterior_pct: numOuNulo(r.margem_comp_anterior_pct),
    var_receita_comp_pct: numOuNulo(r.var_receita_comp_pct),
    var_despesa_comp_pct: numOuNulo(r.var_despesa_comp_pct),
    completo: r.completo === true,
    meses_faltantes: (r.meses_faltantes as number[]) ?? [],
    meses_comparaveis: num(r.meses_comparaveis),
    ultimo_mes_despesa: numOuNulo(r.ultimo_mes_despesa),
    ultimo_mes_receita: numOuNulo(r.ultimo_mes_receita),
  }
}

function mapCobertura(r: Record<string, unknown>): Cobertura {
  return {
    ano: num(r.ano),
    meses_faltantes: (r.meses_faltantes as number[]) ?? [],
    meses_comparaveis: num(r.meses_comparaveis),
    ultimo_mes_despesa: numOuNulo(r.ultimo_mes_despesa),
    ultimo_mes_receita: numOuNulo(r.ultimo_mes_receita),
    completo: r.completo === true,
  }
}

/** Visao executiva: DRE por ano + cobertura. */
export async function getExecutivo(): Promise<ExecutivoData> {
  await requireRole('admin', 'chefia')

  const [dre, cob] = await Promise.all([
    pool.query(`SELECT * FROM financeiro.vw_bi_dre_anual ORDER BY ano`),
    pool.query(`SELECT * FROM financeiro.vw_bi_cobertura ORDER BY ano`),
  ])

  return {
    dre: dre.rows.map(mapDre),
    cobertura: cob.rows.map(mapCobertura),
    anoAtual: new Date().getFullYear(),
  }
}

export interface MesSerie {
  ano: number
  mes: number
  receita: number
  despesa: number
  resultado: number
}

export interface MensalData {
  serie: MesSerie[]
  cobertura: Cobertura[]
  anos: number[]
}

/** Serie mensal completa (receita, despesa de negocio, resultado) por ano/mes. */
export async function getMensal(): Promise<MensalData> {
  await requireRole('admin', 'chefia')

  const [serie, cob] = await Promise.all([
    // FULL JOIN: um mes pode ter receita sem despesa (e o caso de 2024/2026) ou
    // o contrario. INNER JOIN esconderia exatamente o buraco que queremos ver.
    pool.query(`
      WITH r AS (
        SELECT ano, mes, SUM(receita) AS receita
        FROM financeiro.vw_bi_receita_mensal GROUP BY 1, 2
      ),
      d AS (
        SELECT ano, mes, SUM(valor_negocio) AS despesa
        FROM financeiro.vw_bi_despesa_mensal GROUP BY 1, 2
      )
      SELECT
        COALESCE(r.ano, d.ano) AS ano,
        COALESCE(r.mes, d.mes) AS mes,
        COALESCE(r.receita, 0) AS receita,
        COALESCE(d.despesa, 0) AS despesa
      FROM r FULL JOIN d ON d.ano = r.ano AND d.mes = r.mes
      ORDER BY 1, 2
    `),
    pool.query(`SELECT * FROM financeiro.vw_bi_cobertura ORDER BY ano`),
  ])

  const linhas: MesSerie[] = serie.rows.map((r) => {
    const receita = num(r.receita)
    const despesa = num(r.despesa)
    return { ano: num(r.ano), mes: num(r.mes), receita, despesa, resultado: receita - despesa }
  })

  return {
    serie: linhas,
    cobertura: cob.rows.map(mapCobertura),
    anos: [...new Set(linhas.map((l) => l.ano))].sort((a, b) => b - a),
  }
}

export interface GrupoCusto {
  grupo: string
  valor: number
  valor_negocio: number
  valor_pessoal: number
  lancamentos: number
}
export interface CentroCusto {
  centro_custo: string | null
  valor: number
  valor_negocio: number
}
export interface CategoriaCusto {
  categoria: string | null
  grupo: string | null
  valor: number
  valor_negocio: number
  lancamentos: number
}

export interface CustosData {
  grupos: GrupoCusto[]
  centros: CentroCusto[]
  categorias: CategoriaCusto[]
  anos: number[]
  ano: number
}

/** Estrutura de custo de um ano. `ano` null = ano mais recente com dado. */
export async function getCustos(ano?: number): Promise<CustosData> {
  await requireRole('admin', 'chefia')

  const anosRes = await pool.query(
    `SELECT DISTINCT ano FROM financeiro.vw_bi_estrutura_custo ORDER BY ano DESC`,
  )
  const anos = anosRes.rows.map((r) => num(r.ano))
  const alvo = ano && anos.includes(ano) ? ano : (anos[0] ?? new Date().getFullYear())

  const [grupos, centros, categorias] = await Promise.all([
    pool.query(
      `SELECT grupo, valor, valor_negocio, valor_pessoal, lancamentos
         FROM financeiro.vw_bi_estrutura_custo
        WHERE ano = $1 ORDER BY valor_negocio DESC`,
      [alvo],
    ),
    pool.query(
      `SELECT centro_custo, SUM(valor) AS valor, SUM(valor_negocio) AS valor_negocio
         FROM financeiro.vw_bi_despesa_mensal
        WHERE ano = $1 GROUP BY 1 ORDER BY 2 DESC`,
      [alvo],
    ),
    pool.query(
      `SELECT categoria, grupo, SUM(valor) AS valor, SUM(valor_negocio) AS valor_negocio,
              SUM(lancamentos)::int AS lancamentos
         FROM financeiro.vw_bi_despesa_mensal
        WHERE ano = $1 GROUP BY 1, 2 ORDER BY 3 DESC`,
      [alvo],
    ),
  ])

  return {
    grupos: grupos.rows.map((r) => ({
      grupo: String(r.grupo),
      valor: num(r.valor),
      valor_negocio: num(r.valor_negocio),
      valor_pessoal: num(r.valor_pessoal),
      lancamentos: num(r.lancamentos),
    })),
    centros: centros.rows.map((r) => ({
      centro_custo: (r.centro_custo as string) ?? null,
      valor: num(r.valor),
      valor_negocio: num(r.valor_negocio),
    })),
    categorias: categorias.rows.map((r) => ({
      categoria: (r.categoria as string) ?? null,
      grupo: (r.grupo as string) ?? null,
      valor: num(r.valor),
      valor_negocio: num(r.valor_negocio),
      lancamentos: num(r.lancamentos),
    })),
    anos,
    ano: alvo,
  }
}

export interface MesPreenchimento {
  ano: number
  mes: number
  lancamentos: number
  valor: number
}
export interface PreenchimentoData {
  meses: MesPreenchimento[]
  cobertura: Cobertura[]
}

/** Grade ano x mes da tela de preenchimento. */
export async function getPreenchimento(): Promise<PreenchimentoData> {
  await requireRole('admin', 'chefia')

  const [meses, cob] = await Promise.all([
    pool.query(`
      SELECT ano_ref AS ano, mes_ref AS mes,
             COUNT(*) FILTER (WHERE valor > 0)::int AS lancamentos,
             SUM(valor) AS valor
        FROM financeiro.vw_bi_despesas
       GROUP BY 1, 2 ORDER BY 1, 2
    `),
    pool.query(`SELECT * FROM financeiro.vw_bi_cobertura ORDER BY ano`),
  ])

  return {
    meses: meses.rows.map((r) => ({
      ano: num(r.ano), mes: num(r.mes),
      lancamentos: num(r.lancamentos), valor: num(r.valor),
    })),
    cobertura: cob.rows.map(mapCobertura),
  }
}

export interface MetricaQualidade {
  metrica: string
  rotulo: string
  quantidade: number
  valor: number | null
  severidade: string
  rota: string
}
export interface ConferenciaMes {
  ano: number
  mes: number
  aba: string
  total_planilha: number | null
  total_detalhe: number | null
  diferenca: number
  confere: boolean
}
export interface QualidadeData {
  metricas: MetricaQualidade[]
  divergencias: ConferenciaMes[]
  conferenciaTotal: number
  conferenciaOk: number
}

export async function getQualidade(): Promise<QualidadeData> {
  await requireRole('admin', 'chefia')

  const [metricas, divergencias, resumo] = await Promise.all([
    pool.query(`SELECT * FROM financeiro.vw_bi_qualidade`),
    pool.query(`
      SELECT * FROM financeiro.vw_bi_conferencia_mensal
       WHERE NOT confere ORDER BY ABS(diferenca) DESC LIMIT 40
    `),
    pool.query(`
      SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE confere)::int AS ok
        FROM financeiro.vw_bi_conferencia_mensal
    `),
  ])

  return {
    metricas: metricas.rows.map((r) => ({
      metrica: String(r.metrica),
      rotulo: String(r.rotulo),
      quantidade: num(r.quantidade),
      valor: numOuNulo(r.valor),
      severidade: String(r.severidade),
      rota: String(r.rota),
    })),
    divergencias: divergencias.rows.map((r) => ({
      ano: num(r.ano), mes: num(r.mes), aba: String(r.aba),
      total_planilha: numOuNulo(r.total_planilha),
      total_detalhe: numOuNulo(r.total_detalhe),
      diferenca: num(r.diferenca),
      confere: r.confere === true,
    })),
    conferenciaTotal: num(resumo.rows[0]?.total),
    conferenciaOk: num(resumo.rows[0]?.ok),
  }
}

export interface EspecieVenda {
  nome_comum: string
  nome_cientifico: string | null
  quantidade: number
  receita: number
}
export interface RecipienteQtd { recipiente: string; quantidade: number }
export interface RecipienteReceita { recipiente: string; receita: number; itens: number }
export interface MunicipioVenda {
  municipio: string
  uf: string
  latitude: number | null
  longitude: number | null
  notas: number
  receita: number
}
export interface UfVenda { uf: string; receita: number; notas: number }

export interface VendasData {
  especies: EspecieVenda[]
  recipientesQtd: RecipienteQtd[]
  recipientesReceita: RecipienteReceita[]
  municipios: MunicipioVenda[]
  ufs: UfVenda[]
  anos: number[]
  ano: number | null
  /** % da receita com coordenada. Abaixo de 95% a tela avisa. */
  pctMapeada: number
}

/**
 * Vendas por especie, recipiente e geografia.
 * `ano` null = todos os anos da janela.
 */
export async function getVendas(ano?: number): Promise<VendasData> {
  await requireRole('admin', 'chefia')

  const anosRes = await pool.query(
    `SELECT DISTINCT ano FROM financeiro.vw_bi_vendas_especie_ano ORDER BY ano DESC`,
  )
  const anos = anosRes.rows.map((r) => num(r.ano))
  const alvo = ano && anos.includes(ano) ? ano : null
  const filtro = alvo ? 'AND ano = $1' : ''
  const binds = alvo ? [alvo] : []

  const [especies, recQtd, recReceita, municipios] = await Promise.all([
    pool.query(
      `SELECT nome_comum, nome_cientifico,
              SUM(quantidade) AS quantidade, SUM(receita) AS receita
         FROM financeiro.vw_bi_vendas_especie_ano
        WHERE receita > 0 ${filtro}
        GROUP BY 1, 2 ORDER BY 4 DESC LIMIT 15`,
      binds,
    ),
    // QUANTIDADE vem de controle_notas: itens_nota nao cobre bem os recipientes
    // maiores (regra 4 do readmeBI.md). As colunas sao um recipiente cada.
    pool.query(
      `SELECT
         COALESCE(SUM(tub), 0)    AS tubete,
         COALESCE(SUM(r10x18), 0) AS r10x18,
         COALESCE(SUM(r17x22), 0) AS r17x22,
         COALESCE(SUM(r20x26), 0) AS r20x26,
         COALESCE(SUM(r28x32), 0) AS r28x32,
         COALESCE(SUM(balde), 0)  AS balde
       FROM financeiro.controle_notas
      WHERE ano >= financeiro.bi_ano_minimo() ${alvo ? 'AND ano = $1' : ''}`,
      binds,
    ),
    // RECEITA vem de itens_nota — fonte diferente, cobertura diferente.
    pool.query(
      `SELECT COALESCE(i.recipiente, '(não especificado)') AS recipiente,
              COUNT(*)::int AS itens, SUM(i.valor_total) AS receita
         FROM financeiro.itens_nota i
         JOIN financeiro.notas_fiscais nf ON nf.id = i.nota_id
        WHERE nf.ano >= financeiro.bi_ano_minimo() ${alvo ? 'AND nf.ano = $1' : ''}
        GROUP BY 1 ORDER BY 3 DESC NULLS LAST`,
      binds,
    ),
    pool.query(
      `SELECT municipio, uf, latitude, longitude,
              SUM(notas)::int AS notas, SUM(receita) AS receita
         FROM financeiro.vw_bi_vendas_geo
        WHERE TRUE ${filtro}
        GROUP BY 1, 2, 3, 4 ORDER BY 6 DESC`,
      binds,
    ),
  ])

  const mun: MunicipioVenda[] = municipios.rows.map((r) => ({
    municipio: String(r.municipio ?? ''),
    uf: String(r.uf ?? ''),
    latitude: numOuNulo(r.latitude),
    longitude: numOuNulo(r.longitude),
    notas: num(r.notas),
    receita: num(r.receita),
  }))

  const receitaTotal = mun.reduce((s, m) => s + m.receita, 0)
  const receitaMapeada = mun
    .filter((m) => m.latitude != null && m.longitude != null)
    .reduce((s, m) => s + m.receita, 0)

  const porUf = new Map<string, UfVenda>()
  for (const m of mun) {
    const atual = porUf.get(m.uf) ?? { uf: m.uf, receita: 0, notas: 0 }
    atual.receita += m.receita
    atual.notas += m.notas
    porUf.set(m.uf, atual)
  }

  const q = recQtd.rows[0] ?? {}
  const rotulos: [string, string][] = [
    ['tubete', 'Tubete'], ['r10x18', 'Saco 10x18'], ['r17x22', 'Saco 17x22'],
    ['r20x26', 'Saco 20x26'], ['r28x32', 'Saco 28x32'], ['balde', 'Balde'],
  ]

  return {
    especies: especies.rows.map((r) => ({
      nome_comum: String(r.nome_comum ?? ''),
      nome_cientifico: (r.nome_cientifico as string) ?? null,
      quantidade: num(r.quantidade),
      receita: num(r.receita),
    })),
    recipientesQtd: rotulos
      .map(([chave, rotulo]) => ({ recipiente: rotulo, quantidade: num(q[chave]) }))
      .filter((r) => r.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade),
    recipientesReceita: recReceita.rows
      .map((r) => ({
        recipiente: String(r.recipiente),
        receita: num(r.receita),
        itens: num(r.itens),
      }))
      .filter((r) => r.receita > 0),
    municipios: mun,
    ufs: [...porUf.values()].sort((a, b) => b.receita - a.receita),
    anos,
    ano: alvo,
    pctMapeada: receitaTotal > 0 ? (receitaMapeada / receitaTotal) * 100 : 100,
  }
}

export interface Cliente {
  nome: string
  documento: string | null
  notas: number
  receita: number
  primeira_compra: string | null
  ultima_compra: string | null
  dias_sem_comprar: number | null
}
export interface ClientesData {
  clientes: Cliente[]
  anos: number[]
  ano: number | null
  receitaTotal: number
}

/** Ranking de clientes na janela do BI. `ano` null = todos. */
export async function getClientes(ano?: number): Promise<ClientesData> {
  await requireRole('admin', 'chefia')

  const anosRes = await pool.query(
    `SELECT DISTINCT ano FROM financeiro.vw_bi_clientes ORDER BY ano DESC`,
  )
  const anos = anosRes.rows.map((r) => num(r.ano))
  const alvo = ano && anos.includes(ano) ? ano : null

  const { rows } = await pool.query(
    `SELECT nome, documento,
            SUM(notas)::int AS notas, SUM(receita) AS receita,
            MIN(primeira_compra) AS primeira_compra,
            MAX(ultima_compra) AS ultima_compra
       FROM financeiro.vw_bi_clientes
      WHERE TRUE ${alvo ? 'AND ano = $1' : ''}
      GROUP BY 1, 2
      ORDER BY 4 DESC`,
    alvo ? [alvo] : [],
  )

  const hoje = Date.now()
  const clientes: Cliente[] = rows.map((r) => {
    const ultima = r.ultima_compra
      ? String(r.ultima_compra instanceof Date
          ? r.ultima_compra.toISOString().slice(0, 10)
          : r.ultima_compra)
      : null
    return {
      nome: String(r.nome ?? '(sem nome)'),
      documento: (r.documento as string) ?? null,
      notas: num(r.notas),
      receita: num(r.receita),
      primeira_compra: r.primeira_compra
        ? String(r.primeira_compra instanceof Date
            ? r.primeira_compra.toISOString().slice(0, 10)
            : r.primeira_compra)
        : null,
      ultima_compra: ultima,
      dias_sem_comprar: ultima
        ? Math.floor((hoje - new Date(`${ultima}T00:00:00`).getTime()) / 86_400_000)
        : null,
    }
  })

  return {
    clientes,
    anos,
    ano: alvo,
    receitaTotal: clientes.reduce((s, c) => s + c.receita, 0),
  }
}

/**
 * Cobertura sozinha — usada pelo alerta da home e pela faixa do layout.
 * Gated como todo o resto: exportacao de arquivo 'use server' e um endpoint
 * publico, entao a checagem de papel nao pode ficar so na pagina que chama.
 */
export async function getCobertura(): Promise<Cobertura[]> {
  await requireRole('admin', 'chefia')
  const { rows } = await pool.query(
    `SELECT * FROM financeiro.vw_bi_cobertura ORDER BY ano`,
  )
  return rows.map(mapCobertura)
}
