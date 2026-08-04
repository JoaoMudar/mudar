'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/action-errors'
import { validateDespesa, naturezaDerivada, type DespesaInput } from '@/lib/bi-despesas'
import { resolverRateio, type Natureza, type RegraRateio } from '@/lib/bi-rateio'

/**
 * Lancamento de despesa — a rotina que substitui a planilha DESPESAS AAAA.xls.
 *
 * Toda escrita passa por validateDespesa (src/lib/bi-despesas.ts), que e onde
 * moram as regras. Aqui so ficam o acesso ao banco e a resolucao do rateio.
 */

export interface Opcao { id: number; nome: string; grupo: string | null; natureza: string }
export interface CentroOpcao { nome: string; natureza: string }

export interface OpcoesLancamento {
  categorias: Opcao[]
  centros: CentroOpcao[]
  unidades: { codigo: string; descricao: string | null }[]
  /** Ultimo lancamento do usuario, para o botao "repetir". */
  ultimo: { categoria_id: number; centro_custo: string | null } | null
}

export async function getOpcoesLancamento(): Promise<OpcoesLancamento> {
  const user = await requireRole('admin', 'chefia')

  const [cats, centros, unidades, ultimo] = await Promise.all([
    pool.query(
      `SELECT id, nome, grupo, natureza FROM financeiro.categorias_despesa ORDER BY grupo, nome`,
    ),
    pool.query(`SELECT nome, natureza FROM financeiro.centros_custo ORDER BY id`),
    pool.query(`SELECT codigo, descricao FROM financeiro.unidades ORDER BY codigo`),
    pool.query(
      `SELECT categoria_id, centro_custo FROM financeiro.despesas
        WHERE origem_lancamento = 'app' AND criado_por = $1 AND excluido_em IS NULL
        ORDER BY id DESC LIMIT 1`,
      [user.username],
    ),
  ])

  return {
    categorias: cats.rows.map((r) => ({
      id: Number(r.id), nome: String(r.nome),
      grupo: (r.grupo as string) ?? null, natureza: String(r.natureza),
    })),
    centros: centros.rows.map((r) => ({ nome: String(r.nome), natureza: String(r.natureza) })),
    unidades: unidades.rows.map((r) => ({
      codigo: String(r.codigo), descricao: (r.descricao as string) ?? null,
    })),
    ultimo: ultimo.rows[0]
      ? {
          categoria_id: Number(ultimo.rows[0].categoria_id),
          centro_custo: (ultimo.rows[0].centro_custo as string) ?? null,
        }
      : null,
  }
}

/** Le as regras de rateio de uma categoria, para resolver o pct no servidor. */
async function regrasDaCategoria(categoriaId: number): Promise<RegraRateio[]> {
  const { rows } = await pool.query(
    `SELECT categoria_id, centro_custo, pct_negocio
       FROM financeiro.rateio_categoria WHERE categoria_id = $1`,
    [categoriaId],
  )
  return rows.map((r) => ({
    categoriaId: Number(r.categoria_id),
    centroCusto: (r.centro_custo as string) ?? null,
    pctNegocio: Number(r.pct_negocio),
  }))
}

export interface ResultadoLancamento {
  id?: number
  erro?: string
  /** Devolvido para a tela explicar como o valor foi classificado. */
  pct_negocio?: number | null
}

