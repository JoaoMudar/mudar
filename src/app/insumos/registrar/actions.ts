'use server'

import pool from '@/lib/db'
import { requirePermission } from '@/lib/authz'

export interface UsagePayload {
  /**
   * UUID gerado pelo aparelho antes da primeira tentativa de envio e mantido
   * em todos os reenvios da fila offline. E o que torna o reenvio seguro:
   * sem ele, "gravou mas a resposta se perdeu" viraria uma segunda linha.
   */
  client_id: string
  input_id: string
  species_id: string
  container_id: string
  quantity: number
  usage_date: string
}

export async function registrarUso(payload: UsagePayload): Promise<void> {
  await requirePermission('consumo_insumo:criar')
  await pool.query(
    `INSERT INTO input_usages (client_id, input_id, species_id, container_id, quantity, usage_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (client_id) DO NOTHING`,
    [
      payload.client_id,
      payload.input_id,
      payload.species_id,
      payload.container_id,
      payload.quantity,
      payload.usage_date,
    ],
  )
}
