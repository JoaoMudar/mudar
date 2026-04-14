'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'

const PATH = '/admin/custos-fixos'

export type FixedCostCategory =
  | 'salarios' | 'energia' | 'agua' | 'manutencao' | 'combustivel' | 'depreciacao' | 'outros'

export interface FixedCostPayload {
  category: FixedCostCategory
  monthly_amount: number
  reference_month: string   // 'YYYY-MM'
  notes: string
}

export async function createCustoFixo(data: FixedCostPayload): Promise<{ error?: string }> {
  try {
    await pool.query(
      `INSERT INTO fixed_costs (category, monthly_amount, reference_month, notes)
       VALUES ($1, $2, $3, $4)`,
      [data.category, data.monthly_amount, data.reference_month + '-01', data.notes]
    )
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}

export async function deleteCustoFixo(id: string): Promise<{ error?: string }> {
  try {
    await pool.query(`DELETE FROM fixed_costs WHERE id=$1`, [id])
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}
