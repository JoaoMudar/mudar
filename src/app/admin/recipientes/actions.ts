'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { safeErrorMessage } from '@/lib/action-errors'
import { authorize } from '@/lib/authz'

const PATH = '/admin/recipientes'

export interface ContainerPayload {
  name: string
  volume_liters: number | null
  substrate_per_unit_liters: number | null
  unit_cost: number | null
  active: boolean
}

export async function createRecipiente(data: ContainerPayload): Promise<{ error?: string }> {
  const auth = await authorize('recipiente:criar')
  if (!auth.ok) return { error: auth.error }
  try {
    await pool.query(
      `INSERT INTO containers (name, volume_liters, substrate_per_unit_liters, unit_cost, active)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.name, data.volume_liters, data.substrate_per_unit_liters, data.unit_cost, data.active]
    )
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

export async function updateRecipiente(id: string, data: ContainerPayload): Promise<{ error?: string }> {
  const auth = await authorize('recipiente:atualizar')
  if (!auth.ok) return { error: auth.error }
  try {
    await pool.query(
      `UPDATE containers SET name=$1, volume_liters=$2, substrate_per_unit_liters=$3, unit_cost=$4, active=$5
       WHERE id=$6`,
      [data.name, data.volume_liters, data.substrate_per_unit_liters, data.unit_cost, data.active, id]
    )
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

export async function toggleRecipienteAtivo(id: string, active: boolean): Promise<{ error?: string }> {
  const auth = await authorize('recipiente:excluir')
  if (!auth.ok) return { error: auth.error }
  try {
    await pool.query(`UPDATE containers SET active=$1 WHERE id=$2`, [active, id])
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}
