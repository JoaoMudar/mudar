/**
 * Catalogo fixo de caracteristicas (tags) de especie.
 * Fonte unica de verdade: rotulo, badge curto e cores de cada tag.
 * Uma especie pode ter varias (ex: Nativa + Frutifera). Renderizadas como
 * badges coloridos ao lado do nome em todas as rotinas (ver SpeciesTags.tsx).
 *
 * Mesmo padrao de ORDER_STATUS_META em src/lib/orders.ts.
 */

export type SpeciesTagSlug =
  | 'nativa'
  | 'exotica'
  | 'frutifera'
  | 'ornamental'
  | 'madeireira'
  | 'forrageira'

export interface SpeciesTagMeta {
  /** Rotulo completo (form, acessibilidade). */
  label: string
  /** Texto curto exibido no badge. */
  short: string
  /** Classes Tailwind de cor (fundo + texto). */
  badge: string
}

export const SPECIES_TAGS: Record<SpeciesTagSlug, SpeciesTagMeta> = {
  nativa:     { label: 'Nativa',     short: 'Nat',  badge: 'bg-green-100 text-green-800' },
  exotica:    { label: 'Exótica',    short: 'Exó',  badge: 'bg-orange-100 text-orange-800' },
  frutifera:  { label: 'Frutífera',  short: 'Frut', badge: 'bg-amber-100 text-amber-800' },
  ornamental: { label: 'Ornamental', short: 'Orn',  badge: 'bg-pink-100 text-pink-800' },
  madeireira: { label: 'Madeireira', short: 'Mad',  badge: 'bg-stone-200 text-stone-700' },
  forrageira: { label: 'Forrageira', short: 'Forr', badge: 'bg-lime-100 text-lime-800' },
}

/** Ordem de exibicao no formulario de cadastro. */
export const SPECIES_TAG_LIST: { slug: SpeciesTagSlug; label: string }[] = (
  Object.keys(SPECIES_TAGS) as SpeciesTagSlug[]
).map((slug) => ({ slug, label: SPECIES_TAGS[slug].label }))

/**
 * Metadados de uma tag, tolerante a slug desconhecido (dados legados podem
 * conter valores fora do catalogo). Retorna null se nao reconhecida.
 */
export function tagMeta(slug: string): SpeciesTagMeta | null {
  return (SPECIES_TAGS as Record<string, SpeciesTagMeta>)[slug] ?? null
}
