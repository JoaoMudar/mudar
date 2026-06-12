'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/action-errors'
import { onlyDigits, isValidUF } from '@/lib/customers'
import {
  normalizeAvailability,
  normalizeReliabilityScore,
  normalizeSupplierStatus,
  validateSupplier,
  validateSupplierSpecies,
  type SupplierInput,
  type SupplierSpeciesInput,
} from '@/lib/suppliers'
import {
  NOMINATIM_DELAY_MS,
  NOMINATIM_USER_AGENT,
  buildNominatimUrl,
  parseNominatimResponse,
} from '@/lib/geocode'

const PATH = '/fornecedores'

const SUPPLIER_COLUMNS = `id, name, contact_name, whatsapp, phone, email, instagram,
  city, state, notes, reliability_score, status, last_contacted_at, active,
  created_at, updated_at`

// Mapeia o payload para valores prontos de bind: strings vazias viram NULL,
// telefones viram so-digitos, UF invalida vira NULL (espelha clientes/actions).
function supplierValues(data: SupplierInput) {
  const trimOrNull = (v: string | null | undefined) => v?.trim() || null
  const digitsOrNull = (v: string | null | undefined) => onlyDigits(v) || null
  const uf = data.state?.trim().toUpperCase() || null
  return {
    name: data.name?.trim() ?? '',
    contact_name: trimOrNull(data.contact_name),
    whatsapp: digitsOrNull(data.whatsapp),
    phone: digitsOrNull(data.phone),
    email: trimOrNull(data.email),
    instagram: trimOrNull(data.instagram),
    city: trimOrNull(data.city),
    state: uf && isValidUF(uf) ? uf : null,
    notes: trimOrNull(data.notes),
    reliability_score: normalizeReliabilityScore(data.reliability_score),
    status: normalizeSupplierStatus(data.status),
  }
}

/**
 * Lista fornecedores ativos com as especies agregadas (species_names) — a busca
 * "quem tem ipê?" filtra no client sobre esse array, sem ida extra ao banco.
 */
