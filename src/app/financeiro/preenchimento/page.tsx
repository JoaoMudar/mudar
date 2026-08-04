import { requireRole } from '@/lib/auth'
import { getPreenchimento, type PreenchimentoData } from '../queries'
import PreenchimentoView from './PreenchimentoView'

export const dynamic = 'force-dynamic'

/** Grade ano x mes do que falta lancar (P12 Fase 2). */
export default async function PreenchimentoPage() {
  await requireRole('admin', 'chefia')

  let data: PreenchimentoData = { meses: [], cobertura: [] }
  try {
    data = await getPreenchimento()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <PreenchimentoView data={data} />
}
