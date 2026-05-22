import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export const metadata = { title: 'Entrar — Viveiro Mudar' }

export default async function LoginPage() {
  const user = await getSession()
  if (user) redirect('/')

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
          <h2 className="text-lg font-bold text-gray-800 mb-5 text-center">
            Entrar
          </h2>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
