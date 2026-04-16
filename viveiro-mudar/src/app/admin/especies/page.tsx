import pool from '@/lib/db'
import EspeciesManager from './EspeciesManager'

export const dynamic = 'force-dynamic'

export default async function EspeciesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let species: any[] = []
  try {
    const { rows } = await pool.query(`SELECT * FROM species ORDER BY common_name`)
    species = rows
  } catch {
    // Banco indisponível durante o build — renderizado fresh em runtime (force-dynamic)
  }
  return <EspeciesManager initialSpecies={species} />
}
