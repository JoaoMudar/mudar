// Guards de autorizacao. Depende de sessao, entao vive separado de
// `@/lib/permissions.ts`, que e puro e pode ir para o cliente.
//
// Sao dois guards porque existem dois contextos de falha, e usar o errado
// produz bug sutil:
//
//   requirePermission -> redireciona. Certo em pagina/Server Component.
//   authorize         -> devolve { error }. Certo em Server Action chamada de
//                        client component, onde um redirect chegaria ao
//                        cliente como NEXT_REDIRECT em vez de mensagem.
import { redirect } from 'next/navigation'
import { getSession, requireAuth, type User } from '@/lib/auth'
import {
  can,
  canAny,
  denialMessage,
  type Permission,
  type PermissionSubject,
} from '@/lib/permissions'

type SubjectArgs<P extends Permission> = P extends keyof PermissionSubject
  ? [subject: PermissionSubject[P]]
  : []

/**
 * Paginas e loaders chamados de Server Component. Nega redirecionando para a
 * raiz — o usuario cai numa tela que existe para ele, em vez de ver erro.
 */
export async function requirePermission<P extends Permission>(
  permission: P,
  ...args: SubjectArgs<P>
): Promise<User> {
  const user = await requireAuth() // ja cobre login ausente e troca de senha
  if (!can(user, permission, ...args)) redirect('/')
  return user
}

/**
 * Portao de subarvore (ex.: src/app/admin/layout.tsx), onde o layout cobre
 * varias telas com permissoes diferentes: basta poder alguma coisa ali dentro.
 * A tela especifica ainda checa a sua propria permissao.
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<User> {
  const user = await requireAuth()
  if (!canAny(user, permissions)) redirect('/')
  return user
}

// O discriminante e `ok`, e nao `error`. Testar `if (auth.error)` NAO estreita
// o tipo: `error: string` admite `''`, que e falsy, entao o ramo falso nao
// elimina `Denied` e `auth.user` continua possivelmente undefined. Com `ok`
// literal a inferencia e exata.
export type Authorized = { ok: true; user: User; error?: undefined }
export type Denied = { ok: false; user?: undefined; error: string }

/**
 * Server Actions.
 *
 *     const auth = await authorize('pedido_aprovacao:atualizar')
 *     if (!auth.ok) return { error: auth.error }
 *     auth.user.id  // tipado como User
 */
export async function authorize<P extends Permission>(
  permission: P,
  ...args: SubjectArgs<P>
): Promise<Authorized | Denied> {
  const user = await getSession()
  if (!user) return { ok: false, error: 'Sessão expirada. Faça login novamente.' }
  if (user.must_change_password) {
    return { ok: false, error: 'Troque sua senha antes de continuar.' }
  }
  if (!can(user, permission, ...args)) {
    return { ok: false, error: denialMessage(permission) }
  }
  return { ok: true, user }
}
