// Ponto unico de escrita em `cadastro.parties`.
//
// Depois do backfill, o mesmo nome existe em dois lugares: em `parties` e na
// coluna antiga de `customers`/`suppliers`. E divida deliberada e temporaria,
// e a trava que a torna aceitavel e esta: TODA escrita passa por aqui. Um
// ponto de estrangulamento e um lugar so onde a duplicidade pode divergir.
//
// Divisao de responsabilidade, conforme docs/rotinas/rotina-financeiro/
// 01-cadastro-unico.md:
//   parties              -> a identidade (nome, documento, contato, endereco)
//   customers/suppliers  -> o que e do papel (reliability_score, status de
//                           outreach, campos fiscais, notas comerciais)
//
// Reaproveita as funcoes puras de `@/lib/customers` em vez de reimplementar
// validacao de documento.
import { onlyDigits, isValidCPF, isValidCNPJ, isValidEmail } from '@/lib/customers'

export type PartyKind = 'pf' | 'pj'

export type PartyRole =
  | 'cliente'
  | 'fornecedor'
  | 'funcionario'
  | 'socio'
  | 'familiar'
  | 'banco'
  | 'governo'
  | 'contador'
  | 'outro'

export const PARTY_ROLES: readonly PartyRole[] = [
  'cliente',
  'fornecedor',
  'funcionario',
  'socio',
  'familiar',
  'banco',
  'governo',
  'contador',
  'outro',
] as const

/**
 * Aceita `pool` ou o `client` de uma transacao em andamento. As Server Actions
 * que gravam cliente/fornecedor abrem transacao, e a party tem de ser gravada
 * dentro dela — se ficasse fora, um ROLLBACK deixaria identidade orfa.
 */
