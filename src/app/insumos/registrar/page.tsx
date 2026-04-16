import pool from '@/lib/db'
import RegistrarForm from './RegistrarForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Registrar Insumo — Viveiro Mudar' }

export default async function RegistrarPage() {
  let inputs: { id: string; label: string }[] = []
  let species: { id: string; label: string }[] = []
  let containers: { id: string; label: string }[] = []

  try {
    const [{ rows: inputsData }, { rows: speciesData }, { rows: containersData }] =
      await Promise.all([
        pool.query(
          `SELECT id, name, unit_of_measure FROM inputs WHERE active = true ORDER BY name`
        ),
        pool.query(
          `SELECT id, common_name FROM species WHERE active = true ORDER BY common_name`
        ),
        pool.query(
          `SELECT id, name FROM containers WHERE active = true ORDER BY name`
        ),
      ])

    inputs = inputsData.map((r: { id: string; name: string; unit_of_measure: string }) => ({
      id: r.id,
      label: `${r.name} (${r.unit_of_measure})`,
    }))
    species = speciesData.map((r: { id: string; common_name: string }) => ({
      id: r.id,
      label: r.common_name,
    }))
    containers = containersData.map((r: { id: string; name: string }) => ({
      id: r.id,
      label: r.name,
    }))
  } catch {
    // Banco indisponível durante o build — a página será renderizada fresh em runtime (force-dynamic)
  }

  return <RegistrarForm inputs={inputs} species={species} containers={containers} />
}
