// Script para importar mudas na tabela species a partir de um JSON { mudas: [...] }
// Uso: node scripts/import-mudas.mjs [caminho-do-json]
//   - sem argumento: usa data/seeds/mudas_export_corrigido.json
//   - com argumento: usa o caminho informado (relativo ao diretório atual ou absoluto)
// Requer: DATABASE_URL no .env ou ambiente

import pg from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'
import { readFileSync, existsSync } from 'fs'
import { join, dirname, isAbsolute, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Carrega .env.local se existir (node nao carrega automaticamente), mesma logica de migrate.ts
const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    const val = trimmed.slice(idx + 1)
    if (!process.env[key]) process.env[key] = val
  }
}
const argPath = process.argv[2]
const jsonPath = argPath
  ? (isAbsolute(argPath) ? argPath : resolve(process.cwd(), argPath))
  : join(__dirname, '..', 'data', 'seeds', 'mudas_export_corrigido.json')

console.log(`Lendo: ${jsonPath}`)

const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))

// Prioridade de mapeamento: primeiro match ganha
const FINS_TO_CATEGORY = {
  FA:  'frutifera',
  FH:  'frutifera',
  RMC: 'restauracao',
  RAD: 'restauracao',
  NA:  'restauracao',
  IND: 'madeira',
  O:   'ornamental',
  FLOR:'ornamental',
  S:   'pioneira',
  EX:  'ornamental',
}

const CATEGORY_PRIORITY = ['frutifera', 'restauracao', 'madeira', 'pioneira', 'ornamental', 'climax']

const FINS_LABELS = {
  EX:  'Exótica',
  S:   'Sombreamento',
  O:   'Ornamental',
  FLOR:'Floração',
  IND: 'Industrial',
  NA:  'Nativa',
  RMC: 'Restauração Mata Ciliar',
  RAD: 'Restauração Áreas Degradadas',
  FA:  'Frutífera (fauna)',
  FH:  'Frutífera',
}

const FOLHA_LABELS = {
  P:  'Perenifólia',
  SD: 'Semidecídua',
  D:  'Decídua',
}

function pickCategory(fins) {
  if (!fins || fins.length === 0) return 'restauracao'
  const cats = fins.map(f => FINS_TO_CATEGORY[f]).filter(Boolean)
  // Retorna a categoria de maior prioridade
  for (const cat of CATEGORY_PRIORITY) {
    if (cats.includes(cat)) return cat
  }
  return 'restauracao'
}

function buildNotes(muda) {
  const lines = []

  if (muda.finsPlantio?.length) {
    const labels = muda.finsPlantio.map(f => FINS_LABELS[f] || f).join(', ')
    lines.push(`Fins: ${labels}`)
  }
  if (muda.comportamentoFolhar) {
    lines.push(`Folha: ${FOLHA_LABELS[muda.comportamentoFolhar] || muda.comportamentoFolhar}`)
  }
  if (muda.altura) {
    lines.push(`Altura: ${muda.altura}`)
  }
  if (muda.regioesCultivo) {
    lines.push(`Regiões: ${muda.regioesCultivo}`)
  }
  if (muda.floracao) {
    lines.push(`Floração: ${muda.floracao}`)
  }
  if (muda.corFloracao) {
    lines.push(`Cor da flor: ${muda.corFloracao}`)
  }
  if (muda.frutificacao) {
    lines.push(`Frutificação: ${muda.frutificacao}`)
  }

  return lines.join('\n') || null
}

// --- Main ---
const connStr = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/viveiro'
// Driver escolhido pelo host (mesmo criterio de db.ts / migrate.ts): Neon -> serverless, resto -> pg
const isNeon = connStr.includes('neon.tech')
const pool = isNeon
  ? new NeonPool({ connectionString: connStr })
  : new pg.Pool({ connectionString: connStr })
console.log(`Banco: ${isNeon ? 'NEON (producao)' : 'local/pg'}`)

try {
  // Busca espécies já existentes para evitar duplicatas (por nome popular)
  const existing = await pool.query('SELECT common_name FROM species')
  const existingNames = new Set(existing.rows.map(r => r.common_name.toLowerCase()))

  let inserted = 0
  let skipped = 0

  for (const muda of data.mudas) {
    const commonName = muda.nomePopular?.trim()
    if (!commonName) { skipped++; continue }

    if (existingNames.has(commonName.toLowerCase())) {
      console.log(`  Já existe: ${commonName}`)
      skipped++
      continue
    }

    const category = pickCategory(muda.finsPlantio)
    const notes = buildNotes(muda)

    await pool.query(
      `INSERT INTO species (common_name, scientific_name, category, notes, active)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [commonName, muda.nomeCientifico || null, category, notes]
    )
    inserted++
  }

  console.log(`\nImportação concluída!`)
  console.log(`  Inseridas: ${inserted}`)
  console.log(`  Ignoradas (já existiam): ${skipped}`)
  console.log(`  Total no JSON: ${data.mudas.length}`)

} catch (err) {
  console.error('Erro na importação:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