export interface Queryable {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

/**
 * Identidade gravavel. A distincao entre `undefined` e `null` e semantica e
 * carrega a regra que impede divergencia entre `parties` e `customers`:
 *
 *   undefined  "este formulario nao conhece este campo" -> preserva o que existe
 *   null       "o usuario apagou este campo"            -> grava NULL
 *
 * O formulario de fornecedor nao tem documento e simplesmente nao passa a chave;
 * o de cliente passa `null` quando o campo foi esvaziado na tela.
 */
export interface PartyIdentity {
  id?: string | null
  kind?: PartyKind | null
  document?: string | null
  name?: string | null
  legal_name?: string | null
  trade_name?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  notes?: string | null
  active?: boolean | null
}

/** Identidade ja existente que pode ser a mesma pessoa em outro papel. */
export interface PartyMatch {
  id: string
  name: string
  roles: PartyRole[]
  matchedBy: 'document' | 'name'
  active: boolean
}

/**
 * O que fazer com a identidade ao gravar um cliente/fornecedor novo.
 * Ausente = ninguem decidiu ainda; quem chama deve perguntar antes de gravar.
 */
export type PartyDecision = { link: string } | { separate: true }

export interface AddressInput {
  label?: 'principal' | 'entrega' | 'cobranca' | 'outro'
  zip_code?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  lat?: number | null
  lng?: number | null
}

// --- Normalizacao e validacao (puras, testadas isoladamente) ---------------

/** Vazio e espaco em branco viram NULL — `''` nao e um nome. */
export function normalizeName(name: string | null | undefined): string | null {
  const t = (name ?? '').trim()
  return t === '' ? null : t
}

const digitsOrNull = (v: string | null | undefined): string | null => onlyDigits(v) || null
const trimOrNull = (v: string | null | undefined): string | null => v?.trim() || null

// Preservam o `undefined`, que aqui quer dizer "quem chama nao conhece este
// campo". Achatar os dois em `null` (como era antes) fazia o COALESCE do UPDATE
// ser a unica defesa possivel — e ai um telefone apagado em /clientes zerava
// `customers.phone` e mantinha o valor errado em `parties.phone`.
const digitsOrKeep = (v: string | null | undefined): string | null | undefined =>
  v === undefined ? undefined : digitsOrNull(v)
const trimOrKeep = (v: string | null | undefined): string | null | undefined =>
  v === undefined ? undefined : trimOrNull(v)

/** Deixa a identidade no formato que o banco espera (documento so digitos etc.). */
export function normalizeIdentity(input: PartyIdentity): PartyIdentity {
  return {
    ...input,
    kind:
      input.kind === undefined
        ? undefined
        : input.kind === 'pf' || input.kind === 'pj'
          ? input.kind
          : null,
    document: digitsOrKeep(input.document),
    name: input.name === undefined ? undefined : normalizeName(input.name),
    legal_name: trimOrKeep(input.legal_name),
    trade_name: trimOrKeep(input.trade_name),
    email: trimOrKeep(input.email),
    phone: digitsOrKeep(input.phone),
    whatsapp: digitsOrKeep(input.whatsapp),
    notes: trimOrKeep(input.notes),
    // Ninguem passa `active` hoje; deixar undefined evita que salvar um cadastro
    // reative a identidade sem querer. O default da coluna cobre o INSERT.
    active: input.active === undefined ? undefined : (input.active ?? true),
  }
}

/** Mensagem de erro, ou `null` se a identidade e gravavel. */
export function validateParty(input: PartyIdentity): string | null {
  const n = normalizeIdentity(input)
  if (!n.name) return 'Informe o nome.'

  if (n.document) {
    // O tipo manda quando informado; sem tipo, aceita qualquer um dos dois —
    // o cadastro simples legado nao preenche person_type.
    const okCpf = isValidCPF(n.document)
    const okCnpj = isValidCNPJ(n.document)
    if (n.kind === 'pf' && !okCpf) return 'CPF inválido.'
    if (n.kind === 'pj' && !okCnpj) return 'CNPJ inválido.'
    if (!n.kind && !okCpf && !okCnpj) return 'Documento inválido.'
  }

  if (n.email && !isValidEmail(n.email)) return 'E-mail inválido.'
  return null
}

// --- Escrita ---------------------------------------------------------------

/** Colunas de identidade que quem chama pode informar, na ordem do schema. */
const PARTY_COLUMNS = [
  'kind', 'document', 'name', 'legal_name', 'trade_name',
  'email', 'phone', 'whatsapp', 'notes', 'active',
] as const

/**
 * Cria ou atualiza a identidade e devolve o `party_id`.
 *
 * Quando `id` vem preenchido, atualiza; do contrario cria. **So as colunas que
 * quem chama conhece entram no comando** — ver a semantica de `undefined` vs
 * `null` em `PartyIdentity`. Antes isto era um COALESCE em todas as colunas, o
 * que protegia o documento preenchido pelo cadastro de cliente mas tambem
 * impedia apagar qualquer campo pela tela.
 */
export async function upsertParty(db: Queryable, input: PartyIdentity): Promise<string> {
  const n = normalizeIdentity(input)
  const erro = validateParty(n)
  if (erro) throw new Error(erro)

  const colunas = PARTY_COLUMNS.filter((c) => n[c] !== undefined)

  if (n.id) {
    if (colunas.length > 0) {
      const params: unknown[] = []
      const sets = colunas.map((c) => {
        params.push(n[c])
        return `${c} = $${params.length}`
      })
      params.push(n.id)
      const { rows } = await db.query(
        `UPDATE cadastro.parties SET ${sets.join(', ')}
         WHERE id = $${params.length}
         RETURNING id`,
        params,
      )
      if (rows.length > 0) return rows[0].id as string
    } else {
      const { rows } = await db.query(
        `SELECT id FROM cadastro.parties WHERE id = $1`,
        [n.id],
      )
      if (rows.length > 0) return rows[0].id as string
    }
    // Party referenciada mas inexistente (dado inconsistente): cria com o
    // mesmo id, em vez de falhar e travar o cadastro do usuario.
  }

  const params: unknown[] = colunas.map((c) => n[c])
  const placeholders = colunas.map((_, i) => `$${i + 1}`)
  params.push(n.id ?? null)
  const { rows } = await db.query(
    `INSERT INTO cadastro.parties
       (id${colunas.length > 0 ? ', ' + colunas.join(', ') : ''})
     VALUES (COALESCE($${params.length}::uuid, gen_random_uuid())${
       placeholders.length > 0 ? ', ' + placeholders.join(', ') : ''
     })
     RETURNING id`,
    params,
  )
  return rows[0].id as string
}

/**
 * Procura uma identidade ja cadastrada que possa ser a mesma pessoa entrando
 * num papel novo — o caso do fornecedor que tambem compra.
 *
 * Documento e prova forte; nome normalizado e indicio. So devolve match quando
 * a party encontrada **ainda nao tem** o papel pedido: party que ja e cliente
 * sendo cadastrada como cliente de novo e duplicata do mesmo papel, caso que o
 * `idx_customers_document` e o conflito de documento ja tratam.
 *
 * Nunca une sozinho — quem decide e o usuario, na tela.
 */
export async function findPartyMatch(
  db: Queryable,
  input: {
    document?: string | null
    name?: string | null
    role: PartyRole
    excludePartyId?: string | null
  },
): Promise<PartyMatch | null> {
  const busca = async (
    criterio: string,
    valor: string,
    matchedBy: 'document' | 'name',
  ): Promise<PartyMatch | null> => {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.active,
              COALESCE(
                array_agg(r.role) FILTER (WHERE r.role IS NOT NULL),
                '{}'
              ) AS roles
         FROM cadastro.parties p
         LEFT JOIN cadastro.party_roles r ON r.party_id = p.id
        WHERE ${criterio} = $1
          AND ($2::uuid IS NULL OR p.id <> $2::uuid)
          AND NOT EXISTS (
                SELECT 1 FROM cadastro.party_roles x
                 WHERE x.party_id = p.id AND x.role = $3
              )
        GROUP BY p.id, p.name, p.active, p.created_at
        ORDER BY p.created_at, p.id
        LIMIT 1`,
      [valor, input.excludePartyId ?? null, input.role],
    )
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      id: r.id as string,
      name: r.name as string,
      roles: (r.roles as PartyRole[]) ?? [],
      matchedBy,
      active: r.active as boolean,
    }
  }

  const documento = digitsOrNull(input.document)
  if (documento) {
    const porDocumento = await busca('p.document', documento, 'document')
    if (porDocumento) return porDocumento
  }

  const nome = normalizeName(input.name)
  if (nome) return busca('LOWER(TRIM(p.name))', nome.toLowerCase(), 'name')

  return null
}

/**
 * Funde duas identidades: `duplicateId` deixa de existir e tudo passa a apontar
 * para `originalId`. Roda na transacao de quem chama.
 *
 * **DELETE, e nao `active = false`, contra o padrao de soft-delete do sistema.**
 * A identidade duplicada foi *fundida*, nao arquivada: nao ha historico nela,
 * porque os apontamentos ja foram levados para a sobrevivente. E `idx_parties_
 * document` e UNIQUE parcial que NAO filtra por `active` — uma party inativa
 * com documento preencheria o indice e prenderia aquele CPF/CNPJ para sempre.
 * O registro de negocio (o `customers` duplicado) continua existindo e inativo;
 * quem some e so a identidade redundante.
 */
export async function mergeParties(
  db: Queryable,
  duplicateId: string,
  originalId: string,
): Promise<void> {
  if (!duplicateId || !originalId || duplicateId === originalId) return

  // 1. Papeis do duplicado passam a valer para o original. E o ponto de tudo:
  //    uma identidade, os dois papeis.
  await db.query(
    `INSERT INTO cadastro.party_roles (party_id, role)
     SELECT $2, role FROM cadastro.party_roles WHERE party_id = $1
     ON CONFLICT (party_id, role) DO NOTHING`,
    [duplicateId, originalId],
  )

  // 2. Solta o documento do duplicado ANTES de copia-lo.
  //
  //    `idx_parties_document` e UNIQUE parcial: enquanto as duas linhas existem,
  //    o mesmo documento nas duas viola o indice na hora — o Postgres checa por
  //    comando, nao no fim da transacao. Copiar direto de d para o falhava com
  //    "duplicar valor da chave viola a restricao de unicidade".
  const { rows: dup } = await db.query(
    `SELECT document FROM cadastro.parties WHERE id = $1`,
    [duplicateId],
  )
  const documentoDoDuplicado = (dup[0]?.document as string | null) ?? null
  if (documentoDoDuplicado) {
    await db.query(`UPDATE cadastro.parties SET document = NULL WHERE id = $1`, [duplicateId])
  }

  // 3. Completa o que so o duplicado sabia. COALESCE na sobrevivente primeiro:
  //    valor ja preenchido no original nunca e sobrescrito.
  await db.query(
    `UPDATE cadastro.parties o SET
       kind       = COALESCE(o.kind, d.kind),
       document   = COALESCE(o.document, $3),
       legal_name = COALESCE(o.legal_name, d.legal_name),
       trade_name = COALESCE(o.trade_name, d.trade_name),
       email      = COALESCE(o.email, d.email),
       phone      = COALESCE(o.phone, d.phone),
       whatsapp   = COALESCE(o.whatsapp, d.whatsapp),
       notes      = COALESCE(o.notes, d.notes)
     FROM cadastro.parties d
     WHERE o.id = $2 AND d.id = $1`,
    [duplicateId, originalId, documentoDoDuplicado],
  )

  // 4. Endereco primario so migra se o original nao tiver — idx_addresses_one_
  //    primary e UNIQUE parcial e recusaria o segundo.
  await db.query(
    `UPDATE cadastro.addresses SET party_id = $2
      WHERE party_id = $1 AND is_primary
        AND NOT EXISTS (
              SELECT 1 FROM cadastro.addresses a
               WHERE a.party_id = $2 AND a.is_primary
            )`,
    [duplicateId, originalId],
  )

  // 5. Repointa quem apontava para o duplicado. TEM de vir antes do DELETE:
  //    customers.party_id e suppliers.party_id sao FK sem ON DELETE CASCADE.
  await db.query(`UPDATE customers SET party_id = $2 WHERE party_id = $1`, [
    duplicateId,
    originalId,
  ])
  await db.query(`UPDATE suppliers SET party_id = $2 WHERE party_id = $1`, [
    duplicateId,
    originalId,
  ])

  // 6. Papeis e enderecos restantes saem por ON DELETE CASCADE.
  await db.query(`DELETE FROM cadastro.parties WHERE id = $1`, [duplicateId])
}

/** Acrescenta um papel. Idempotente — papel repetido nao e erro. */
export async function addPartyRole(
  db: Queryable,
  partyId: string,
  role: PartyRole,
): Promise<void> {
  await db.query(
    `INSERT INTO cadastro.party_roles (party_id, role) VALUES ($1, $2)
     ON CONFLICT (party_id, role) DO NOTHING`,
    [partyId, role],
  )
}

/**
 * Grava o endereco principal. Um por pessoa (indice unico parcial no banco),
 * entao atualiza o que existir em vez de inserir outro.
 */
export async function upsertPrimaryAddress(
  db: Queryable,
  partyId: string,
  addr: AddressInput,
): Promise<void> {
  const temAlgo =
    addr.zip_code || addr.street || addr.city || addr.lat != null || addr.lng != null
  if (!temAlgo) return

  const valores = [
    partyId,
    digitsOrNull(addr.zip_code),
    trimOrNull(addr.street),
    trimOrNull(addr.number),
    trimOrNull(addr.complement),
    trimOrNull(addr.neighborhood),
    trimOrNull(addr.city),
    addr.state?.trim().toUpperCase() || null,
    addr.lat ?? null,
    addr.lng ?? null,
  ]

  const { rows } = await db.query(
    `UPDATE cadastro.addresses SET
       zip_code = COALESCE($2, zip_code), street = COALESCE($3, street),
       number = COALESCE($4, number), complement = COALESCE($5, complement),
       neighborhood = COALESCE($6, neighborhood), city = COALESCE($7, city),
       state = COALESCE($8, state), lat = COALESCE($9, lat), lng = COALESCE($10, lng)
     WHERE party_id = $1 AND is_primary
     RETURNING id`,
    valores,
  )
  if (rows.length > 0) return

  await db.query(
    `INSERT INTO cadastro.addresses
       (party_id, label, zip_code, street, number, complement, neighborhood, city, state, lat, lng, is_primary)
     VALUES ($1, 'principal', $2, $3, $4, $5, $6, $7, $8, $9, $10, true)`,
    valores,
  )
}

/** Coordenadas vindas do geocoding, sem tocar no resto do endereco. */
export async function updateAddressGeo(
  db: Queryable,
  partyId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await db.query(
    `UPDATE cadastro.addresses SET lat = $2, lng = $3, geocoded_at = NOW()
     WHERE party_id = $1 AND is_primary`,
    [partyId, lat, lng],
  )
}

// --- Atalhos por papel -----------------------------------------------------

export interface CustomerLikeInput extends PartyIdentity, AddressInput {}

/**
 * Converte todo campo vazio de volta em `undefined` ("nao sei"), desligando a
 * semantica de apagar.
 *
 * Usar **so no momento em que um cadastro e ligado a uma identidade que ja
 * existia**. O formulario preenchido ali nunca mostrou os dados do outro papel:
 * o e-mail em branco na tela de cliente quer dizer "nao preenchi", e nao
 * "apague o e-mail que o fornecedor tinha". Nas edicoes seguintes, com a party
 * ja ligada, vale a regra normal — campo esvaziado na tela apaga no banco.
 */
export function fillOnly(input: CustomerLikeInput): CustomerLikeInput {
  const out: Record<string, unknown> = {}
  for (const [chave, valor] of Object.entries(input)) {
    if (valor !== null && valor !== undefined && valor !== '') out[chave] = valor
  }
  return out as CustomerLikeInput
}

/** Identidade + papel `cliente` + endereco, na transacao de quem chama. */
export async function upsertPartyFromCustomer(
  db: Queryable,
  input: CustomerLikeInput,
): Promise<string> {
  const partyId = await upsertParty(db, input)
  await addPartyRole(db, partyId, 'cliente')
  await upsertPrimaryAddress(db, partyId, input)
  return partyId
}

/** Identidade + papel `fornecedor` + cidade/UF, na transacao de quem chama. */
export async function upsertPartyFromSupplier(
  db: Queryable,
  input: CustomerLikeInput,
): Promise<string> {
  const partyId = await upsertParty(db, input)
  await addPartyRole(db, partyId, 'fornecedor')
  await upsertPrimaryAddress(db, partyId, input)
  return partyId
}
