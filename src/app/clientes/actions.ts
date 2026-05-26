'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { onlyDigits, validateSimpleCustomer, type PersonType } from '@/lib/customers'

const PATH = '/clientes'

// Colunas retornadas em listagem/detalhe — incluem os campos fiscais para a UI
// calcular o selo de completude (isFiscallyComplete) sem ida extra ao banco.
const CUSTOMER_COLUMNS = `id, name, phone, city, state, notes, active,
  person_type, document, email, legal_name, trade_name,
  state_registration, ie_exempt, zip_code, street, address_number,
  complement, neighborhood, created_at, updated_at`

// Payload aceito por create/update. O cadastro simples manda so `name` (+ phone);
// os campos fiscais sao todos opcionais (nullable no banco).
export interface CustomerInput {
  name?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
  // Fiscais
  person_type?: PersonType | null
  document?: string | null
  email?: string | null
  legal_name?: string | null
  trade_name?: string | null
  state_registration?: string | null
  ie_exempt?: boolean | null
  zip_code?: string | null
  street?: string | null
  address_number?: string | null
  complement?: string | null
  neighborhood?: string | null
}

// person_type so pode ser 'pf'/'pj' ou NULL (CHECK no banco). Normaliza qualquer
// outro valor (ex.: '' do form) para NULL = cadastro simples/legado.
function normPersonType(v: PersonType | null | undefined): PersonType | null {
  return v === 'pf' || v === 'pj' ? v : null
}

// Nome de exibicao: PF usa o nome digitado; PJ cai para nome fantasia / razao
// social quando o nome nao foi preenchido explicitamente.
function displayName(data: CustomerInput, personType: PersonType | null): string {
  const name = data.name?.trim()
  if (name) return name
  if (personType === 'pj') {
    return (data.trade_name?.trim() || data.legal_name?.trim() || '')
  }
  return ''
}

// Mapeia os campos fiscais do payload para o array de bind, normalizando
// documento/CEP para so-digitos e strings vazias para NULL.
function fiscalValues(data: CustomerInput, personType: PersonType | null) {
  const trimOrNull = (v: string | null | undefined) => v?.trim() || null
  const digitsOrNull = (v: string | null | undefined) => {
    const d = onlyDigits(v)
    return d || null
  }
  return {
    document: digitsOrNull(data.document),
    email: trimOrNull(data.email),
    legal_name: trimOrNull(data.legal_name),
    trade_name: trimOrNull(data.trade_name),
    state_registration: personType === 'pj' ? trimOrNull(data.state_registration) : null,
    ie_exempt: personType === 'pj' ? data.ie_exempt === true : false,
    zip_code: digitsOrNull(data.zip_code),
    street: trimOrNull(data.street),
    address_number: trimOrNull(data.address_number),
    complement: trimOrNull(data.complement),
    neighborhood: trimOrNull(data.neighborhood),
  }
}

function isDuplicateDocument(e: unknown): boolean {
  const err = e as { code?: string; message?: string }
  return (
    err?.code === '23505' ||
    (err?.message?.includes('idx_customers_document') ?? false) ||
    (err?.message?.toLowerCase().includes('duplicate') ?? false)
  )
}

/**
 * Lista clientes ativos. `search` (opcional) casa nome, telefone, documento,
 * razao social e nome fantasia (ILIKE). A pagina /clientes carrega tudo e filtra
 * no client; o parametro existe para reuso (ex.: busca server-side futura).
 */
export async function getCustomers(search?: string) {
  const q = (search ?? '').trim()
  if (!q) {
    const { rows } = await pool.query(
      `SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE active = true ORDER BY name`,
    )
    return rows
  }
  const like = `%${q}%`
  const digits = onlyDigits(q)
  const params: unknown[] = [like]
  let docClause = ''
  if (digits) {
    params.push(`%${digits}%`)
    docClause = ` OR document ILIKE $${params.length}`
  }
  const { rows } = await pool.query(
    `SELECT ${CUSTOMER_COLUMNS} FROM customers
     WHERE active = true
       AND (name ILIKE $1 OR phone ILIKE $1 OR legal_name ILIKE $1 OR trade_name ILIKE $1${docClause})
     ORDER BY name`,
    params,
  )
  return rows
}

