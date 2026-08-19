import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { MODULES, ADMIN_LINKS, canLink, linkPermissions } from '@/lib/modules'
import { canAny } from '@/lib/permissions'
import LogoutButton from './LogoutButton'
import NotificationBell from '@/components/NotificationBell'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  chefia: 'Chefia',
  gerencia: 'Gerência',
  colaborador: 'Colaborador',
}

export default async function Home() {
  const user = await requireAuth()

  // Renderizacao, nao controle de acesso — o D4 §4 e explicito: esconder botao
  // nao protege nada, quem protege e o guard da acao. Isto aqui existe para o
  // usuario nao ver atalho que o levaria a uma tela da qual seria devolvido.
  // A permissao usada e a mesma que guarda a pagina de destino (ver
  // `src/lib/modules.ts`, que e a fonte unica desses links).
  const modules = MODULES.filter((m) => canAny(user, m.links.flatMap(linkPermissions)))
  const adminLinks = ADMIN_LINKS.filter((l) => canLink(user, l))

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

      <div className="px-4 py-6 space-y-3 max-w-lg mx-auto">

        {/* Os quatro modulos. O painel leva ao modulo; o modulo leva a tela.
            Dois toques, e o menu nao cresce a cada rotina nova. */}
        {modules.map(({ slug, title, icon, summary }) => (
          <Link
            key={slug}
            href={`/${slug}`}
            className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 active:bg-green-50"
          >
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="font-semibold text-gray-900 text-base">{title}</p>
              <p className="text-sm text-gray-500">{summary}</p>
            </div>
          </Link>
        ))}

        {/* Acesso — transversal, fora dos quatro modulos */}
        {adminLinks.length > 0 && (
          <section className="pt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Administração
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {adminLinks.map(({ href, label }) => (
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
        <section className="pt-5">
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
