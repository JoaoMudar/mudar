import { Pool as PgPool } from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'
import { scrypt, randomBytes } from 'crypto'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const scryptAsync = promisify(scrypt)

// Carrega .env.local se existir
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    const val = trimmed.slice(idx + 1)
    if (!process.env[key]) process.env[key] = val
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:123@localhost:5432/viveiro'

const isNeon = DATABASE_URL.includes('neon.tech')
const pool = isNeon
  ? new NeonPool({ connectionString: DATABASE_URL })
  : new PgPool({ connectionString: DATABASE_URL })

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

async function run() {
  // Senha padrao — trocar no primeiro acesso
  const defaultPassword = process.env.ADMIN_PASSWORD ?? 'mudar123'

  const passwordHash = await hashPassword(defaultPassword)

  const client = await pool.connect()
  try {
    // Cria usuario admin (Joao) se nao existir
    const { rowCount } = await client.query(
      `INSERT INTO users (username, display_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      ['joao', 'João', passwordHash, 'admin'],
    )

    if (rowCount && rowCount > 0) {
      console.log('  ✓ Usuário admin "joao" criado com sucesso.')
      console.log(`    Senha: ${defaultPassword}`)
      console.log('    Troque a senha no primeiro acesso via /admin/usuarios')
    } else {
      console.log('  ⊘ Usuário "joao" já existe. Nenhuma alteração feita.')
    }
  } finally {
    client.release()
    await pool.end()
  }
}

run()
