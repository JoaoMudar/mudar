/**
 * Exercita o SQL de `src/lib/parties.ts` contra um Postgres LOCAL de verdade.
 *
 * Por que isto existe: os testes da suite sao todos unitarios com `vi.mock`
 * sobre `@/lib/db` (item 2 de docs/divida-tecnica.md), entao nenhum deles prova
 * que este SQL sequer roda no Postgres. Este script pegou um defeito que os
 * mocks nao pegavam — `mergeParties` violava `idx_parties_document` ao copiar o
 * documento enquanto a identidade duplicada ainda o segurava.
 *
 * TUDO roda numa transacao que termina em ROLLBACK, sempre. Nada e gravado, e a
 * guarda de host aborta se a DATABASE_URL nao for local.
 *
 *   npm run db:verifica-cadastro
 */
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import { findPartyMatch, mergeParties, upsertParty } from '../src/lib/parties'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    if (!process.env[trimmed.slice(0, idx)]) {
      process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
    }
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:123@localhost:5432/viveiro'

// Mesma guarda de scripts/seed-supplier-network.ts: nunca contra producao.
function assertLocalDatabase(connectionString: string) {
  const url = new URL(connectionString)
  const localHosts = new Set(['127.0.0.1', 'localhost'])
  if (connectionString.includes('neon.tech') || !localHosts.has(url.hostname)) {
    throw new Error(
      `Verificacao abortada: DATABASE_URL precisa apontar para banco local, recebido host=${url.hostname}`,
    )
  }
}
assertLocalDatabase(DATABASE_URL)

let falhas = 0
function ok(cond: unknown, msg: string) {
  if (cond) {
    console.log(`  ok  ${msg}`)
  } else {
    falhas++
    console.error(`  FALHOU  ${msg}`)
  }
}

