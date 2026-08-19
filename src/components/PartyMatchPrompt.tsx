'use client'

import { PARTY_ROLE_LABEL, type PartyMatch, type PartyRole } from '@/lib/parties'

// O rotulo e o do papel que a pessoa JA tem — quem esta sendo cadastrado agora
// e o outro. A tabela vive em `@/lib/parties` porque a lista de pessoas usa a
// mesma.
function listaDePapeis(roles: PartyRole[]): string {
  const nomes = roles.map((r) => PARTY_ROLE_LABEL[r] ?? r)
  if (nomes.length === 0) return 'outro cadastro'
  if (nomes.length === 1) return nomes[0]
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

interface Props {
  match: PartyMatch
  /** Sim, e a mesma pessoa — liga os dois papeis a uma identidade so. */
  onSame: () => void
  /** Nao, e outra pessoa — segue com cadastro proprio. */
  onDifferent: () => void
  disabled?: boolean
}

/**
 * Pergunta se o cadastro que esta sendo salvo e a mesma pessoa que ja existe em
 * outro papel — o fornecedor que tambem compra.
 *
 * Aparece **antes** de qualquer escrita: a Server Action devolveu `partyMatch` e
 * nao gravou nada. O sistema nunca une sozinho, nem quando o documento bate;
 * quem conhece as pessoas e quem responde.
 */
export default function PartyMatchPrompt({ match, onSame, onDifferent, disabled }: Props) {
  return (
    <div className="text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 space-y-2">
      <p className="font-semibold text-amber-800">
        “{match.name}” já está cadastrado como {listaDePapeis(match.roles)}.
      </p>
      <p className="text-xs text-amber-700">
        {match.matchedBy === 'document'
          ? 'O documento é o mesmo.'
          : 'O nome é igual, mas não há documento para confirmar.'}
        {!match.active && ' Esse cadastro está arquivado.'} É a mesma pessoa?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSame}
          disabled={disabled}
          className="btn-primary py-2 text-sm"
        >
          Sim, é a mesma pessoa
        </button>
        <button
          type="button"
          onClick={onDifferent}
          disabled={disabled}
          className="btn-secondary py-2 text-sm"
        >
          Não, é outra pessoa
        </button>
      </div>
    </div>
  )
}
