'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'

const initial: LoginState = { error: null }

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initial)

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="text-red-600 text-sm font-medium text-center bg-red-50 rounded-xl px-4 py-3">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="username" className="label">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="input mt-1"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input mt-1"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