async function main() {
  const c = new Client({ connectionString: DATABASE_URL })
  await c.connect()
  await c.query('BEGIN')
  try {
    // Cenario: Marcio ja e fornecedor e agora vai virar cliente tambem.
    const { rows: f } = await c.query(
      `INSERT INTO cadastro.parties (name, whatsapp)
       VALUES ('Márcio Kuhar VERIFICA', '47999990000') RETURNING id`,
    )
    const partyFornecedor = f[0].id as string
    await c.query(
      `INSERT INTO cadastro.party_roles (party_id, role) VALUES ($1, 'fornecedor')`,
      [partyFornecedor],
    )
    await c.query(
      `INSERT INTO cadastro.addresses (party_id, city, state, is_primary)
       VALUES ($1, 'Ibirama', 'SC', true)`,
      [partyFornecedor],
    )

    console.log('\nfindPartyMatch')
    const porNome = await findPartyMatch(c, { name: '  márcio KUHAR verifica ', role: 'cliente' })
    ok(porNome?.id === partyFornecedor, 'acha por nome normalizado, ignorando caixa e espaços')
    ok(porNome?.matchedBy === 'name', 'marca a origem do casamento como nome')
    ok(porNome?.roles?.includes('fornecedor'), 'traz os papéis agregados')
    ok(
      (await findPartyMatch(c, { name: 'Márcio Kuhar VERIFICA', role: 'fornecedor' })) === null,
      'não devolve quem já tem o papel pedido',
    )
    ok(
      (await findPartyMatch(c, {
        name: 'Márcio Kuhar VERIFICA',
        role: 'cliente',
        excludePartyId: partyFornecedor,
      })) === null,
      'excludePartyId ignora a própria identidade',
    )

    console.log('\nupsertParty — undefined preserva, null apaga')
    await upsertParty(c, { id: partyFornecedor, name: 'Márcio Kuhar VERIFICA', email: 'm@x.com' })
    let r = await c.query(`SELECT email, whatsapp FROM cadastro.parties WHERE id = $1`, [partyFornecedor])
    ok(r.rows[0].email === 'm@x.com', 'grava campo informado')
    ok(r.rows[0].whatsapp === '47999990000', 'campo ausente do payload é preservado')

    await upsertParty(c, { id: partyFornecedor, name: 'Márcio Kuhar VERIFICA', email: null })
    r = await c.query(`SELECT email, whatsapp FROM cadastro.parties WHERE id = $1`, [partyFornecedor])
    ok(r.rows[0].email === null, 'campo explicitamente null é apagado (impossível com o COALESCE antigo)')
    ok(r.rows[0].whatsapp === '47999990000', 'e o ausente continua preservado')

    console.log('\nmergeParties')
    const { rows: d } = await c.query(
      `INSERT INTO cadastro.parties (name, document)
       VALUES ('Márcio Kuhar VERIFICA', '11144477735') RETURNING id`,
    )
    const partyCliente = d[0].id as string
    await c.query(`INSERT INTO cadastro.party_roles (party_id, role) VALUES ($1, 'cliente')`, [partyCliente])
    await c.query(
      `INSERT INTO cadastro.addresses (party_id, city, street, is_primary)
       VALUES ($1, 'Ibirama', 'Rua A', true)`,
      [partyCliente],
    )
    const { rows: cli } = await c.query(
      `INSERT INTO customers (name, party_id) VALUES ('Márcio Kuhar VERIFICA', $1) RETURNING id`,
      [partyCliente],
    )

    await mergeParties(c, partyCliente, partyFornecedor)

    const papeis = await c.query(
      `SELECT role FROM cadastro.party_roles WHERE party_id = $1 ORDER BY role`,
      [partyFornecedor],
    )
    ok(
      papeis.rows.map((x) => x.role).join(',') === 'cliente,fornecedor',
      'a identidade sobrevivente acumula cliente E fornecedor',
    )
    const doc = await c.query(`SELECT document FROM cadastro.parties WHERE id = $1`, [partyFornecedor])
    ok(doc.rows[0].document === '11144477735', 'documento que só o duplicado tinha foi herdado')
    const enderecos = await c.query(
      `SELECT count(*)::int AS n FROM cadastro.addresses WHERE party_id = $1 AND is_primary`,
      [partyFornecedor],
    )
    ok(enderecos.rows[0].n === 1, 'não violou o índice de um endereço primário por pessoa')
    const apontador = await c.query(`SELECT party_id FROM customers WHERE id = $1`, [cli[0].id])
    ok(apontador.rows[0].party_id === partyFornecedor, 'customers.party_id foi repointado')
    const sumiu = await c.query(`SELECT count(*)::int AS n FROM cadastro.parties WHERE id = $1`, [partyCliente])
    ok(sumiu.rows[0].n === 0, 'a identidade redundante foi apagada, sem prender o documento no índice')

    // Diagnostico do passivo: nomes repetidos aqui sao a mesma pessoa em duas
    // identidades, e a fusao e manual (abrir o cadastro e salvar).
    const { rows: candidatos } = await c.query(
      `SELECT LOWER(TRIM(p.name)) AS nome, count(*)::int AS n
         FROM cadastro.parties p
        GROUP BY 1 HAVING count(*) > 1
        ORDER BY 2 DESC, 1`,
    )
    console.log(
      candidatos.length === 0
        ? '\nNenhum candidato a duplicata no banco local.'
        : `\nCandidatos a duplicata (fusão manual): ${candidatos.map((x) => `${x.nome} (${x.n})`).join(', ')}`,
    )
  } finally {
    await c.query('ROLLBACK')
    await c.end()
    console.log('\nROLLBACK executado — o banco não foi alterado.')
  }

  if (falhas > 0) {
    console.error(`\n${falhas} verificação(ões) falharam.`)
    process.exit(1)
  }
  console.log('Todas as verificações passaram.')
}

main().catch((e) => {
  console.error('\n' + String(e?.stack ?? e))
  process.exit(1)
})
