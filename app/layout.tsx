import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Orquesta OSS — Self-hosted AI Prompt Orchestration',
  description: 'Install an agent on any machine. Submit prompts from a shared dashboard. Claude executes with full system access. Everything is logged.',
  // Icons are handled by the app-directory file convention:
  // app/favicon.ico (multi-size) + app/icon.svg (vector). No manual config needed.
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
