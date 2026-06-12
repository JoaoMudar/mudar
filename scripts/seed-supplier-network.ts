import { Pool, type PoolClient } from 'pg'
import fs from 'fs'
import path from 'path'

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

function assertLocalDatabase(connectionString: string) {
  const url = new URL(connectionString)
  const localHosts = new Set(['127.0.0.1', 'localhost'])
  if (connectionString.includes('neon.tech') || !localHosts.has(url.hostname)) {
    throw new Error(
      `Seed abortado: DATABASE_URL precisa apontar para banco local, recebido host=${url.hostname}`,
    )
  }
}

assertLocalDatabase(DATABASE_URL)

const pool = new Pool({ connectionString: DATABASE_URL })
const SEED_MARKER = '[seed-cotacao-fornecedores]'

type SupplierStatus = 'lead' | 'active' | 'inactive' | 'do_not_contact'
type Availability = 'in_stock' | 'on_order' | 'unknown'

interface SpeciesRow {
  id: string
  common_name: string
  category: string
}

interface SupplierSeed {
  name: string
  contact_name: string
  whatsapp: string
  phone?: string
  email?: string
  instagram?: string
  city: string
  state: string
  reliability_score: number
  status: SupplierStatus
  active: boolean
  targetCoverage: number
  offset: number
  step: number
  last_contacted_at?: string | null
  notes: string
}

