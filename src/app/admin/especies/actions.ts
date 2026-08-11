'use server'

import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import pool from '@/lib/db'
import { safeErrorMessage } from '@/lib/action-errors'
import type { SpeciesTagSlug } from '@/lib/species-tags'
import { findNameConflict, normalizePopularName, type KnownName } from '@/lib/species-names'
import { authorize, requirePermission } from '@/lib/authz'

const PATH = '/admin/especies'
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 8 MB

export interface SpeciesPayload {
  common_name: string
  scientific_name: string
  tags: SpeciesTagSlug[]
  germination_time_days: number | null
  growth_time_months: number | null
  notes: string
  photo_url: string
  active: boolean
}

export async function uploadEspecieFoto(formData: FormData): Promise<{ url: string } | { error: string }> {
  await requirePermission('especie:atualizar')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Imagem muito grande (máx. 8 MB).' }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer())

    // Re-encoda com sharp: valida que é uma imagem de verdade (lança se não for),
    // remove EXIF/metadados e qualquer payload embutido, e normaliza para WebP.
    const webp = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    // Guardada no banco, nao em disco: o filesystem da Vercel e somente-leitura
    // fora de /tmp e some a cada deploy. Efeito colateral desejado — a foto
    // passa a ser coberta pelo backup do banco (plano E6).
    const { rows } = await pool.query(
      `INSERT INTO species_photos (bytes, mime, byte_size)
       VALUES ($1, 'image/webp', $2)
       RETURNING id`,
      [webp, webp.length],
    )

    return { url: `/api/fotos/${rows[0].id}` }
  } catch {
    return { error: 'Arquivo inválido. Envie uma imagem (JPG, PNG ou WebP).' }
  }
}

/**
 * Carrega todos os nomes conhecidos (principal de cada especie + sinonimos)
 * para checagem de conflito no app. Nao exportado: arquivo 'use server' so
 * exporta actions, e isso nao deve virar endpoint.
 */
async function loadKnownNames(): Promise<KnownName[]> {
  const [species, synonyms] = await Promise.all([
    pool.query(`SELECT id, common_name FROM species`),
    pool.query(
      `SELECT pn.species_id, pn.name, s.common_name
       FROM species_popular_names pn JOIN species s ON s.id = pn.species_id`,
    ),
  ])
  const known: KnownName[] = species.rows.map((r) => ({
    speciesId: r.id,
    name: r.common_name,
    speciesLabel: r.common_name,
  }))
  for (const r of synonyms.rows) {
    known.push({ speciesId: r.species_id, name: r.name, speciesLabel: r.common_name })
  }
  return known
}

/** Mensagem amigavel quando um nome ja pertence a outra especie. */
function conflictMessage(c: KnownName): string {
  return `Esse nome já pertence a "${c.speciesLabel}".`
}

/** Erro de violacao de UNIQUE do Postgres (corrida entre a checagem e o INSERT). */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505'
}

async function findScientificNameDuplicate(
  scientificName: string,
  excludeId?: string,
): Promise<string | null> {
  const name = scientificName.trim()
  if (!name) return null
  const { rows } = await pool.query(
    `SELECT common_name FROM species
     WHERE LOWER(TRIM(scientific_name)) = LOWER($1) AND ($2::uuid IS NULL OR id <> $2)
     LIMIT 1`,
    [name, excludeId ?? null],
  )
  return rows.length > 0 ? rows[0].common_name : null
}

