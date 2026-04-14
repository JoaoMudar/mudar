import AdminNav from './AdminNav'

export const metadata = { title: 'Admin — Viveiro Mudar' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <p className="text-xs text-green-300 uppercase tracking-widest font-semibold">Viveiro Mudar</p>
        <h1 className="text-lg font-bold leading-tight">Administração</h1>
      </header>
      <AdminNav />
      <main>{children}</main>
    </div>
  )
}
