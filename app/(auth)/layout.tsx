import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Terminal, GitBranch, Boxes } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-console grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── Form panel ─────────────────────────────────────────── */}
      <div className="relative flex flex-col px-6 py-8 sm:px-10">
        <header className="flex items-center justify-between">
          <Logo size="md" href="/" />
          <Link
            href="https://github.com/Orquesta-live/orquesta-oss"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            GitHub
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>

        <footer className="font-mono text-xs text-zinc-600">
          <span className="text-zinc-500">Orquesta OSS</span>
          <span className="mx-2 text-zinc-700">/</span>
          <span>Prompt to Production</span>
        </footer>
      </div>

      {/* ── Console hero (hidden on small screens) ─────────────── */}
      <aside className="relative hidden overflow-hidden border-l border-zinc-800 lg:block">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="relative flex h-full flex-col justify-center px-12 xl:px-16">
          <p className="mb-4 font-mono text-xs uppercase tracking-wider text-zinc-500">
            Developer console
          </p>
          <h2 className="max-w-md text-3xl font-bold leading-tight text-white text-balance">
            Ship software with AI, keep every prompt on the record.
          </h2>
          <p className="mt-4 max-w-md text-zinc-400">
            Agents run on your machines, your team submits prompts, and every run
            is logged, versioned, and auditable.
          </p>

          {/* Faux terminal */}
          <div className="elevated mt-10 max-w-md overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="ml-2 font-mono text-xs text-zinc-500">
                orquesta — agent
              </span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-400">
              <span className="text-zinc-600">$ </span>
              <span className="text-zinc-200">orquesta-agent init</span>
              {'\n'}
              <span className="text-green-500">✓</span> connected to workspace
              {'\n'}
              <span className="text-green-500">✓</span> streaming logs to dashboard
              {'\n'}
              <span className="text-zinc-600">$ </span>
              <span className="text-zinc-200">run </span>
              <span className="text-zinc-400">&quot;refactor auth flow&quot;</span>
              <span className="ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-green-500" />
            </pre>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 font-mono text-xs text-zinc-500">
            <li className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-green-500" aria-hidden />
              Local agents
            </li>
            <li className="flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5 text-green-500" aria-hidden />
              Versioned prompts
            </li>
            <li className="flex items-center gap-2">
              <Boxes className="h-3.5 w-3.5 text-green-500" aria-hidden />
              Full audit trail
            </li>
          </ul>
        </div>
      </aside>
    </div>
  )
}