export async function createEspecie(data: SpeciesPayload): Promise<{ error?: string }> {
  const auth = await authorize('especie:criar')
  if (!auth.ok) return { error: auth.error }
  try {
    const conflict = findNameConflict(data.common_name, await loadKnownNames())
    if (conflict) return { error: conflictMessage(conflict) }
    const dup = await findScientificNameDuplicate(data.scientific_name)
    if (dup) return { error: `Já existe espécie com esse nome científico: ${dup}.` }
    await pool.query(
      `INSERT INTO species (common_name, scientific_name, tags, germination_time_days, growth_time_months, notes, photo_url, active)
       VALUES ($1, $2, $3::text[], $4, $5, $6, $7, $8)`,
      [data.common_name, data.scientific_name, data.tags, data.germination_time_days,
       data.growth_time_months, data.notes, data.photo_url, data.active]
    )
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

/**
 * Cadastro rapido de especie a partir do nome (usado na colagem de pedido e na
 * busca de especie de novo/editar pedido). Sem caracteristicas — editaveis depois
 * no cadastro completo. Retorna o id para uso imediato no item do pedido.
 * Se o nome ja existe (principal ou sinonimo), retorna a especie dona em
 * `existing` em vez de criar duplicata — a UI seleciona a existente.
 */
export async function createSpeciesQuick(
  commonName: string,
): Promise<{ id?: string; existing?: { id: string; common_name: string }; error?: string }> {
  const auth = await authorize('especie:criar')
  if (!auth.ok) return { error: auth.error }
  const name = commonName.trim()
  if (!name) return { error: 'Informe o nome da espécie.' }
  try {
    const conflict = findNameConflict(name, await loadKnownNames())
    if (conflict) {
      return { existing: { id: conflict.speciesId, common_name: conflict.speciesLabel } }
    }
    const { rows } = await pool.query(
      `INSERT INTO species (common_name, active)
       VALUES ($1, true)
       RETURNING id`,
      [name],
    )
    revalidatePath(PATH)
    return { id: rows[0].id }
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
}

export async function updateEspecie(id: string, data: SpeciesPayload): Promise<{ error?: string }> {
  const auth = await authorize('especie:atualizar')
  if (!auth.ok) return { error: auth.error }
  try {
    const conflict = findNameConflict(data.common_name, await loadKnownNames(), id)
    if (conflict) return { error: conflictMessage(conflict) }
    const dup = await findScientificNameDuplicate(data.scientific_name, id)
    if (dup) return { error: `Já existe espécie com esse nome científico: ${dup}.` }
    await pool.query(
      `UPDATE species SET common_name=$1, scientific_name=$2, tags=$3::text[], germination_time_days=$4,
       growth_time_months=$5, notes=$6, photo_url=$7, active=$8 WHERE id=$9`,
      [data.common_name, data.scientific_name, data.tags, data.germination_time_days,
       data.growth_time_months, data.notes, data.photo_url, data.active, id]
    )
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

export async function toggleEspecieAtiva(id: string, active: boolean): Promise<{ error?: string }> {
  const auth = await authorize('especie:excluir')
  if (!auth.ok) return { error: auth.error }
  try {
    await pool.query(`UPDATE species SET active=$1 WHERE id=$2`, [active, id])
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

// ============================================================
// Nomes populares adicionais (sinonimos)
// ============================================================

/**
 * Adiciona um nome popular alternativo a uma especie. Um nome so pode
 * pertencer a uma especie — conflito (com principal ou sinonimo de qualquer
 * especie, inclusive a propria) retorna erro amigavel.
 */
export async function addPopularName(
  speciesId: string,
  name: string,
): Promise<{ id?: string; error?: string }> {
  const auth = await authorize('especie:atualizar')
  if (!auth.ok) return { error: auth.error }
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Informe o nome popular.' }
  try {
    const conflict = findNameConflict(trimmed, await loadKnownNames())
    if (conflict) return { error: conflictMessage(conflict) }
    const { rows } = await pool.query(
      `INSERT INTO species_popular_names (species_id, name, name_normalized)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [speciesId, trimmed, normalizePopularName(trimmed)],
    )
    revalidatePath(PATH)
    return { id: rows[0].id }
  } catch (e: unknown) {
    if (isUniqueViolation(e)) return { error: 'Esse nome já está cadastrado para outra espécie.' }
    return { error: safeErrorMessage(e) }
  }
}

export async function removePopularName(nameId: string): Promise<{ error?: string }> {
  const auth = await authorize('especie:atualizar')
  if (!auth.ok) return { error: auth.error }
  try {
    await pool.query(`DELETE FROM species_popular_names WHERE id=$1`, [nameId])
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

/**
 * Promove um sinonimo a nome popular principal da especie, fazendo o swap:
 * o common_name atual vira sinonimo (na mesma linha) e o sinonimo vira
 * common_name. Transacional — nenhum nome se perde.
 */
export async function setMainPopularName(nameId: string): Promise<{ error?: string }> {
  const auth = await authorize('especie:atualizar')
  if (!auth.ok) return { error: auth.error }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT pn.id, pn.species_id, pn.name, s.common_name
       FROM species_popular_names pn JOIN species s ON s.id = pn.species_id
       WHERE pn.id = $1
       FOR UPDATE`,
      [nameId],
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return { error: 'Nome não encontrado.' }
    }
    const { species_id, name, common_name } = rows[0]
    await client.query(`UPDATE species SET common_name=$1 WHERE id=$2`, [name, species_id])
    await client.query(
      `UPDATE species_popular_names SET name=$1, name_normalized=$2 WHERE id=$3`,
      [common_name, normalizePopularName(common_name), nameId],
    )
    await client.query('COMMIT')
  } catch (e: unknown) {
    try { await client.query('ROLLBACK') } catch { /* conexao ja perdida */ }
    return { error: safeErrorMessage(e) }
  } finally {
    client.release()
  }
  revalidatePath(PATH)
  return {}
}
