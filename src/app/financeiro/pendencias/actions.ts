'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/action-errors'
import { normalizeText } from '@/lib/text'

/**
 * Fila de categorizacao dos lancamentos sem categoria.
 *
 * O DESENHO SAI DE DOIS FATOS MEDIDOS
 * 1. Sugerir por descricao exata e inutil: das 7.273 pendencias historicas,
 *    ZERO repetem uma descricao ja categorizada — a categorizacao anterior
 *    consumiu todo match exato. Por isso as sugestoes vem de regras aprendidas
 *    e do habito do centro de custo, nao de igualdade de texto.
 * 2. Zerar a fila nao e o objetivo. Em 2020+ sao 2.160 linhas / R$184k, mas a
 *    fatia >= R$100 (497 linhas) ja cobre 65% do valor. A tela abre nessa fatia.
 *
 * `unaccent` NAO esta instalado neste banco, entao a normalizacao de acento
 * acontece em JS (src/lib/text.ts) antes de o padrao chegar ao SQL.
 */

export interface Pendencia {
  id: number
  descricao: string
  valor: number
  data_ref: string
  centro_custo: string | null
}

export interface Sugestao {
  categoria_id: number
  nome: string
  grupo: string | null
  /** De onde veio: regra criada pelo usuario ou habito do centro de custo. */
  origem: 'regra' | 'centro'
}

export interface FilaPendencias {
  atual: Pendencia | null
  sugestoes: Sugestao[]
  restantes: number
  valorRestante: number
  /** Total geral, sem o filtro de valor — para mostrar o tamanho real da cauda. */
  totalGeral: number
  valorTotalGeral: number
}

/** Piso de valor da triagem. 100 e o padrao por cobrir 65% do valor. */
function pisoValido(v: number | undefined): number {
  return v != null && Number.isFinite(v) && v >= 0 ? v : 100
}

export async function getFila(piso?: number): Promise<FilaPendencias> {
  await requireRole('admin', 'chefia')
  const min = pisoValido(piso)

  const [fila, resumo, geral] = await Promise.all([
    // Maior valor primeiro: e triagem por impacto, nao ordem cronologica.
    pool.query(
      `SELECT id, descricao, valor, data_ref, centro_custo
         FROM financeiro.vw_bi_pendencias
        WHERE valor >= $1
        ORDER BY valor DESC LIMIT 1`,
      [min],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(valor), 0) AS v
         FROM financeiro.vw_bi_pendencias WHERE valor >= $1`,
      [min],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(valor), 0) AS v
         FROM financeiro.vw_bi_pendencias`,
    ),
  ])

  const linha = fila.rows[0]
  const atual: Pendencia | null = linha
    ? {
        id: Number(linha.id),
        descricao: String(linha.descricao ?? ''),
        valor: Number(linha.valor),
        data_ref: linha.data_ref
          ? String(linha.data_ref instanceof Date
              ? linha.data_ref.toISOString().slice(0, 10)
              : linha.data_ref)
          : '',
        centro_custo: (linha.centro_custo as string) ?? null,
      }
    : null

  return {
    atual,
    sugestoes: atual ? await sugerir(atual.descricao, atual.centro_custo) : [],
    restantes: Number(resumo.rows[0]?.n ?? 0),
    valorRestante: Number(resumo.rows[0]?.v ?? 0),
    totalGeral: Number(geral.rows[0]?.n ?? 0),
    valorTotalGeral: Number(geral.rows[0]?.v ?? 0),
  }
}

