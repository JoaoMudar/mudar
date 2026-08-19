'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { onlyDigits, isValidCNPJ, validateSimpleCustomer, type PersonType } from '@/lib/customers'
import { safeErrorMessage } from '@/lib/action-errors'
import {
  upsertPartyFromCustomer,
  findPartyMatch,
  mergeParties,
  fillOnly,
  type PartyDecision,
  type PartyMatch,
} from '@/lib/parties'
import { authorize, requirePermission } from '@/lib/authz'
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
  await requirePermission('cliente:ler')
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
  await requirePermission('cliente:ler')
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
  await requirePermission('cliente:ler')
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
  const auth = await authorize('cliente_fiscal:ler')
  if (!auth.ok) return { error: auth.error }
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
 *
 * `decision` responde "esta pessoa ja existe em outro papel?". Sem ela, quando
 * ha identidade parecida, **nada e gravado** e a action devolve `partyMatch`
 * para a tela perguntar. Foi assim que se decidiu: o sistema nunca une sozinho.
 */
export async function createCustomer(
  data: CustomerInput,
  decision?: PartyDecision,
): Promise<{
  id?: string
  error?: string
  conflict?: { id: string; name: string }
  partyMatch?: PartyMatch
}> {
  const auth = await authorize('cliente:criar')
  if (!auth.ok) return { error: auth.error }

  const personType = normPersonType(data.person_type)
  const name = displayName(data, personType)
  const simpleError = validateSimpleCustomer({ name })
  if (simpleError) return { error: simpleError }

  const f = fiscalValues(data, personType)

  const linkPartyId = decision && 'link' in decision ? decision.link : null
  // Transacao: a identidade em cadastro.parties e o cliente sao gravados
  // juntos ou nenhum dos dois. Fora da transacao, um erro no INSERT de
  // customers deixaria uma party orfa — e a party e a fonte de verdade da
  // identidade, entao lixo ali contamina o financeiro (P12) e a agenda (P13).
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Se ha identidade que ja e fornecedor (ou outro papel) com este
    // documento/nome, devolve a pergunta sem gravar nada. Dentro da transacao,
    // e nao antes dela: ler numa conexao e escrever noutra abriria janela para
    // a identidade aparecer entre as duas.
    if (!decision) {
      const match = await findPartyMatch(client, {
        document: f.document,
        name,
        role: 'cliente',
      })
      if (match) {
        await client.query('ROLLBACK')
        return { partyMatch: match }
      }
    }

    const { rows } = await client.query(
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

    const customerId = rows[0].id as string
    // Ponto unico de escrita da identidade (src/lib/parties.ts). Sem ligacao, o
    // party_id reusa o id do cliente — mesmo criterio do backfill da migration.
    // Com ligacao, grava na identidade que ja existia, e `fillOnly` impede que
    // um campo em branco desta tela apague o que o outro papel ja tinha.
    const identidade = {
      id: linkPartyId ?? customerId,
      kind: personType,
      document: f.document,
      name,
      legal_name: f.legal_name,
      trade_name: f.trade_name,
      email: f.email,
      phone: data.phone?.trim() || null,
      zip_code: f.zip_code,
      street: f.street,
      number: f.address_number,
      complement: f.complement,
      neighborhood: f.neighborhood,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
    }
    const partyId = await upsertPartyFromCustomer(
      client,
      linkPartyId ? fillOnly(identidade) : identidade,
    )
    await client.query(`UPDATE customers SET party_id = $1 WHERE id = $2`, [
      partyId,
      customerId,
    ])

    await client.query('COMMIT')
    revalidatePath(PATH)
    return { id: customerId }
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    if (isDuplicateDocument(e)) {
      const conflict = await findCustomerByDocument(f.document)
      return {
        error: conflict
          ? `Este documento já está cadastrado para "${conflict.name}".`
          : 'Documento já cadastrado para outro cliente.',
        conflict: conflict ?? undefined,
      }
    }
    return { error: safeErrorMessage(e, 'Não foi possível cadastrar o cliente. Tente novamente.', 'createCustomer') }
  } finally {
    client.release()
  }
}

/**
 * Atualiza contato + dados fiscais de um cliente.
 *
 * A busca por identidade irmã roda aqui tambem, e nao so no create: e o que da
 * caminho de conserto aos cadastros duplicados desde o backfill de 11/08/2026 —
 * abrir e salvar levanta a pergunta, sem precisar de tela de manutencao.
 */
