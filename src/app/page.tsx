import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import LogoutButton from './LogoutButton'
import NotificationBell from '@/components/NotificationBell'

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
  { href: '/admin/usuarios',        label: 'Usuários' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  chefia: 'Chefia',
  gerencia: 'Gerência',
  funcionario: 'Funcionário',
}

export default async function Home() {
  const user = await requireAuth()

  const showAdmin = user.role === 'admin' || user.role === 'chefia'
  const showPedidos =
    user.role === 'admin' || user.role === 'chefia' || user.role === 'gerencia'

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabecalho */}
      <header className="bg-green-800 text-white px-4 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-green-300 uppercase tracking-widest font-semibold">Sistema</p>
            <h1 className="text-xl font-bold">Viveiro Mudar</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-right flex flex-col items-end gap-1">
              <p className="text-sm text-green-100">
                Olá, <span className="font-semibold text-white">{user.display_name}</span>
              </p>
              <p className="text-xs text-green-400">{ROLE_LABELS[user.role]}</p>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-8 max-w-lg mx-auto">

        {/* Secao pedidos — visivel para admin, chefia e gerencia */}
        {showPedidos && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Pedidos
            </h2>
            <div className="space-y-3">
              <Link
                href="/pedidos"
                className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 active:bg-green-50"
              >
                <span className="text-3xl">🧾</span>
                <div>
                  <p className="font-semibold text-gray-900 text-base">Pedidos</p>
                  <p className="text-sm text-gray-500">Cadastrar, verificar e separar pedidos</p>
                </div>
              </Link>
              {/* Clientes — so admin/chefia; gerencia ve o cliente dentro do pedido, nao a aba */}
              {showAdmin && (
                <Link
                  href="/clientes"
                  className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 active:bg-green-50"
                >
                  <span className="text-3xl">👥</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-base">Clientes</p>
                    <p className="text-sm text-gray-500">Cadastrar e completar dados fiscais de clientes</p>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Secao operacoes */}
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

        {/* Secao admin — visivel para admin e chefia */}
        {showAdmin && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Administração
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_LINKS
                .filter((link) => {
                  if (link.href === '/admin/usuarios') return user.role === 'admin'
                  return true
                })
                .map(({ href, label }) => (
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
        )}

        {/* Secao conta — todos os usuarios logados */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Minha Conta
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/trocar-senha"
              className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 text-center active:bg-gray-100"
            >
              🔑 Trocar senha
            </Link>
            <Link
              href="/conta/sessoes"
              className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 text-center active:bg-gray-100"
            >
              📱 Aparelhos
            </Link>
          </div>
        </section>

      </div>
    </main>
  )
}
