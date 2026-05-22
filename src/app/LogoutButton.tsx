'use client'

import { logoutAction } from './logout/actions'

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="text-xs text-green-300 hover:text-white underline"
      >
        Sair
      </button>
    </form>
  )
}
