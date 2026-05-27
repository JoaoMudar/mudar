import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TrocarSenhaForm from './TrocarSenhaForm'

export const metadata = { title: 'Trocar senha — Viveiro Mudar' }
export const dynamic = 'force-dynamic'

export default async function TrocarSenhaPage() {
  // getSession direto (sem requireAuth): esta tela precisa abrir mesmo com a
  // flag must_change_password ativa, que e o que requireAuth usaria para redirecionar.
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-green-800 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-green-300 text-xs uppercase tracking-widest font-semibold">
            Sistema
          </p>
          <h1 className="text-white text-2xl font-bold">Viveiro Mudar</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 text-center">
            {user.must_change_password ? 'Defina sua senha' : 'Trocar senha'}
          </h2>
          {user.must_change_password && (
            <p className="text-sm text-gray-500 text-center mb-5">
              Por segurança, crie uma senha pessoal antes de continuar.
            </p>
          )}
          <TrocarSenhaForm forced={user.must_change_password} />
        </div>
      </div>
    </main>
  )
}
