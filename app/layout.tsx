import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Orquesta OSS',
  description: 'Self-hosted AI prompt orchestration platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
