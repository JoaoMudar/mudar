'use server'

import { revalidatePath } from 'next/cache'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import pool from '@/lib/db'

const PATH = '/admin/especies'

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
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  await writeFile(
    join(process.cwd(), 'public', 'uploads', 'especies', filename),
    Buffer.from(bytes)
  )

  return { url: `/uploads/especies/${filename}` }
}

export async function createEspecie(data: SpeciesPayload): Promise<{ error?: string }> {
  try {
    await pool.query(
      `INSERT INTO species (common_name, scientific_name, category, germination_time_days, growth_time_months, notes, photo_url, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [data.common_name, data.scientific_name, data.category, data.germination_time_days,
       data.growth_time_months, data.notes, data.photo_url, data.active]
    )
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}

export async function updateEspecie(id: string, data: SpeciesPayload): Promise<{ error?: string }> {
  try {
    await pool.query(
      `UPDATE species SET common_name=$1, scientific_name=$2, category=$3, germination_time_days=$4,
       growth_time_months=$5, notes=$6, photo_url=$7, active=$8 WHERE id=$9`,
      [data.common_name, data.scientific_name, data.category, data.germination_time_days,
       data.growth_time_months, data.notes, data.photo_url, data.active, id]
    )
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}

export async function toggleEspecieAtiva(id: string, active: boolean): Promise<{ error?: string }> {
  try {
    await pool.query(`UPDATE species SET active=$1 WHERE id=$2`, [active, id])
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}
