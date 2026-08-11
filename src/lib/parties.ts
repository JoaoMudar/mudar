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

/** Deixa a identidade no formato que o banco espera (documento so digitos etc.). */
export function normalizeIdentity(input: PartyIdentity): PartyIdentity {
  return {
    ...input,
    kind: input.kind === 'pf' || input.kind === 'pj' ? input.kind : null,
    document: digitsOrNull(input.document),
    name: normalizeName(input.name),
    legal_name: trimOrNull(input.legal_name),
    trade_name: trimOrNull(input.trade_name),
    email: trimOrNull(input.email),
    phone: digitsOrNull(input.phone),
    whatsapp: digitsOrNull(input.whatsapp),
    notes: trimOrNull(input.notes),
    active: input.active ?? true,
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

/**
 * Cria ou atualiza a identidade e devolve o `party_id`.
 *
 * Quando `id` vem preenchido, atualiza; do contrario cria. COALESCE em cada
 * coluna no UPDATE: quem chama pode conhecer so parte da identidade (o
 * formulario de fornecedor nao tem documento) e nao deve apagar o que o outro
 * papel ja preencheu.
 */
export async function upsertParty(db: Queryable, input: PartyIdentity): Promise<string> {
  const n = normalizeIdentity(input)
  const erro = validateParty(n)
  if (erro) throw new Error(erro)

  const valores = [
    n.kind, n.document, n.name, n.legal_name, n.trade_name,
    n.email, n.phone, n.whatsapp, n.notes, n.active,
  ]

  if (n.id) {
    const { rows } = await db.query(
      `UPDATE cadastro.parties SET
         kind       = COALESCE($1, kind),
         document   = COALESCE($2, document),
         name       = COALESCE($3, name),
         legal_name = COALESCE($4, legal_name),
         trade_name = COALESCE($5, trade_name),
         email      = COALESCE($6, email),
         phone      = COALESCE($7, phone),
         whatsapp   = COALESCE($8, whatsapp),
         notes      = COALESCE($9, notes),
         active     = COALESCE($10, active)
       WHERE id = $11
       RETURNING id`,
      [...valores, n.id],
    )
    if (rows.length > 0) return rows[0].id as string
    // Party referenciada mas inexistente (dado inconsistente): cria com o
    // mesmo id, em vez de falhar e travar o cadastro do usuario.
  }

  const { rows } = await db.query(
    `INSERT INTO cadastro.parties
       (id, kind, document, name, legal_name, trade_name, email, phone, whatsapp, notes, active)
     VALUES (COALESCE($11::uuid, gen_random_uuid()), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [...valores, n.id ?? null],
  )
  return rows[0].id as string
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
