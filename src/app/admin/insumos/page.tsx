import pool from '@/lib/db'
import InsumosManager from './InsumosManager'

export const dynamic = 'force-dynamic'

export default async function InsumosPage() {
  const { rows: inputs } = await pool.query(
    `SELECT * FROM inputs ORDER BY name`
  )
  return <InsumosManager initialInputs={inputs} />
}
