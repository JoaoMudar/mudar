'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'

const PATH = '/admin/insumos'

export type InputCategory = 'substrato' | 'adubo' | 'defensivo' | 'recipiente' | 'outros'

export interface InputPayload {
  name: string
  category: InputCategory
  unit_of_measure: string
  cost_per_unit: number | null
  supplier: string
  last_purchase_date: string
  active: boolean
}

export async function createInsumo(data: InputPayload): Promise<{ error?: string }> {
  try {
    await pool.query(
      `INSERT INTO inputs (name, category, unit_of_measure, cost_per_unit, supplier, last_purchase_date, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [data.name, data.category, data.unit_of_measure, data.cost_per_unit,
       data.supplier, data.last_purchase_date, data.active]
    )
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}

export async function updateInsumo(id: string, data: InputPayload): Promise<{ error?: string }> {
  try {
    // Registra histórico de preço se o preço mudou
    const { rows } = await pool.query(
      `SELECT cost_per_unit FROM inputs WHERE id=$1`, [id]
    )
    const current = rows[0]
    if (
      current &&
      data.cost_per_unit !== null &&
      current.cost_per_unit !== null &&
      Number(current.cost_per_unit) !== Number(data.cost_per_unit)
    ) {
      await pool.query(
        `INSERT INTO input_price_history (input_id, cost_per_unit) VALUES ($1, $2)`,
        [id, current.cost_per_unit]
      )
    }

    await pool.query(
      `UPDATE inputs SET name=$1, category=$2, unit_of_measure=$3, cost_per_unit=$4,
       supplier=$5, last_purchase_date=$6, active=$7 WHERE id=$8`,
      [data.name, data.category, data.unit_of_measure, data.cost_per_unit,
       data.supplier, data.last_purchase_date, data.active, id]
    )
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}

export async function toggleInsumoAtivo(id: string, active: boolean): Promise<{ error?: string }> {
  try {
    await pool.query(`UPDATE inputs SET active=$1 WHERE id=$2`, [active, id])
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}

export async function getPriceHistory(inputId: string) {
  const { rows } = await pool.query(
    `SELECT cost_per_unit, changed_at, notes
     FROM input_price_history
     WHERE input_id=$1
     ORDER BY changed_at DESC
     LIMIT 10`,
    [inputId]
  )
  return rows
}