const suppliers: SupplierSeed[] = [
  {
    name: '[TESTE] Viveiro Serra Azul',
    contact_name: 'Mariana Costa',
    whatsapp: '5549991001001',
    phone: '554932201001',
    email: 'serra.azul.teste@example.com',
    instagram: '@viveiroserraazul',
    city: 'Lages',
    state: 'SC',
    reliability_score: 5,
    status: 'active',
    active: true,
    targetCoverage: 28,
    offset: 0,
    step: 7,
    last_contacted_at: null,
    notes: 'Cobertura ampla para restauracao, frutiferas e nativas de altitude.',
  },
  {
    name: '[TESTE] Nativas Vale do Itajai',
    contact_name: 'Roberto Klein',
    whatsapp: '5547991001002',
    phone: '554733201002',
    email: 'nativas.itajai.teste@example.com',
    instagram: '@nativasitajai',
    city: 'Blumenau',
    state: 'SC',
    reliability_score: 4,
    status: 'active',
    active: true,
    targetCoverage: 26,
    offset: 3,
    step: 11,
    last_contacted_at: '2026-05-08T13:00:00.000Z',
    notes: 'Bom volume de Mata Atlantica e reposicao semanal.',
  },
  {
    name: '[TESTE] Flora Restaura Parana',
    contact_name: 'Ana Becker',
    whatsapp: '5541991001003',
    phone: '554132201003',
    email: 'flora.parana.teste@example.com',
    instagram: '@florarestaurapr',
    city: 'Curitiba',
    state: 'PR',
    reliability_score: 5,
    status: 'active',
    active: true,
    targetCoverage: 24,
    offset: 6,
    step: 13,
    last_contacted_at: '2026-04-22T14:30:00.000Z',
    notes: 'Forte em especies para PR/SC, aceita cotacao por lote grande.',
  },
  {
    name: '[TESTE] Frutiferas Sul Brasil',
    contact_name: 'Patricia Gomes',
    whatsapp: '5547991001004',
    phone: '554734201004',
    email: 'frutiferas.sul.teste@example.com',
    instagram: '@frutiferassul',
    city: 'Joinville',
    state: 'SC',
    reliability_score: 4,
    status: 'active',
    active: true,
    targetCoverage: 22,
    offset: 9,
    step: 17,
    last_contacted_at: '2026-05-27T16:45:00.000Z',
    notes: 'Mix de frutiferas nativas, exoticas e mudas em saco.',
  },
  {
    name: '[TESTE] Cooperativa Caminho das Aguas',
    contact_name: 'Diego Martins',
    whatsapp: '5548991001005',
    phone: '554836201005',
    email: 'caminho.aguas.teste@example.com',
    instagram: '@coopcaminhodasaguas',
    city: 'Tubarao',
    state: 'SC',
    reliability_score: 3,
    status: 'active',
    active: true,
    targetCoverage: 20,
    offset: 12,
    step: 19,
    last_contacted_at: null,
    notes: 'Atende projetos de mata ciliar e recomposicao em volume medio.',
  },
  {
    name: '[TESTE] Rede Mata Atlantica',
    contact_name: 'Leticia Sato',
    whatsapp: '5513991001006',
    phone: '551338201006',
    email: 'rede.mata.teste@example.com',
    instagram: '@redemataatlantica',
    city: 'Registro',
    state: 'SP',
    reliability_score: 3,
    status: 'active',
    active: true,
    targetCoverage: 18,
    offset: 15,
    step: 23,
    last_contacted_at: '2026-03-14T12:00:00.000Z',
    notes: 'Fornecedor distante para comparar frete e especies menos comuns.',
  },
  {
    name: '[TESTE] Viveiro Araucaria Campos',
    contact_name: 'Sergio Almeida',
    whatsapp: '5549991001007',
    phone: '554935201007',
    email: 'araucaria.campos.teste@example.com',
    instagram: '@araucariacampos',
    city: 'Sao Joaquim',
    state: 'SC',
    reliability_score: 4,
    status: 'active',
    active: true,
    targetCoverage: 16,
    offset: 18,
    step: 29,
    last_contacted_at: '2026-06-01T11:20:00.000Z',
    notes: 'Bom para clima frio, tamanhos maiores e especies de altitude.',
  },
  {
    name: '[TESTE] Mudas Madeira e Sombra',
    contact_name: 'Carlos Fraga',
    whatsapp: '5542991001008',
    phone: '554232201008',
    email: 'madeira.sombra.teste@example.com',
    instagram: '@madeiraesombra',
    city: 'Ponta Grossa',
    state: 'PR',
    reliability_score: 4,
    status: 'active',
    active: true,
    targetCoverage: 15,
    offset: 21,
    step: 31,
    last_contacted_at: '2026-05-18T18:00:00.000Z',
    notes: 'Madeireiras, sombra e lotes sob encomenda.',
  },
  {
    name: '[TESTE] Ornamentais Litoral',
    contact_name: 'Bianca Lopes',
    whatsapp: '5548991001009',
    phone: '554832201009',
    email: 'ornamentais.litoral.teste@example.com',
    instagram: '@ornamentaislitoral',
    city: 'Florianopolis',
    state: 'SC',
    reliability_score: 4,
    status: 'active',
    active: true,
    targetCoverage: 14,
    offset: 24,
    step: 37,
    last_contacted_at: null,
    notes: 'Ornamentais e mudas de apelo paisagistico.',
  },
  {
    name: '[TESTE] Sementes e Mudas Oeste',
    contact_name: 'Helena Basso',
    whatsapp: '5549991001010',
    phone: '554933201010',
    email: 'mudas.oeste.teste@example.com',
    instagram: '@mudasdoeste',
    city: 'Chapeco',
    state: 'SC',
    reliability_score: 3,
    status: 'lead',
    active: true,
    targetCoverage: 13,
    offset: 27,
    step: 41,
    last_contacted_at: '2026-02-10T15:00:00.000Z',
    notes: 'Lead em validacao; bom para testar fornecedor ainda nao parceiro.',
  },
  {
    name: '[TESTE] Produtor Rio Canoas',
    contact_name: 'Joao Mendes',
    whatsapp: '5549991001011',
    phone: '554934201011',
    email: 'rio.canoas.teste@example.com',
    instagram: '@produtorriocanoas',
    city: 'Urubici',
    state: 'SC',
    reliability_score: 2,
    status: 'lead',
    active: true,
    targetCoverage: 12,
    offset: 30,
    step: 43,
    last_contacted_at: null,
    notes: 'Pequeno produtor, quantidades minimas menores e estoque irregular.',
  },
  {
    name: '[TESTE] Viveiro Sementes do Pampa',
    contact_name: 'Renata Silveira',
    whatsapp: '5553991001012',
    phone: '555332201012',
    email: 'sementes.pampa.teste@example.com',
    instagram: '@sementesdopampa',
    city: 'Pelotas',
    state: 'RS',
    reliability_score: 3,
    status: 'inactive',
    active: true,
    targetCoverage: 10,
    offset: 33,
    step: 47,
    last_contacted_at: '2026-01-25T13:10:00.000Z',
    notes: 'Mantido ativo no cadastro com status inativo para testar filtros/decisao manual.',
  },
  {
    name: '[TESTE] Fornecedor Nao Contatar',
    contact_name: 'Contato bloqueado',
    whatsapp: '5548991001013',
    phone: '554832201013',
    email: 'nao.contatar.teste@example.com',
    instagram: '@naocontatarteste',
    city: 'Itajai',
    state: 'SC',
    reliability_score: 1,
    status: 'do_not_contact',
    active: true,
    targetCoverage: 32,
    offset: 36,
    step: 5,
    last_contacted_at: '2026-04-01T10:00:00.000Z',
    notes: 'Deve ficar fora dos candidatos de cotacao por status do_not_contact.',
  },
  {
    name: '[TESTE] Viveiro Arquivado Antigo',
    contact_name: 'Contato antigo',
    whatsapp: '5548991001014',
    phone: '554832201014',
    email: 'arquivado.antigo.teste@example.com',
    instagram: '@arquivadoantigo',
    city: 'Brusque',
    state: 'SC',
    reliability_score: 2,
    status: 'inactive',
    active: false,
    targetCoverage: 16,
    offset: 39,
    step: 3,
    last_contacted_at: '2025-12-12T17:30:00.000Z',
    notes: 'Arquivado para testar exclusao por active=false.',
  },
]

