'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { changeOwnPassword, type ChangePasswordState } from './actions'

const initial: ChangePasswordState = { error: null }

export default function TrocarSenhaForm({ forced }: { forced: boolean }) {
  const [state, formAction, isPending] = useActionState(changeOwnPassword, initial)

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="text-red-600 text-sm font-medium text-center bg-red-50 rounded-xl px-4 py-3">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="current_password" className="label">
          Senha atual
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className="input mt-1"
        />
      </div>

      <div>
        <label htmlFor="new_password" className="label">
          Nova senha
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input mt-1"
        />
        <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres.</p>
      </div>

      <div>
        <label htmlFor="confirm_password" className="label">
          Confirmar nova senha
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input mt-1"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? 'Salvando...' : 'Salvar nova senha'}
      </button>

      {!forced && (
        <Link
          href="/"
          className="block text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </Link>
      )}
    </form>
  )
}
