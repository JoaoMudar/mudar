import pool from '@/lib/db'
import InsumosManager from './InsumosManager'

export const dynamic = 'force-dynamic'

export default async function InsumosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inputs: any[] = []
  try {
    const { rows } = await pool.query(`SELECT * FROM inputs ORDER BY name`)
    inputs = rows
  } catch {
    // Banco indisponível durante o build — renderizado fresh em runtime (force-dynamic)
  }
  return <InsumosManager initialInputs={inputs} />
}
