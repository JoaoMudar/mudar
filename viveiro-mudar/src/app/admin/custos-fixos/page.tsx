import pool from '@/lib/db'
import CustosFixosManager from './CustosFixosManager'

export const dynamic = 'force-dynamic'

export default async function CustosFixosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let costs: any[] = []
  try {
    const { rows } = await pool.query(
      `SELECT * FROM fixed_costs ORDER BY reference_month DESC, category LIMIT 60`
    )
    costs = rows
  } catch {
    // Banco indisponível durante o build — renderizado fresh em runtime (force-dynamic)
  }
  return <CustosFixosManager initialCosts={costs} />
}
