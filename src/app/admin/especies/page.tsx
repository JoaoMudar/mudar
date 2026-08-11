import pool from '@/lib/db'
import { requirePermission } from '@/lib/authz'
import EspeciesManager from './EspeciesManager'

export const dynamic = 'force-dynamic'

export default async function EspeciesPage() {
  await requirePermission('especie:criar')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let species: any[] = []
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
              COALESCE(json_agg(json_build_object('id', pn.id, 'name', pn.name) ORDER BY pn.name)
                FILTER (WHERE pn.id IS NOT NULL), '[]') AS popular_names
       FROM species s
       LEFT JOIN species_popular_names pn ON pn.species_id = s.id
       GROUP BY s.id
       ORDER BY s.common_name`,
    )
    species = rows
  } catch {
    // Banco indisponível durante o build — renderizado fresh em runtime (force-dynamic)
  }
  return <EspeciesManager initialSpecies={species} />
}
