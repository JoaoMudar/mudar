'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/action-errors'

/**
 * Configuracao do rateio negocio x pessoal.
 *
 * As categorias `misto` (combustivel, energia, agua, impostos… 15 das 27) sao
 * compartilhadas entre o viveiro e a casa. O percentual daqui decide quanto de
 * cada lancamento dessas categorias entra no DRE do negocio.
 *
 * ATENCAO: mudar um percentual e RETROATIVO — reescreve o custo de todos os anos
 * do painel, porque as views calculam na leitura. Por isso a tela mostra a previa
 * antes de salvar e o acesso e so admin.
 *
 * Categorias `negocio` e `pessoal` nao aparecem aqui: sao resolvidas direto pela
 * natureza da categoria (ramos 1 e 2 de resolverRateio) e nao consultam esta
 * tabela.
 */

export interface CelulaRateio {
  categoria_id: number
  categoria: string
  grupo: string | null
  /** null = linha-padrao da categoria, usada quando o centro nao tem regra. */
  centro_custo: string | null
  pct_negocio: number
}

export interface ConfigRateio {
  categorias: { id: number; nome: string; grupo: string | null }[]
  centros: { nome: string; natureza: string }[]
  celulas: CelulaRateio[]
  /** Despesa de negocio do ano de referencia com a config atual. */
  anoReferencia: number
  despesaAtual: number
}

const ANO_REFERENCIA = 2025

export async function getConfigRateio(): Promise<ConfigRateio> {
  await requireRole('admin', 'chefia')

  const [cats, centros, celulas, despesa] = await Promise.all([
    pool.query(
      `SELECT id, nome, grupo FROM financeiro.categorias_despesa
        WHERE natureza = 'misto' ORDER BY grupo, nome`,
    ),
    pool.query(`SELECT nome, natureza FROM financeiro.centros_custo ORDER BY id`),
    pool.query(
      `SELECT r.categoria_id, c.nome AS categoria, c.grupo, r.centro_custo, r.pct_negocio
         FROM financeiro.rateio_categoria r
         JOIN financeiro.categorias_despesa c ON c.id = r.categoria_id
        WHERE c.natureza = 'misto'`,
    ),
    pool.query(
      `SELECT despesa_negocio FROM financeiro.vw_bi_dre_anual WHERE ano = $1`,
      [ANO_REFERENCIA],
    ),
  ])

  return {
    categorias: cats.rows.map((r) => ({
      id: Number(r.id), nome: String(r.nome), grupo: (r.grupo as string) ?? null,
    })),
    centros: centros.rows.map((r) => ({
      nome: String(r.nome), natureza: String(r.natureza),
    })),
    celulas: celulas.rows.map((r) => ({
      categoria_id: Number(r.categoria_id),
      categoria: String(r.categoria),
      grupo: (r.grupo as string) ?? null,
      centro_custo: (r.centro_custo as string) ?? null,
      pct_negocio: Number(r.pct_negocio),
    })),
    anoReferencia: ANO_REFERENCIA,
    despesaAtual: Number(despesa.rows[0]?.despesa_negocio ?? 0),
  }
}

export interface AlteracaoRateio {
  categoria_id: number
  /** null = linha-padrao da categoria. */
  centro_custo: string | null
  pct_negocio: number
}

function validar(alteracoes: AlteracaoRateio[]): string | null {
  if (!Array.isArray(alteracoes) || alteracoes.length === 0) {
    return 'Nada para salvar.'
  }
  for (const a of alteracoes) {
    if (!Number.isInteger(a.categoria_id) || a.categoria_id <= 0) {
      return 'Categoria inválida.'
    }
    if (!Number.isInteger(a.pct_negocio) || a.pct_negocio < 0 || a.pct_negocio > 100) {
      return 'O percentual precisa ser um número inteiro entre 0 e 100.'
    }
  }
  return null
}

/**
 * Simula o efeito das alteracoes sem gravar nada.
 *
 * Roda a mesma logica da view dentro de uma transacao que sofre ROLLBACK: e a
 * unica forma de a previa ser exatamente o numero que vai aparecer depois, em
 * vez de uma reimplementacao paralela da regra que pode divergir com o tempo.
 */
export async function simularRateio(
  alteracoes: AlteracaoRateio[],
): Promise<{ despesa?: number; erro?: string }> {
  await requireRole('admin', 'chefia')

  const invalido = validar(alteracoes)
  if (invalido) return { erro: invalido }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const a of alteracoes) {
      await client.query(
        `UPDATE financeiro.rateio_categoria
            SET pct_negocio = $3
          WHERE categoria_id = $1
            AND COALESCE(centro_custo, '') = COALESCE($2, '')`,
        [a.categoria_id, a.centro_custo, a.pct_negocio],
      )
    }
    const { rows } = await client.query(
      `SELECT despesa_negocio FROM financeiro.vw_bi_dre_anual WHERE ano = $1`,
      [ANO_REFERENCIA],
    )
    // Nunca comita: isto e so previa.
    await client.query('ROLLBACK')
    return { despesa: Number(rows[0]?.despesa_negocio ?? 0) }
  } catch (e) {
    try { await client.query('ROLLBACK') } catch { /* conexao ja caiu */ }
    return { erro: safeErrorMessage(e) }
  } finally {
    client.release()
  }
}

export async function salvarRateio(
  alteracoes: AlteracaoRateio[],
): Promise<{ ok?: true; alterados?: number; erro?: string }> {
  // So admin: e uma mudanca retroativa em todo o historico.
  const user = await requireRole('admin')

  const invalido = validar(alteracoes)
  if (invalido) return { erro: invalido }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let alterados = 0
    for (const a of alteracoes) {
      const { rowCount } = await client.query(
        `UPDATE financeiro.rateio_categoria
            SET pct_negocio = $3, atualizado_em = NOW(), atualizado_por = $4
          WHERE categoria_id = $1
            AND COALESCE(centro_custo, '') = COALESCE($2, '')`,
        [a.categoria_id, a.centro_custo, a.pct_negocio, user.username],
      )
      alterados += rowCount ?? 0
    }
    await client.query('COMMIT')

    // Toda tela de custo depende disso.
    revalidatePath('/financeiro')
    revalidatePath('/financeiro/custos')
    revalidatePath('/financeiro/mensal')
    revalidatePath('/financeiro/config/rateio')
    return { ok: true, alterados }
  } catch (e) {
    try { await client.query('ROLLBACK') } catch { /* conexao ja caiu */ }
    return { erro: safeErrorMessage(e) }
  } finally {
    client.release()
  }
}
