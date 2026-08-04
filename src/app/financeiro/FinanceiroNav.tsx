'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/financeiro',                label: 'Visão geral', exato: true },
  { href: '/financeiro/mensal',         label: 'Mês a mês' },
  { href: '/financeiro/custos',         label: 'Custos' },
  { href: '/financeiro/vendas',         label: 'Vendas' },
  { href: '/financeiro/clientes',       label: 'Clientes' },
  { href: '/financeiro/despesas',       label: 'Lançar' },
  { href: '/financeiro/preenchimento',  label: 'Preenchimento' },
  { href: '/financeiro/pendencias',     label: 'Pendências' },
  { href: '/financeiro/qualidade',      label: 'Qualidade' },
]

export default function FinanceiroNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-green-700 overflow-x-auto border-b border-green-600">
      <div className="flex min-w-max">
        {NAV.map(({ href, label, exato }) => {
          // "Visão geral" e a raiz do modulo: sem `exato` ela ficaria ativa em
          // todas as sub-rotas.
          const active = exato ? pathname === href : pathname.startsWith(href)
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