/** Busca rapida por nome (ILIKE), limite 10 — usada em autocomplete. */
export async function searchCustomers(query: string) {
  const q = (query ?? '').trim()
  if (!q) return []
  const { rows } = await pool.query(
    `SELECT id, name, phone, city, state
     FROM customers
     WHERE active = true AND name ILIKE $1
     ORDER BY name LIMIT 10`,
    [`%${q}%`],
  )
  return rows
}

/** Cliente completo (todos os campos fiscais) para a tela de edicao/detalhe. */
export async function getCustomerById(id: string) {
  const { rows } = await pool.query(
    `SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE id = $1`,
    [id],
  )
  return rows[0] ?? null
}

/**
 * Cria cliente. Aceita o cadastro simples (so `name`, como o inline do pedido) e
 * o completo (com campos fiscais). Campos fiscais nullable => o simples segue valido.
 */
export async function createCustomer(
  data: CustomerInput,
): Promise<{ id?: string; error?: string }> {
  await requireRole('admin', 'chefia', 'gerencia')

  const personType = normPersonType(data.person_type)
  const name = displayName(data, personType)
  const simpleError = validateSimpleCustomer({ name })
  if (simpleError) return { error: simpleError }

  const f = fiscalValues(data, personType)
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers
         (name, phone, city, state, notes,
          person_type, document, email, legal_name, trade_name,
          state_registration, ie_exempt, zip_code, street, address_number,
          complement, neighborhood)
       VALUES ($1, $2, $3, COALESCE($4, 'SC'), $5,
               $6, $7, $8, $9, $10,
               $11, $12, $13, $14, $15,
               $16, $17)
       RETURNING id`,
      [
        name,
        data.phone?.trim() || null,
        data.city?.trim() || null,
        data.state?.trim() || null,
        data.notes?.trim() || null,
        personType,
        f.document,
        f.email,
        f.legal_name,
        f.trade_name,
        f.state_registration,
        f.ie_exempt,
        f.zip_code,
        f.street,
        f.address_number,
        f.complement,
        f.neighborhood,
      ],
    )
    revalidatePath(PATH)
    return { id: rows[0].id }
  } catch (e: unknown) {
    if (isDuplicateDocument(e)) return { error: 'Documento já cadastrado para outro cliente.' }
    return { error: (e as Error).message }
  }
}

/** Atualiza contato + dados fiscais de um cliente. */
export async function updateCustomer(
  id: string,
  data: CustomerInput,
): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia', 'gerencia')

  const personType = normPersonType(data.person_type)
  const name = displayName(data, personType)
  const simpleError = validateSimpleCustomer({ name })
  if (simpleError) return { error: simpleError }

  const f = fiscalValues(data, personType)
  try {
    await pool.query(
      `UPDATE customers SET
         name = $1, phone = $2, city = $3, state = COALESCE($4, 'SC'), notes = $5,
         person_type = $6, document = $7, email = $8, legal_name = $9, trade_name = $10,
         state_registration = $11, ie_exempt = $12, zip_code = $13, street = $14,
         address_number = $15, complement = $16, neighborhood = $17
       WHERE id = $18`,
      [
        name,
        data.phone?.trim() || null,
        data.city?.trim() || null,
        data.state?.trim() || null,
        data.notes?.trim() || null,
        personType,
        f.document,
        f.email,
        f.legal_name,
        f.trade_name,
        f.state_registration,
        f.ie_exempt,
        f.zip_code,
        f.street,
        f.address_number,
        f.complement,
        f.neighborhood,
        id,
      ],
    )
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    if (isDuplicateDocument(e)) return { error: 'Documento já cadastrado para outro cliente.' }
    return { error: (e as Error).message }
  }
}

/** Soft-delete via `active`, espelhando toggleUsuarioAtivo. Nunca deleta fisicamente. */
export async function toggleCustomerActive(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia', 'gerencia')
  try {
    await pool.query(`UPDATE customers SET active = $1 WHERE id = $2`, [active, id])
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