/** Sugestoes para um lancamento. Regras aprendidas primeiro, habito depois. */
async function sugerir(descricao: string, centro: string | null): Promise<Sugestao[]> {
  const normalizada = normalizeText(descricao)

  const [regras, habito] = await Promise.all([
    // Regra bate quando o padrao aparece na descricao normalizada. O padrao ja
    // vem sem acento de normalizeText; o lado do banco passa por bi_normaliza.
    pool.query(
      `SELECT r.categoria_id, c.nome, c.grupo
         FROM financeiro.regras_categoria r
         JOIN financeiro.categorias_despesa c ON c.id = r.categoria_id
        WHERE position(financeiro.bi_normaliza(r.padrao) IN $1) > 0
        ORDER BY length(r.padrao) DESC LIMIT 3`,
      [normalizada],
    ),
    centro
      ? pool.query(
          `SELECT d.categoria_id, c.nome, c.grupo, COUNT(*)::int AS n
             FROM financeiro.despesas d
             JOIN financeiro.categorias_despesa c ON c.id = d.categoria_id
            WHERE d.centro_custo = $1 AND d.eh_totalizador = FALSE
              AND d.excluido_em IS NULL AND d.ano >= 2020
            GROUP BY 1, 2, 3 ORDER BY n DESC LIMIT 5`,
          [centro],
        )
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ])

  const vistos = new Set<number>()
  const saida: Sugestao[] = []

  for (const r of regras.rows) {
    const id = Number(r.categoria_id)
    if (vistos.has(id)) continue
    vistos.add(id)
    saida.push({ categoria_id: id, nome: String(r.nome), grupo: (r.grupo as string) ?? null, origem: 'regra' })
  }
  for (const r of habito.rows) {
    const id = Number(r.categoria_id)
    if (vistos.has(id)) continue
    vistos.add(id)
    saida.push({ categoria_id: id, nome: String(r.nome), grupo: (r.grupo as string) ?? null, origem: 'centro' })
  }

  return saida.slice(0, 6)
}

export interface ResultadoCategorizacao {
  ok?: true
  erro?: string
  /** Quantos outros lancamentos a regra recem-criada tambem resolveu. */
  aplicadosEmLote?: number
}

/**
 * Classifica um lancamento e, opcionalmente, aprende a regra.
 *
 * A regra e o que faz a cauda fechar: sem ela cada uma das 2.160 linhas seria
 * uma decisao isolada.
 */
export async function categorizar(
  id: number,
  categoriaId: number,
  criarRegra = false,
): Promise<ResultadoCategorizacao> {
  const user = await requireRole('admin', 'chefia')

  // Os dois precisam do `> 0`: `Number.isInteger(0)` e true, entao checar so o
  // tipo deixaria id=0 chegar ao banco.
  if (!Number.isInteger(id) || id <= 0 ||
      !Number.isInteger(categoriaId) || categoriaId <= 0) {
    return { erro: 'Lançamento ou categoria inválidos.' }
  }

  try {
    const { rows } = await pool.query(
      `UPDATE financeiro.despesas
          SET categoria_id = $2, atualizado_em = NOW(), atualizado_por = $3
        WHERE id = $1 AND excluido_em IS NULL
        RETURNING descricao`,
      [id, categoriaId, user.username],
    )
    if (rows.length === 0) return { erro: 'Lançamento não encontrado.' }

    let aplicadosEmLote = 0
    if (criarRegra) {
      const padrao = normalizeText(String(rows[0].descricao ?? '')).trim()
      // Padrao curto demais pegaria meio banco por engano.
      if (padrao.length >= 4) {
        await pool.query(
          `INSERT INTO financeiro.regras_categoria (padrao, categoria_id, criado_por)
           VALUES ($1, $2, $3)
           ON CONFLICT (padrao) DO UPDATE SET categoria_id = EXCLUDED.categoria_id`,
          [padrao, categoriaId, user.username],
        )

        // bi_normaliza dos DOIS lados: sem isso "Combustível" no banco nunca
        // casaria com o padrao "combustivel" gravado sem acento.
        const lote = await pool.query(
          `UPDATE financeiro.despesas d
              SET categoria_id = $2, atualizado_em = NOW(), atualizado_por = $3
            WHERE d.categoria_id IS NULL
              AND d.eh_totalizador = FALSE
              AND d.excluido_em IS NULL
              AND d.ano >= 2020
              AND financeiro.bi_normaliza(d.descricao) LIKE '%' || $1 || '%'`,
          [padrao, categoriaId, user.username],
        )
        aplicadosEmLote = lote.rowCount ?? 0
      }
    }

    revalidatePath('/financeiro/pendencias')
    revalidatePath('/financeiro/custos')
    return { ok: true, aplicadosEmLote }
  } catch (e) {
    return { erro: safeErrorMessage(e) }
  }
}

/** Todas as categorias, para o caso de nenhuma sugestao servir. */
export async function getCategorias(): Promise<{ id: number; nome: string; grupo: string | null }[]> {
  await requireRole('admin', 'chefia')
  const { rows } = await pool.query(
    `SELECT id, nome, grupo FROM financeiro.categorias_despesa ORDER BY grupo, nome`,
  )
  return rows.map((r) => ({
    id: Number(r.id), nome: String(r.nome), grupo: (r.grupo as string) ?? null,
  }))
}