export async function updateCustomer(
  id: string,
  data: CustomerInput,
  decision?: PartyDecision,
): Promise<{
  error?: string
  conflict?: { id: string; name: string }
  partyMatch?: PartyMatch
}> {
  const auth = await authorize('cliente:atualizar')
  if (!auth.ok) return { error: auth.error }

  const personType = normPersonType(data.person_type)
  const name = displayName(data, personType)
  const simpleError = validateSimpleCustomer({ name })
  if (simpleError) return { error: simpleError }

  const f = fiscalValues(data, personType)

  const linkPartyId = decision && 'link' in decision ? decision.link : null
  // Mesma transacao do create: identidade e cliente andam juntos.
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // party_id pode ser nulo em cliente criado antes do cadastro unico.
    const { rows: atual } = await client.query(
      `SELECT party_id FROM customers WHERE id = $1`,
      [id],
    )
    const partyAtual = (atual[0]?.party_id as string | null) ?? null

    if (!decision) {
      const match = await findPartyMatch(client, {
        document: f.document,
        name,
        role: 'cliente',
        excludePartyId: partyAtual ?? id,
      })
      if (match) {
        await client.query('ROLLBACK')
        return { partyMatch: match }
      }
    }

    await client.query(
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
    // Ligou a uma identidade que ja existia: funde a party antiga deste cliente
    // na escolhida, em vez de largar uma identidade orfa para tras. mergeParties
    // ja repointa customers.party_id, entao a UPDATE do fim so confirma.
    if (linkPartyId && partyAtual && partyAtual !== linkPartyId) {
      await mergeParties(client, partyAtual, linkPartyId)
    }

    // Sem party (cliente anterior ao cadastro unico), o upsert cria a
    // identidade com o mesmo id e a UPDATE seguinte a amarra.
    const identidade = {
      id: linkPartyId ?? partyAtual ?? id,
      kind: personType,
      document: f.document,
      name,
      legal_name: f.legal_name,
      trade_name: f.trade_name,
      email: f.email,
      phone: data.phone?.trim() || null,
      zip_code: f.zip_code,
      street: f.street,
      number: f.address_number,
      complement: f.complement,
      neighborhood: f.neighborhood,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
    }
    const partyId = await upsertPartyFromCustomer(
      client,
      linkPartyId ? fillOnly(identidade) : identidade,
    )
    await client.query(`UPDATE customers SET party_id = $1 WHERE id = $2`, [partyId, id])

    await client.query('COMMIT')
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    if (isDuplicateDocument(e)) {
      const conflict = await findCustomerByDocument(f.document, id)
      return {
        error: conflict
          ? `Este documento já está cadastrado para "${conflict.name}".`
          : 'Documento já cadastrado para outro cliente.',
        conflict: conflict ?? undefined,
      }
    }
    return { error: safeErrorMessage(e, 'Não foi possível salvar o cliente. Tente novamente.', 'updateCustomer') }
  } finally {
    client.release()
  }
}

/**
 * Soft-delete via `active`, espelhando toggleUsuarioAtivo. Nunca deleta fisicamente.
 *
 * **Nao mexe em `cadastro.parties.active` de proposito.** Arquivar o cliente nao
 * pode arquivar a identidade: a mesma pessoa pode seguir ativa como fornecedora.
 * Papel e identidade sao coisas diferentes — e essa a razao de existir o schema
 * `cadastro`.
 */
export async function toggleCustomerActive(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  const auth = await authorize('cliente:excluir')
  if (!auth.ok) return { error: auth.error }
  try {
    await pool.query(`UPDATE customers SET active = $1 WHERE id = $2`, [active, id])
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: safeErrorMessage(e, 'Não foi possível alterar a situação do cliente. Tente novamente.', 'toggleCustomerActive') }
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
  const auth = await authorize('cliente:atualizar')
  if (!auth.ok) return { error: auth.error }
  if (!duplicateId || !originalId) return { error: 'Clientes inválidos para unir.' }
  if (duplicateId === originalId) return { error: 'Não é possível unir um cliente a ele mesmo.' }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: found } = await client.query(
      `SELECT id, party_id FROM customers WHERE id = ANY($1::uuid[])`,
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

    // Unir os pedidos sem unir as identidades deixava a party do duplicado viva
    // e sem dono — a lista de clientes ficava certa e a de identidades errada,
    // justamente o que o cadastro unico existe para impedir.
    const partyDoDuplicado = found.find((r) => r.id === duplicateId)?.party_id as string | null
    const partyDoOriginal = found.find((r) => r.id === originalId)?.party_id as string | null
    if (partyDoDuplicado && partyDoOriginal) {
      await mergeParties(client, partyDoDuplicado, partyDoOriginal)
    }

    await client.query(`UPDATE customers SET active = false WHERE id = $1`, [duplicateId])
    await client.query('COMMIT')
    revalidatePath(PATH)
    revalidatePath('/pedidos')
    return { movedOrders: moved.rowCount ?? 0 }
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: safeErrorMessage(e, 'Não foi possível unir os cadastros. Tente novamente.', 'mergeCustomers') }
  } finally {
    client.release()
  }
}
