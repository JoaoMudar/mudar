import { describe, it, expect } from 'vitest'
import {
  SPECIES_TAGS,
  SPECIES_TAG_LIST,
  tagMeta,
  type SpeciesTagSlug,
} from '../species-tags'

describe('species-tags — catalogo', () => {
  it('cobre os slugs esperados', () => {
    const slugs = Object.keys(SPECIES_TAGS).sort()
    expect(slugs).toEqual(
      ['exotica', 'forrageira', 'frutifera', 'madeireira', 'nativa', 'ornamental'].sort(),
    )
  })

  it('cada tag tem label, short e classes de cor', () => {
    for (const meta of Object.values(SPECIES_TAGS)) {
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.short.length).toBeGreaterThan(0)
      expect(meta.badge).toMatch(/bg-.+text-/)
    }
  })

  it('SPECIES_TAG_LIST bate com o catalogo (mesmos slugs e labels)', () => {
    expect(SPECIES_TAG_LIST).toHaveLength(Object.keys(SPECIES_TAGS).length)
    for (const { slug, label } of SPECIES_TAG_LIST) {
      expect(SPECIES_TAGS[slug as SpeciesTagSlug].label).toBe(label)
    }
  })
})

describe('species-tags — tagMeta', () => {
  it('retorna metadados para slug conhecido', () => {
    expect(tagMeta('nativa')).toEqual(SPECIES_TAGS.nativa)
  })

  it('retorna null para slug desconhecido (dados legados)', () => {
    expect(tagMeta('restauracao')).toBeNull()
    expect(tagMeta('')).toBeNull()
  })
})