const sizeOptions = [
  '15-30cm',
  '30-50cm',
  '50-80cm',
  '80-120cm',
  '1,2m+',
  'muda jovem',
  'muda rustificada',
]

const containerOptions = [
  'tubete',
  'saquinho',
  'saco 10x18',
  'saco 17x22',
  'saco 20x30',
  'lata 5L',
  'raiz nua',
]

const minQuantityOptions = [10, 20, 25, 50, 80, 100, 150, 200, 300, 500]

const categoryBasePrice: Record<string, number> = {
  frutifera: 7.8,
  restauracao: 5.9,
  ornamental: 11.5,
  madeira: 6.6,
  pioneira: 4.8,
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function offerPrice(species: SpeciesRow, speciesIndex: number, supplierIndex: number) {
  const base = categoryBasePrice[species.category] ?? 6.5
  const variation = ((speciesIndex * 17 + supplierIndex * 11) % 95) / 10
  const sizePremium = ((speciesIndex + supplierIndex) % 5) * 0.7
  return roundMoney(base + variation + sizePremium)
}

function offerAvailability(speciesIndex: number, supplierIndex: number): Availability {
  const marker = (speciesIndex * 5 + supplierIndex * 3) % 13
  if (marker === 0 || marker === 5) return 'on_order'
  if (marker === 9) return 'unknown'
  return 'in_stock'
}

function fillSupplierSet(
  selected: Set<number>,
  speciesCount: number,
  targetCoverage: number,
  offset: number,
  step: number,
) {
  let cursor = 0
  while (selected.size < targetCoverage && cursor < speciesCount * 3) {
    selected.add((offset + cursor * step) % speciesCount)
    cursor += 1
  }

  let fallback = 0
  while (selected.size < Math.min(targetCoverage, speciesCount)) {
    selected.add((offset + fallback) % speciesCount)
    fallback += 1
  }
}

function buildOfferSets(speciesCount: number) {
  const sets = suppliers.map(() => new Set<number>())
  const contactableIndexes = suppliers
    .map((supplier, index) => ({ supplier, index }))
    .filter(({ supplier }) => supplier.active && supplier.status !== 'do_not_contact')
    .map(({ index }) => index)

  for (let speciesIndex = 0; speciesIndex < speciesCount; speciesIndex += 1) {
    const first = contactableIndexes[speciesIndex % contactableIndexes.length]
    let second = contactableIndexes[(speciesIndex * 3 + 5) % contactableIndexes.length]
    if (second === first) {
      second = contactableIndexes[(speciesIndex * 3 + 6) % contactableIndexes.length]
    }
    sets[first].add(speciesIndex)
    sets[second].add(speciesIndex)

    if (speciesIndex % 5 === 0) {
      const third = contactableIndexes[(speciesIndex * 7 + 1) % contactableIndexes.length]
      sets[third].add(speciesIndex)
    }
  }

  suppliers.forEach((supplier, supplierIndex) => {
    fillSupplierSet(
      sets[supplierIndex],
      speciesCount,
      supplier.targetCoverage,
      supplier.offset,
      supplier.step,
    )
  })

  return sets
}

async function loadTargetSpecies(client: PoolClient) {
  const { rows } = await client.query<SpeciesRow>(`
    WITH ranked AS (
      SELECT
        id,
        common_name,
        category::text AS category,
        row_number() OVER (
          PARTITION BY category
          ORDER BY md5(common_name || COALESCE(scientific_name, '')), common_name
        ) AS rn
      FROM species
      WHERE active = true
        AND category IS NOT NULL
    )
    SELECT id, common_name, category
    FROM ranked
    WHERE (category = 'frutifera' AND rn <= 24)
       OR (category = 'restauracao' AND rn <= 10)
       OR (category = 'ornamental' AND rn <= 6)
       OR (category = 'madeira' AND rn <= 5)
       OR (category = 'pioneira' AND rn <= 5)
    ORDER BY
      CASE category
        WHEN 'frutifera' THEN 1
        WHEN 'restauracao' THEN 2
        WHEN 'ornamental' THEN 3
        WHEN 'madeira' THEN 4
        WHEN 'pioneira' THEN 5
        ELSE 6
      END,
      common_name
  `)

  if (rows.length !== 50) {
    throw new Error(`Esperava 50 especies ativas para o seed, encontrei ${rows.length}.`)
  }

  return rows
}

async function upsertSupplier(
  client: PoolClient,
  supplier: SupplierSeed,
) {
  const notes = `${SEED_MARKER} ${supplier.notes}`
  const { rows: existing } = await client.query<{ id: string }>(
    'SELECT id FROM suppliers WHERE name = $1 ORDER BY created_at LIMIT 1',
    [supplier.name],
  )

  if (existing[0]) {
    const id = existing[0].id
    await client.query(
      `UPDATE suppliers
       SET contact_name = $2,
           whatsapp = $3,
           phone = $4,
           email = $5,
           instagram = $6,
           city = $7,
           state = $8,
           reliability_score = $9,
           status = $10,
           active = $11,
           last_contacted_at = $12,
           notes = $13
       WHERE id = $1`,
      [
        id,
        supplier.contact_name,
        supplier.whatsapp,
        supplier.phone ?? null,
        supplier.email ?? null,
        supplier.instagram ?? null,
        supplier.city,
        supplier.state,
        supplier.reliability_score,
        supplier.status,
        supplier.active,
        supplier.last_contacted_at ?? null,
        notes,
      ],
    )
    return id
  }

  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO suppliers
       (name, contact_name, whatsapp, phone, email, instagram, city, state,
        reliability_score, status, active, last_contacted_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      supplier.name,
      supplier.contact_name,
      supplier.whatsapp,
      supplier.phone ?? null,
      supplier.email ?? null,
      supplier.instagram ?? null,
      supplier.city,
      supplier.state,
      supplier.reliability_score,
      supplier.status,
      supplier.active,
      supplier.last_contacted_at ?? null,
      notes,
    ],
  )
  return rows[0].id
}

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const species = await loadTargetSpecies(client)
    const offerSets = buildOfferSets(species.length)
    const supplierIds: string[] = []

    for (const supplier of suppliers) {
      supplierIds.push(await upsertSupplier(client, supplier))
    }

    await client.query('DELETE FROM supplier_species WHERE supplier_id = ANY($1)', [
      supplierIds,
    ])

    let offerCount = 0
    for (const [supplierIndex, supplierId] of supplierIds.entries()) {
      const selectedSpecies = [...offerSets[supplierIndex]].sort((a, b) => a - b)
      for (const speciesIndex of selectedSpecies) {
        const item = species[speciesIndex]
        const size = sizeOptions[(speciesIndex + supplierIndex) % sizeOptions.length]
        const container =
          containerOptions[(speciesIndex * 2 + supplierIndex) % containerOptions.length]
        const minQuantity =
          minQuantityOptions[(speciesIndex + supplierIndex * 2) % minQuantityOptions.length]
        const availability = offerAvailability(speciesIndex, supplierIndex)
        const unitPrice = offerPrice(item, speciesIndex, supplierIndex)

        await client.query(
          `INSERT INTO supplier_species
             (supplier_id, species_id, size, container, unit_price, min_quantity,
              availability, source, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', $8)`,
          [
            supplierId,
            item.id,
            size,
            container,
            unitPrice,
            minQuantity,
            availability,
            `${SEED_MARKER} ${item.common_name}; minimo ${minQuantity}; ${availability}.`,
          ],
        )
        offerCount += 1
      }
    }

    await client.query('COMMIT')

    console.log(`Seed concluido em banco local.`)
    console.log(`Fornecedores de teste: ${suppliers.length}`)
    console.log(`Especies foco: ${species.length}`)
    console.log(`Ofertas fornecedor/especie: ${offerCount}`)
    console.log('')
    console.log('Cobertura por fornecedor:')
    suppliers.forEach((supplier, index) => {
      const flags = [
        supplier.active ? 'active=true' : 'active=false',
        `status=${supplier.status}`,
      ].join(', ')
      console.log(`- ${supplier.name}: ${offerSets[index].size} especies (${flags})`)
    })

    const contactableIndexes = suppliers
      .map((supplier, index) => ({ supplier, index }))
      .filter(({ supplier }) => supplier.active && supplier.status !== 'do_not_contact')
      .map(({ index }) => index)
    const coverageBySpecies = species.map((_, speciesIndex) =>
      contactableIndexes.filter((supplierIndex) =>
        offerSets[supplierIndex].has(speciesIndex),
      ).length,
    )

    console.log('')
    console.log(
      `Cobertura por especie entre fornecedores contataveis: min=${Math.min(...coverageBySpecies)}, max=${Math.max(...coverageBySpecies)}`,
    )
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
