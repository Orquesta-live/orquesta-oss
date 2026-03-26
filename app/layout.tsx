import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Orquesta OSS — Self-hosted AI Prompt Orchestration',
  description: 'Install an agent on any machine. Submit prompts from a shared dashboard. Claude executes with full system access. Everything is logged.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
