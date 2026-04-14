import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Viveiro Mudar',
  description: 'Sistema de gestão do Viveiro Mudar',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