export async function getSuppliers() {
  await requireRole('admin', 'chefia')
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.contact_name, s.whatsapp, s.phone, s.city, s.state,
            s.status, s.reliability_score, s.last_contacted_at, s.active,
            COUNT(DISTINCT ss.species_id)::int AS species_count,
            COALESCE(array_agg(DISTINCT sp.common_name)
                     FILTER (WHERE sp.id IS NOT NULL), '{}') AS species_names
     FROM suppliers s
     LEFT JOIN supplier_species ss ON ss.supplier_id = s.id
     LEFT JOIN species sp ON sp.id = ss.species_id
     WHERE s.active = true
     GROUP BY s.id
     ORDER BY s.name`,
  )
  return rows
}

/** Fornecedor completo + suas especies (com nomes) para a tela de detalhe. */
export async function getSupplierById(id: string) {
  await requireRole('admin', 'chefia')
  const { rows } = await pool.query(
    `SELECT ${SUPPLIER_COLUMNS} FROM suppliers WHERE id = $1`,
    [id],
  )
  const supplier = rows[0] ?? null
  if (!supplier) return null
  const { rows: species } = await pool.query(
    `SELECT ss.id, ss.species_id, ss.size, ss.container, ss.unit_price,
            ss.min_quantity, ss.availability, ss.source, ss.notes, ss.updated_at,
            sp.common_name, sp.scientific_name
     FROM supplier_species ss
     JOIN species sp ON sp.id = ss.species_id
     WHERE ss.supplier_id = $1
     ORDER BY sp.common_name, ss.size NULLS FIRST`,
    [id],
  )
  return { ...supplier, species }
}

export async function createSupplier(
  data: SupplierInput,
): Promise<{ id?: string; error?: string }> {
  await requireRole('admin', 'chefia')
  const error = validateSupplier(data)
  if (error) return { error }
  const v = supplierValues(data)
  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers
         (name, contact_name, whatsapp, phone, email, instagram,
          city, state, notes, reliability_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        v.name, v.contact_name, v.whatsapp, v.phone, v.email, v.instagram,
        v.city, v.state, v.notes, v.reliability_score, v.status,
      ],
    )
    revalidatePath(PATH)
    return { id: rows[0].id }
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

export async function updateSupplier(
  id: string,
  data: SupplierInput,
): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  const error = validateSupplier(data)
  if (error) return { error }
  const v = supplierValues(data)
  try {
    // Cidade/UF mudou → zera lat/lng/geocoded_at (CASE le os valores ANTIGOS
    // da linha), forcando nova geocodificacao sob demanda (P11 F4).
    await pool.query(
      `UPDATE suppliers SET
         name = $1, contact_name = $2, whatsapp = $3, phone = $4, email = $5,
         instagram = $6, city = $7, state = $8, notes = $9,
         reliability_score = $10, status = $11,
         lat = CASE WHEN city IS DISTINCT FROM $7 OR state IS DISTINCT FROM $8
                    THEN NULL ELSE lat END,
         lng = CASE WHEN city IS DISTINCT FROM $7 OR state IS DISTINCT FROM $8
                    THEN NULL ELSE lng END,
         geocoded_at = CASE WHEN city IS DISTINCT FROM $7 OR state IS DISTINCT FROM $8
                            THEN NULL ELSE geocoded_at END
       WHERE id = $12`,
      [
        v.name, v.contact_name, v.whatsapp, v.phone, v.email, v.instagram,
        v.city, v.state, v.notes, v.reliability_score, v.status, id,
      ],
    )
    revalidatePath(PATH)
    revalidatePath(`${PATH}/${id}`)
    return {}
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

/** Soft-delete via `active` (padrao do sistema). Nunca deleta fisicamente. */
export async function toggleSupplierActive(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(`UPDATE suppliers SET active = $1 WHERE id = $2`, [active, id])
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

// ============================================================
// Geocoding e mapa (P11 Fase 4)
// ============================================================

/** Fornecedores ativos para o mapa: so quem ja tem lat/lng + contagem de pendentes. */
export async function getSuppliersForMap() {
  await requireRole('admin', 'chefia')
  const { rows: suppliers } = await pool.query(
    `SELECT s.id, s.name, s.city, s.state, s.status, s.lat, s.lng,
            COUNT(DISTINCT ss.species_id)::int AS species_count
     FROM suppliers s
     LEFT JOIN supplier_species ss ON ss.supplier_id = s.id
     WHERE s.active = true AND s.lat IS NOT NULL AND s.lng IS NOT NULL
     GROUP BY s.id
     ORDER BY s.name`,
  )
  const { rows: pendingRows } = await pool.query(
    `SELECT COUNT(*)::int AS pending
     FROM suppliers
     WHERE active = true AND city IS NOT NULL AND geocoded_at IS NULL`,
  )
  return { suppliers, pending: pendingRows[0].pending as number }
}

/**
 * Geocodifica SOB DEMANDA (clique do usuario) um lote pequeno de fornecedores
 * ainda sem tentativa (geocoded_at IS NULL), respeitando a politica do
 * Nominatim (1 req/s, User-Agent identificado, resultado cacheado no banco).
 * Falha de rede deixa geocoded_at NULL (tenta de novo no proximo clique);
 * "nao achei" grava geocoded_at com lat/lng NULL (nao insiste sozinho).
 */
export async function geocodePendingSuppliers(): Promise<{
  updated?: number
  pending?: number
  error?: string
}> {
  await requireRole('admin', 'chefia')
  const BATCH = 5
  try {
    const { rows: targets } = await pool.query(
      `SELECT id, city, state FROM suppliers
       WHERE active = true AND city IS NOT NULL AND geocoded_at IS NULL
       ORDER BY name
       LIMIT $1`,
      [BATCH],
    )

    let updated = 0
    for (const [index, target] of targets.entries()) {
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, NOMINATIM_DELAY_MS))
      }
      const url = buildNominatimUrl(target)
      if (!url) continue
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': NOMINATIM_USER_AGENT },
        })
        if (!response.ok) continue
        const coords = parseNominatimResponse(await response.json())
        await pool.query(
          `UPDATE suppliers SET lat = $1, lng = $2, geocoded_at = now() WHERE id = $3`,
          [coords?.lat ?? null, coords?.lng ?? null, target.id],
        )
        if (coords) updated += 1
      } catch {
        // Rede/Nominatim fora: segue para o proximo; este fica para re-tentar.
      }
    }

    const { rows: pendingRows } = await pool.query(
      `SELECT COUNT(*)::int AS pending
       FROM suppliers
       WHERE active = true AND city IS NOT NULL AND geocoded_at IS NULL`,
    )
    revalidatePath(PATH)
    revalidatePath(`${PATH}/mapa`)
    return { updated, pending: pendingRows[0].pending as number }
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

// ============================================================
// Especies do fornecedor
// ============================================================

// Valores de bind de uma linha de supplier_species (mesma normalizacao do CRUD).
function speciesValues(data: SupplierSpeciesInput) {
  const trimOrNull = (v: string | null | undefined) => v?.trim() || null
  return {
    species_id: data.species_id ?? null,
    size: trimOrNull(data.size),
    container: trimOrNull(data.container),
    unit_price: data.unit_price ?? null,
    min_quantity: data.min_quantity ?? null,
    availability: normalizeAvailability(data.availability),
    notes: trimOrNull(data.notes),
  }
}

export async function addSupplierSpecies(
  supplierId: string,
  data: SupplierSpeciesInput,
): Promise<{ id?: string; error?: string }> {
  await requireRole('admin', 'chefia')
  const error = validateSupplierSpecies(data)
  if (error) return { error }
  const v = speciesValues(data)
  try {
    const { rows } = await pool.query(
      `INSERT INTO supplier_species
         (supplier_id, species_id, size, container, unit_price,
          min_quantity, availability, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        supplierId, v.species_id, v.size, v.container, v.unit_price,
        v.min_quantity, v.availability, v.notes,
      ],
    )
    revalidatePath(`${PATH}/${supplierId}`)
    return { id: rows[0].id }
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

