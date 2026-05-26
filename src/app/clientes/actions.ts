'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { onlyDigits, isValidCNPJ, validateSimpleCustomer, type PersonType } from '@/lib/customers'
import {
  mapBrasilApi,
  mapOpenCnpj,
  type BrasilApiResponse,
  type CnpjData,
  type OpenCnpjResponse,
} from '@/lib/cnpj'

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

/** Cliente que ja possui o documento — alimenta a mensagem de conflito e a uniao. */
async function findCustomerByDocument(
  document: string | null,
  excludeId?: string,
): Promise<{ id: string; name: string } | null> {
  if (!document) return null
  const params: unknown[] = [document]
  let exclude = ''
  if (excludeId) {
    params.push(excludeId)
    exclude = ` AND id <> $2`
  }
  const { rows } = await pool.query(
    `SELECT id, name FROM customers WHERE document = $1${exclude} LIMIT 1`,
    params,
  )
  return rows[0] ?? null
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
 * Consulta um CNPJ na base publica (OpenCNPJ) para autopreencher o cadastro.
 * Roda no servidor (evita CORS e centraliza a escolha da API; se um dia virar
 * provedor com chave, muda so aqui). Nao persiste nada — devolve os campos
 * mapeados para o formulario preencher.
 */
export async function lookupCnpj(
  cnpj: string,
): Promise<{ data?: CnpjData; error?: string }> {
  await requireRole('admin', 'chefia')
  const digits = onlyDigits(cnpj)
  if (!isValidCNPJ(digits)) return { error: 'CNPJ inválido.' }

  // Provedor primario: BrasilAPI (estavel e alcancavel mesmo de redes que bloqueiam
  // a OpenCNPJ). 404 e resposta definitiva (CNPJ inexistente) — nao cai no fallback.
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.status === 404) return { error: 'CNPJ não encontrado na base da Receita.' }
    if (res.ok) {
      const json = (await res.json()) as BrasilApiResponse
      return { data: mapBrasilApi(json) }
    }
    // outros status (429/5xx): tenta o fallback
  } catch {
    // erro de rede: tenta o fallback
  }

  // Fallback: OpenCNPJ. Util em produção caso a BrasilAPI esteja fora do ar.
  try {
    const res = await fetch(`https://api.opencnpj.org/${digits}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.status === 404) return { error: 'CNPJ não encontrado na base da Receita.' }
    if (!res.ok) return { error: `Não foi possível consultar o CNPJ (erro ${res.status}).` }
    const json = (await res.json()) as OpenCnpjResponse
    return { data: mapOpenCnpj(json) }
  } catch {
    return { error: 'Falha ao consultar o CNPJ. Verifique a conexão e tente de novo.' }
  }
}

/**
 * Cria cliente. Aceita o cadastro simples (so `name`, como o inline do pedido) e
 * o completo (com campos fiscais). Campos fiscais nullable => o simples segue valido.
 */
export async function createCustomer(
  data: CustomerInput,
): Promise<{ id?: string; error?: string; conflict?: { id: string; name: string } }> {
  await requireRole('admin', 'chefia')

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
    if (isDuplicateDocument(e)) {
      const conflict = await findCustomerByDocument(f.document)
      return {
        error: conflict
          ? `Este documento já está cadastrado para "${conflict.name}".`
          : 'Documento já cadastrado para outro cliente.',
        conflict: conflict ?? undefined,
      }
    }
    return { error: (e as Error).message }
  }
}

/** Atualiza contato + dados fiscais de um cliente. */
export async function updateCustomer(
  id: string,
  data: CustomerInput,
): Promise<{ error?: string; conflict?: { id: string; name: string } }> {
  await requireRole('admin', 'chefia')

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
    if (isDuplicateDocument(e)) {
      const conflict = await findCustomerByDocument(f.document, id)
      return {
        error: conflict
          ? `Este documento já está cadastrado para "${conflict.name}".`
          : 'Documento já cadastrado para outro cliente.',
        conflict: conflict ?? undefined,
      }
    }
    return { error: (e as Error).message }
  }
}

/** Soft-delete via `active`, espelhando toggleUsuarioAtivo. Nunca deleta fisicamente. */
export async function toggleCustomerActive(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(`UPDATE customers SET active = $1 WHERE id = $2`, [active, id])
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}

/**
 * Une dois clientes: reaponta todos os pedidos do `duplicateId` para o
 * `originalId` e inativa o duplicado (soft-delete — padrao do sistema). Usado
 * quando o documento digitado ja pertence a outro cadastro: o original e mantido
 * como a verdade e o cadastro repetido sai da listagem ativa.
 */
export async function mergeCustomers(
  duplicateId: string,
  originalId: string,
): Promise<{ movedOrders?: number; error?: string }> {
  await requireRole('admin', 'chefia')
  if (!duplicateId || !originalId) return { error: 'Clientes inválidos para unir.' }
  if (duplicateId === originalId) return { error: 'Não é possível unir um cliente a ele mesmo.' }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: found } = await client.query(
      `SELECT id FROM customers WHERE id = ANY($1::uuid[])`,
      [[duplicateId, originalId]],
    )
    if (found.length < 2) {
      await client.query('ROLLBACK')
      return { error: 'Cliente não encontrado.' }
    }
    const moved = await client.query(
      `UPDATE orders SET customer_id = $1 WHERE customer_id = $2`,
      [originalId, duplicateId],
    )
    await client.query(`UPDATE customers SET active = false WHERE id = $1`, [duplicateId])
    await client.query('COMMIT')
    revalidatePath(PATH)
    revalidatePath('/pedidos')
    return { movedOrders: moved.rowCount ?? 0 }
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: (e as Error).message }
  } finally {
    client.release()
  }
}
