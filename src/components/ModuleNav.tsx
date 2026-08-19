'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface ModuleNavItem {
  href: string
  label: string
}

/**
 * Abas horizontais de um modulo. Nasceu como `admin/AdminNav.tsx` e foi
 * generalizada quando /admin deixou de ser o unico grupo de telas: hoje
 * Cadastros, Producao e Financeiro usam a mesma barra.
 *
 * O item so pode receber `href` que ja e guardado no destino — quem monta a
 * lista filtra por permissao antes (mesma politica de `src/app/page.tsx`).
 */
export default function ModuleNav({ items }: { items: ModuleNavItem[] }) {
  const pathname = usePathname()

  // Com uma aba so a barra nao ajuda a navegar, so ocupa altura de tela.
  if (items.length < 2) return null

  return (
    <nav className="bg-green-700 overflow-x-auto border-b border-green-600">
      <div className="flex min-w-max">
        {items.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-green-900 text-white border-b-2 border-white'
                  : 'text-green-100 hover:bg-green-600'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
