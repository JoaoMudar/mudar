'use server'

import { revalidatePath } from 'next/cache'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/action-errors'

const PATH = '/admin/especies'
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 8 MB

export type SpeciesCategory = 'frutifera' | 'ornamental' | 'madeira' | 'restauracao' | 'pioneira' | 'climax'

export interface SpeciesPayload {
  common_name: string
  scientific_name: string
  category: SpeciesCategory
  germination_time_days: number | null
  growth_time_months: number | null
  notes: string
  photo_url: string
  active: boolean
}

export async function uploadEspecieFoto(formData: FormData): Promise<{ url: string } | { error: string }> {
  await requireRole('admin', 'chefia')

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

    // Nome gerado pelo servidor — ignora o nome enviado pelo cliente (mata path traversal).
    const filename = `${randomUUID()}.webp`
    await writeFile(join(process.cwd(), 'public', 'uploads', 'especies', filename), webp)

    return { url: `/uploads/especies/${filename}` }
  } catch {
    return { error: 'Arquivo inválido. Envie uma imagem (JPG, PNG ou WebP).' }
  }
}

export async function createEspecie(data: SpeciesPayload): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(
      `INSERT INTO species (common_name, scientific_name, category, germination_time_days, growth_time_months, notes, photo_url, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [data.common_name, data.scientific_name, data.category, data.germination_time_days,
       data.growth_time_months, data.notes, data.photo_url, data.active]
    )
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

export async function updateEspecie(id: string, data: SpeciesPayload): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(
      `UPDATE species SET common_name=$1, scientific_name=$2, category=$3, germination_time_days=$4,
       growth_time_months=$5, notes=$6, photo_url=$7, active=$8 WHERE id=$9`,
      [data.common_name, data.scientific_name, data.category, data.germination_time_days,
       data.growth_time_months, data.notes, data.photo_url, data.active, id]
    )
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}

export async function toggleEspecieAtiva(id: string, active: boolean): Promise<{ error?: string }> {
  await requireRole('admin', 'chefia')
  try {
    await pool.query(`UPDATE species SET active=$1 WHERE id=$2`, [active, id])
  } catch (e: unknown) {
    return { error: safeErrorMessage(e) }
  }
  revalidatePath(PATH)
  return {}
}
