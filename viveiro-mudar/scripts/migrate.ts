import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:123@localhost:5432/viveiro'

const pool = new Pool({ connectionString: DATABASE_URL })

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

async function run() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`Encontradas ${files.length} migrations:\n`)

  const client = await pool.connect()
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf-8')
      console.log(`→ ${file}`)
      await client.query(sql)
      console.log(`  ✓ OK\n`)
    }
    console.log('Todas as migrations aplicadas com sucesso.')
  } catch (err) {
    console.error('\nErro ao aplicar migration:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
