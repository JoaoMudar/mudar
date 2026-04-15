import { Pool } from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'

// Em produção (Vercel/serverless) usa o driver do Neon para evitar esgotamento de conexões.
// Em desenvolvimento continua usando pg com pool local.
const pool =
  process.env.NODE_ENV === 'production'
    ? new NeonPool({ connectionString: process.env.DATABASE_URL })
    : new Pool({ connectionString: process.env.DATABASE_URL })

export default pool
