import { Pool } from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'

// Em produção (Vercel/serverless) usa o driver do Neon para evitar esgotamento de conexões.
// Em desenvolvimento continua usando pg com pool local.
// A inicialização lazy garante que o módulo não estoure durante o build
// mesmo quando DATABASE_URL ainda não está configurada no ambiente.
let _pool: Pool | NeonPool | null = null

function getPool(): Pool | NeonPool {
  if (!_pool) {
    _pool =
      process.env.NODE_ENV === 'production'
        ? new NeonPool({ connectionString: process.env.DATABASE_URL })
        : new Pool({ connectionString: process.env.DATABASE_URL })
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
