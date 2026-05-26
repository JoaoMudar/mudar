import { Pool } from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'

// A escolha do driver é feita pelo HOST da DATABASE_URL, não pelo NODE_ENV:
// - Banco no Neon (host *.neon.tech, ex.: Vercel) → driver @neondatabase/serverless,
//   que evita esgotar conexões em ambiente serverless.
// - Qualquer outro host (ex.: Postgres local no dev) → driver pg com pool TCP normal.
// Assim, rodar `npm run dev` apontando o .env.local para o Postgres local usa o pg,
// e a produção na Vercel (DATABASE_URL do Neon) usa o driver serverless — sem depender
// do NODE_ENV. Mesmo critério usado em scripts/migrate.ts.
// A inicialização lazy garante que o módulo não estoure durante o build
// mesmo quando DATABASE_URL ainda não está configurada no ambiente.
let _pool: Pool | NeonPool | null = null

function getPool(): Pool | NeonPool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL
    const isNeon = connectionString?.includes('neon.tech') ?? false
    _pool = isNeon
      ? new NeonPool({ connectionString })
      : new Pool({ connectionString })
  }
  return _pool
}

// Proxy que delega todas as chamadas ao pool real, criado somente na primeira query.
const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const p = getPool()
    const val = (p as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? val.bind(p) : val
  },
})

export default pool