export async function updateSupplierSpecies(
  id: string,
  data: SupplierSpeciesInput,
): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  const error = validateSupplierSpecies(data)
  if (error) return { error }
  const v = speciesValues(data)
  try {
    await pool.query(
      `UPDATE supplier_species SET
         species_id = $1, size = $2, container = $3, unit_price = $4,
         min_quantity = $5, availability = $6, notes = $7
       WHERE id = $8`,
      [
        v.species_id, v.size, v.container, v.unit_price,
        v.min_quantity, v.availability, v.notes, id,
      ],
    )
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

/** DELETE fisico: linha de catalogo do fornecedor, nao historico de negocio. */
export async function removeSupplierSpecies(id: string): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(`DELETE FROM supplier_species WHERE id = $1`, [id])
    revalidatePath(PATH)
    return {}
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

/**
 * Importa de uma vez as linhas revisadas da colagem de lista do fornecedor.
 * Transacao unica: ou entra tudo, ou nada (padrao mergeCustomers). source='paste'.
 */
export async function importSupplierSpeciesRows(
  supplierId: string,
  rows: SupplierSpeciesInput[],
): Promise<{ inserted?: number; error?: string }> {
  await requireRole('admin', 'chefia')
  if (!supplierId) return { error: 'Fornecedor inválido.' }
  if (!rows || rows.length === 0) return { error: 'Nenhuma linha para importar.' }
  for (const row of rows) {
    const error = validateSupplierSpecies(row)
    if (error) return { error }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const row of rows) {
      const v = speciesValues(row)
      await client.query(
        `INSERT INTO supplier_species
           (supplier_id, species_id, size, container, unit_price,
            min_quantity, availability, source, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'paste', $8)`,
        [
          supplierId, v.species_id, v.size, v.container, v.unit_price,
          v.min_quantity, v.availability, v.notes,
        ],
      )
    }
    await client.query('COMMIT')
    revalidatePath(`${PATH}/${supplierId}`)
    revalidatePath(PATH)
    return { inserted: rows.length }
  } catch (e: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: safeErrorMessage(e) }
  } finally {
    client.release()
  }
}
