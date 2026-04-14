'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/especies',        label: 'Espécies' },
  { href: '/admin/recipientes',     label: 'Recipientes' },
  { href: '/admin/insumos',         label: 'Insumos' },
  { href: '/admin/custos-fixos',    label: 'Custos Fixos' },
  { href: '/admin/coleta-sementes', label: 'Coleta Sementes' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-green-700 overflow-x-auto border-b border-green-600">
      <div className="flex min-w-max">
        {NAV.map(({ href, label }) => {
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
