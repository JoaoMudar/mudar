import { Pool as PgPool } from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:123@localhost:5432/viveiro'

const isNeon = DATABASE_URL.includes('neon.tech')
const pool = isNeon
  ? new NeonPool({ connectionString: DATABASE_URL })
  : new PgPool({ connectionString: DATABASE_URL })

const migrationsDir = path.join(process.cwd(), 'migrations')

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS _migrations (
  id         SERIAL PRIMARY KEY,
  filename   TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`

const args = process.argv.slice(2)
const markApplied = args.includes('--mark-applied')
const statusOnly = args.includes('--status')

async function getAppliedMigrations(client: { query: (sql: string) => Promise<{ rows: { filename: string }[] }> }): Promise<Set<string>> {
  const result = await client.query('SELECT filename FROM _migrations ORDER BY filename')
  return new Set(result.rows.map((r: { filename: string }) => r.filename))
}

async function run() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const client = await pool.connect()

  try {
    // Garantir que a tabela de tracking existe
    await client.query(BOOTSTRAP_SQL)

    const applied = await getAppliedMigrations(client)
    const pending = files.filter(f => !applied.has(f))

    // --status: apenas mostrar estado e sair
    if (statusOnly) {
      console.log(`Migrações (${files.length} total, ${pending.length} pendentes):\n`)
      for (const file of files) {
        const status = applied.has(file) ? '✓' : '○'
        console.log(`  ${status} ${file}`)
      }
      return
    }

    if (pending.length === 0) {
      console.log('Nenhuma migração pendente.')
      return
    }

    console.log(`${pending.length} migração(ões) pendente(s):\n`)

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf-8')

      if (markApplied) {
        // Apenas registrar como aplicada, sem executar o SQL
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [file]
        )
        console.log(`  ⊘ ${file} (marcada como aplicada)`)
      } else {
        // Executar em transação: SQL + registro
        await client.query('BEGIN')
        try {
          await client.query(sql)
          await client.query(
            'INSERT INTO _migrations (filename) VALUES ($1)',
            [file]
          )
          await client.query('COMMIT')
          console.log(`  ✓ ${file}`)
        } catch (err) {
          await client.query('ROLLBACK')
          console.error(`\n  ✗ ${file} — erro:`, err)
          process.exit(1)
        }
      }
    }

    console.log('\nConcluído.')
  } finally {
    client.release()
    await pool.end()
  }
}

run()
