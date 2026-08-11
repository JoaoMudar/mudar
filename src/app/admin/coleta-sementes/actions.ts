'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { safeErrorMessage } from '@/lib/action-errors'
import { authorize } from '@/lib/authz'

const PATH = '/admin/coleta-sementes'

export interface SeedCollectionPayload {
  species_id: string
  collection_region: string
  distance_km: number | null
  fuel_cost: number | null
  labor_hours: number | null
  labor_cost_per_hour: number | null
  total_cost: number
  seeds_collected_qty: number | null
  collection_date: string
}

export async function createColeta(data: SeedCollectionPayload): Promise<{ error?: string }> {
  const auth = await authorize('coleta_semente:criar')
  if (!auth.ok) return { error: auth.error }
  try {
    await pool.query(
      `INSERT INTO seed_collection_costs
         (species_id, collection_region, distance_km, fuel_cost, labor_hours, labor_cost_per_hour, total_cost, seeds_collected_qty, collection_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [data.species_id, data.collection_region, data.distance_km, data.fuel_cost,
       data.labor_hours, data.labor_cost_per_hour, data.total_cost,
       data.seeds_collected_qty, data.collection_date]
    )
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

export async function deleteColeta(id: string): Promise<{ error?: string }> {
  const auth = await authorize('coleta_semente:excluir')
  if (!auth.ok) return { error: auth.error }
  try {
    await pool.query(`DELETE FROM seed_collection_costs WHERE id=$1`, [id])
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}
