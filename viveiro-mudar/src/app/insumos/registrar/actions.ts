'use server'

import pool from '@/lib/db'

export interface UsagePayload {
  input_id: string
  species_id: string
  container_id: string
  quantity: number
  usage_date: string
}

export async function registrarUso(payload: UsagePayload): Promise<void> {
  await pool.query(
    `INSERT INTO input_usages (input_id, species_id, container_id, quantity, usage_date)
     VALUES ($1, $2, $3, $4, $5)`,
    [payload.input_id, payload.species_id, payload.container_id, payload.quantity, payload.usage_date]
  )
}