export async function criarDespesa(input: DespesaInput): Promise<ResultadoLancamento> {
  const user = await requireRole('admin', 'chefia')

  const v = validateDespesa(input)
  if ('erro' in v) return { erro: v.erro }
  const d = v.valor

  try {
    const [cat, centro] = await Promise.all([
      pool.query(
        `SELECT natureza FROM financeiro.categorias_despesa WHERE id = $1`,
        [d.categoria_id],
      ),
      pool.query(
        `SELECT natureza FROM financeiro.centros_custo WHERE nome = $1`,
        [d.centro_custo],
      ),
    ])
    if (cat.rowCount === 0) return { erro: 'Categoria não encontrada.' }
    if (centro.rowCount === 0) return { erro: 'Centro de custo não encontrado.' }

    const { pctNegocio } = resolverRateio(
      {
        categoriaId: d.categoria_id,
        categoriaNatureza: cat.rows[0].natureza as Natureza,
        centroCusto: d.centro_custo,
        centroNatureza: centro.rows[0].natureza as Natureza,
      },
      await regrasDaCategoria(d.categoria_id),
    )

    const { rows } = await pool.query(
      `INSERT INTO financeiro.despesas
         (data, ano, mes, descricao, valor_total, categoria_id, centro_custo,
          quantidade, unidade, valor_mc, mao_obra, equipamento, deslocamento,
          natureza, eh_totalizador, fonte, origem_lancamento, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, FALSE, 'app', 'app', $15)
       RETURNING id`,
      [
        d.data, d.ano, d.mes, d.descricao, d.valor_total, d.categoria_id, d.centro_custo,
        d.quantidade, d.unidade, d.valor_mc, d.mao_obra, d.equipamento, d.deslocamento,
        // natureza segue gravada so para as views legadas nao degradarem; a
        // verdade agora e a categoria + rateio.
        naturezaDerivada(pctNegocio),
        user.username,
      ],
    )

    revalidatePath('/financeiro')
    revalidatePath('/financeiro/despesas')
    revalidatePath('/financeiro/preenchimento')
    return { id: Number(rows[0].id), pct_negocio: pctNegocio }
  } catch (e) {
    return { erro: safeErrorMessage(e) }
  }
}

export interface DespesaLinha {
  id: number
  data: string
  descricao: string
  valor_total: number
  categoria: string | null
  centro_custo: string | null
  origem_lancamento: string
  criado_por: string | null
}

export interface ListaDespesas {
  linhas: DespesaLinha[]
  total: number
  quantidade: number
}

/** Lancamentos de um mes (AAAA-MM). */
export async function getDespesasDoMes(mes: string): Promise<ListaDespesas> {
  await requireRole('admin', 'chefia')

  const m = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!m) return { linhas: [], total: 0, quantidade: 0 }

  const { rows } = await pool.query(
    `SELECT d.id, d.data, d.descricao, d.valor_total, d.centro_custo,
            d.origem_lancamento, d.criado_por, c.nome AS categoria
       FROM financeiro.despesas d
       LEFT JOIN financeiro.categorias_despesa c ON c.id = d.categoria_id
      WHERE d.eh_totalizador = FALSE
        AND d.excluido_em IS NULL
        AND d.ano = $1 AND d.mes = $2
      ORDER BY d.data DESC NULLS LAST, d.id DESC
      LIMIT 500`,
    [Number(m[1]), Number(m[2])],
  )

  const linhas: DespesaLinha[] = rows.map((r) => ({
    id: Number(r.id),
    data: r.data ? String(r.data instanceof Date ? r.data.toISOString().slice(0, 10) : r.data) : '',
    descricao: String(r.descricao ?? ''),
    valor_total: Number(r.valor_total),
    categoria: (r.categoria as string) ?? null,
    centro_custo: (r.centro_custo as string) ?? null,
    origem_lancamento: String(r.origem_lancamento),
    criado_por: (r.criado_por as string) ?? null,
  }))

  return {
    linhas,
    total: linhas.reduce((s, l) => s + l.valor_total, 0),
    quantidade: linhas.length,
  }
}

/**
 * Soft delete. Livro-caixa nao faz DELETE: apagar linha de historico financeiro
 * destroi a auditoria e faz o total do mes mudar sem explicacao.
 */
export async function excluirDespesa(id: number): Promise<{ ok?: true; erro?: string }> {
  const user = await requireRole('admin', 'chefia')
  try {
    const { rowCount } = await pool.query(
      `UPDATE financeiro.despesas
          SET excluido_em = NOW(), excluido_por = $2
        WHERE id = $1 AND excluido_em IS NULL`,
      [id, user.username],
    )
    if (rowCount === 0) return { erro: 'Lançamento não encontrado.' }
    revalidatePath('/financeiro/despesas')
    revalidatePath('/financeiro/preenchimento')
    return { ok: true }
  } catch (e) {
    return { erro: safeErrorMessage(e) }
  }
}
