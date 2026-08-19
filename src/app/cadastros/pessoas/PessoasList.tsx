'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { matchesSearch } from '@/lib/text'
import { PARTY_ROLE_LABEL, type PartyListRow, type PartyRole } from '@/lib/parties'
import { PESSOA_ROLES } from '@/lib/modules'

interface Props {
  people: PartyListRow[]
  /** Papeis que este usuario pode ler — vem do servidor, nao se deduz aqui. */
  visibleRoles: PartyRole[]
  /** Papeis para os quais ele pode abrir cadastro novo. */
  creatableRoles: PartyRole[]
}

const maskDocument = (d: string): string =>
  d.length === 11
    ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : d.length === 14
      ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      : d

export default function PessoasList({ people, visibleRoles, creatableRoles }: Props) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<PartyRole | 'todos'>('todos')

  const opcoes = PESSOA_ROLES.filter((p) => visibleRoles.includes(p.role))
  const telaDoPapel = useMemo(
    () => new Map(PESSOA_ROLES.map((p) => [p.role, p.href] as const)),
    [],
  )

  // A busca do servidor ja filtrou; esta aqui refina sem ida ao banco, no mesmo
  // molde de ClientesManager. `matchesSearch` e tolerante a acento.
  const visiveis = people.filter((p) => {
    if (filtro !== 'todos' && !p.roles.includes(filtro)) return false
    if (!busca.trim()) return true
    const alvo = [p.name, p.document ?? '', p.phone ?? '', p.whatsapp ?? ''].join(' ')
    return matchesSearch(alvo, busca)
  })

  const novos = PESSOA_ROLES.filter(
    (p) => p.href && creatableRoles.includes(p.role),
  )

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">

      {novos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {novos.map(({ role, href, label }) => (
            <Link
              key={role}
              href={href as string}
              className="text-center font-semibold py-3 rounded-xl bg-green-600 text-white active:scale-95 transition-transform"
            >
              + {label.replace(/s$/, '')}
            </Link>
          ))}
        </div>
      )}

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou documento"
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
      />

      {opcoes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todos
          </Chip>
          {opcoes.map(({ role, label, icon }) => (
            <Chip key={role} ativo={filtro === role} onClick={() => setFiltro(role)}>
              {icon} {label}
            </Chip>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {visiveis.length} {visiveis.length === 1 ? 'pessoa' : 'pessoas'}
      </p>

      {visiveis.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-5 py-4">
          {filtro === 'funcionario'
            ? 'Nenhum funcionário cadastrado ainda — o cadastro de funcionário está por vir.'
            : 'Nenhuma pessoa encontrada.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((p) => (
            <li
              key={p.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3"
            >
              <Link
                href={`/cadastros/pessoas/${p.id}`}
                className="font-semibold text-gray-900 active:text-green-700"
              >
                {p.name}
              </Link>
              <p className="text-sm text-gray-500">
                {p.document ? maskDocument(p.document) : 'sem documento'}
                {p.whatsapp || p.phone ? ` · ${p.whatsapp || p.phone}` : ''}
              </p>
              {/* O NOME abre a ficha da pessoa (a identidade, com o historico
                  dos dois lados). O SELO abre a tela do papel, onde se editam os
                  campos daquele papel. Quem vende muda e tambem compra tem dois
                  selos e aparece uma vez so — o ponto da identidade unica. */}
              <div className="flex flex-wrap gap-2 mt-2">
                {p.roles.map((role) => {
                  const href = telaDoPapel.get(role) ?? null
                  const rotulo = PARTY_ROLE_LABEL[role] ?? role
                  const classe =
                    'text-xs px-2 py-1 rounded-full border font-medium'
                  return href ? (
                    <Link
                      key={role}
                      href={href}
                      className={`${classe} border-green-600 text-green-700 active:bg-green-50`}
                    >
                      {rotulo} →
                    </Link>
                  ) : (
                    <span
                      key={role}
                      className={`${classe} border-gray-300 text-gray-500`}
                    >
                      {rotulo}
                    </span>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap text-sm font-semibold px-4 py-2 rounded-full border-2 transition-colors ${
        ativo
          ? 'bg-green-600 border-green-600 text-white'
          : 'border-gray-300 text-gray-600 active:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}
