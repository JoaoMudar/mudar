import Link from 'next/link'
import type { ModuleLink } from '@/lib/modules'

/**
 * Lista de atalhos de um modulo, no formato de cartao que o painel ja usa —
 * alvo grande, um por linha, legivel de relance no celular.
 *
 * Recebe a lista JA filtrada por permissao. Filtrar aqui dentro esconderia a
 * regra num componente de apresentacao; ela pertence a quem monta a pagina.
 */
export default function ModuleLinkList({ links }: { links: ModuleLink[] }) {
  if (links.length === 0) {
    return (
      <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-5 py-4">
        Nenhuma tela disponível para o seu perfil neste módulo.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {links.map(({ href, label, desc, icon }) => (
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
  )
}
