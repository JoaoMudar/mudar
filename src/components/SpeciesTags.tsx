import { tagMeta } from '@/lib/species-tags'

interface Props {
  /** Slugs de caracteristicas da especie (pode vir null/undefined). */
  tags: string[] | null | undefined
  /** 'sm' (padrao) para listas; 'xs' para espacos apertados (autocomplete). */
  size?: 'xs' | 'sm'
  className?: string
}

/**
 * Renderiza os badges coloridos das caracteristicas de uma especie.
 * Slugs desconhecidos (dados legados) sao ignorados silenciosamente.
 * Nao renderiza nada se nao houver tag.
 */
export default function SpeciesTags({ tags, size = 'sm', className }: Props) {
  if (!tags || tags.length === 0) return null
  const known = tags.map((t) => ({ slug: t, meta: tagMeta(t) })).filter((t) => t.meta !== null)
  if (known.length === 0) return null

  const sizeCls = size === 'xs' ? 'text-[10px] px-1 py-0' : 'text-[11px] px-1.5 py-0.5'

  return (
    <span className={`inline-flex flex-wrap gap-1 align-middle ${className ?? ''}`}>
      {known.map(({ slug, meta }) => (
        <span
          key={slug}
          title={meta!.label}
          className={`font-bold rounded ${sizeCls} ${meta!.badge}`}
        >
          {meta!.short}
        </span>
      ))}
    </span>
  )
}
