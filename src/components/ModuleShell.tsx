import Link from 'next/link'
import ModuleNav, { type ModuleNavItem } from './ModuleNav'

/**
 * Moldura comum dos modulos (Cadastros, Producao, Comercial, Financeiro,
 * Administracao): cabecalho verde com volta para o painel e as abas do modulo.
 *
 * E so apresentacao. A guarda de acesso fica no `layout.tsx` de cada modulo,
 * onde ela pode ser `await`-ada antes de qualquer render.
 */
export default function ModuleShell({
  title,
  items,
  children,
}: {
  title: string
  items: ModuleNavItem[]
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href="/" className="text-xs text-green-300 hover:text-white mb-1 inline-block">
          ← Início
        </Link>
        <p className="text-xs text-green-300 uppercase tracking-widest font-semibold">Viveiro Mudar</p>
        <h1 className="text-lg font-bold leading-tight">{title}</h1>
      </header>
      <ModuleNav items={items} />
      <main>{children}</main>
    </div>
  )
}
