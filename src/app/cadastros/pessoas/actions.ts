'use server'

import pool from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can, type Actor } from '@/lib/permissions'
import { listParties, type PartyListRow, type PartyRole } from '@/lib/parties'
import { PESSOA_ROLES } from '@/lib/modules'

/**
 * Papeis que este usuario pode ler. Funcao PURA — a sessao entra por parametro.
 *
 * Existe porque a leitura nao e uniforme: `cliente:ler` e de chefia, gerencia e
 * admin, mas `fornecedor:ler` e so de chefia e admin (D4 §2). Uma lista unica
 * de pessoas sem este recorte faria a gerencia enxergar a rede de fornecedores
 * de graca.
 *
 * O `can()` fica repetido no corpo de cada action de proposito: guard escondido
 * atras de helper e invisivel para `authz-cobertura.test.ts`, e foi assim que o
 * `registrarUso` passou anos sem checagem de papel.
 */
function papeisLegiveis(user: Actor): PartyRole[] {
  return PESSOA_ROLES.filter((p) => can(user, p.readPermission)).map((p) => p.role)
}

/**
 * Lista as pessoas por identidade, opcionalmente filtrando por um papel.
 *
 * O `role` vem da tela e por isso e tratado como pedido, nao como autorizacao:
 * ele so pode ESTREITAR a lista de papeis legiveis. Pedir `fornecedor` sem ter
 * `fornecedor:ler` devolve vazio, nunca a rede inteira.
 */
export async function getPeople(search?: string, role?: PartyRole): Promise<PartyListRow[]> {
  const user = await requireAuth()
  const legiveis = PESSOA_ROLES.filter((p) => can(user, p.readPermission)).map((p) => p.role)

  const alvo = role ? legiveis.filter((r) => r === role) : legiveis
  if (alvo.length === 0) return []

  return listParties(pool, { roles: alvo, search: search ?? null })
}

/** Os filtros que a tela pode mostrar — os mesmos papeis que ela pode ler. */
export async function getVisibleRoles(): Promise<PartyRole[]> {
  const user = await requireAuth()
  return papeisLegiveis(user)
}
