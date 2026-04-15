import Link from 'next/link'

const WORKER_LINKS = [
  {
    href: '/insumos/registrar',
    label: 'Registrar Insumo',
    icon: '📦',
    desc: 'Lançar compra ou uso de insumo',
  },
]

const ADMIN_LINKS = [
  { href: '/admin/especies',        label: 'Espécies' },
  { href: '/admin/recipientes',     label: 'Recipientes' },
  { href: '/admin/insumos',         label: 'Insumos' },
  { href: '/admin/custos-fixos',    label: 'Custos Fixos' },
  { href: '/admin/coleta-sementes', label: 'Coleta Sementes' },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-green-800 text-white px-4 py-5">
        <p className="text-xs text-green-300 uppercase tracking-widest font-semibold">Sistema</p>
        <h1 className="text-xl font-bold">Viveiro Mudar</h1>
      </header>

      <div className="px-4 py-6 space-y-8 max-w-lg mx-auto">

        {/* Seção operários */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Operações de Campo
          </h2>
          <div className="space-y-3">
            {WORKER_LINKS.map(({ href, label, icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 active:bg-green-50"
              >
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-base">{label}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Seção admin */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Administração
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {ADMIN_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 text-center active:bg-gray-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
