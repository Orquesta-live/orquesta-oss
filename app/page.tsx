import Link from 'next/link'
import {
  Terminal, Zap, Users, Shield, GitBranch, Activity,
  ArrowRight, Github, Wifi, FileCode, Server,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import TypingTerminal from '@/components/features/TypingTerminal'

const features = [
  {
    icon: Terminal,
    title: 'AI Agent Execution',
    description: 'Submit prompts from the dashboard, agent executes via Claude CLI on your machine with full system access.',
  },
  {
    icon: Wifi,
    title: 'Real-Time Streaming',
    description: 'Watch execution logs stream live via Socket.io. See tool calls, results, and errors as they happen.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite team members with role-based access. Everyone can submit prompts and see results in real time.',
  },
  {
    icon: FileCode,
    title: 'CLAUDE.md Sync',
    description: 'Define coding standards in the dashboard. They sync to your agent automatically before every execution.',
  },
  {
    icon: GitBranch,
    title: 'Git Commit Tracking',
    description: 'Every change the agent makes is tracked. See diffs, commit messages, and file changes per prompt.',
  },
  {
    icon: Activity,
    title: 'Cost & Token Tracking',
    description: 'Monitor token usage and estimated costs per prompt. Know exactly what each execution costs.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Install the Agent',
    desc: 'Run the agent on any machine — your laptop, a VM, a staging server. It connects to your Orquesta instance over Socket.io.',
    code: 'node agent/index.js --token oat_xxx',
  },
  {
    step: '02',
    title: 'Submit Prompts',
    desc: 'Your team submits prompts from the shared dashboard. The agent picks them up and executes via Claude CLI.',
    code: '"Fix the login bug in auth.ts"',
  },
  {
    step: '03',
    title: 'Track Everything',
    desc: 'Logs stream in real time. Git commits are tracked. Token usage and cost are recorded per prompt.',
    code: 'completed in 12s — 4,230 tokens',
  },
]

const outlineCta =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-base font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:border-zinc-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950'

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs uppercase tracking-[0.2em] text-green-400/80 font-mono">
      {children}
    </span>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-console text-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo href="/" size="md" />
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Orquesta-live/orquesta-oss"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link href="/signup">
              <Button variant="gradient" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-28 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-rise mb-7 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/[0.06] px-4 py-1.5 text-xs font-medium text-green-300 glow-accent">
              <Shield className="h-3.5 w-3.5 text-green-400" />
              Self-hosted · Open source · Your data stays yours
            </div>
            <h1 className="animate-rise text-5xl font-bold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              Run AI prompts on
              <br className="hidden sm:block" />{' '}
              <span className="text-gradient">your own machines</span>
            </h1>
            <p className="animate-rise mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-zinc-300 sm:text-xl">
              Install an agent on any machine. Submit prompts from a shared dashboard.
              Claude executes with full system access — and every run is logged, tracked, and yours.
            </p>
            <div className="animate-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button variant="gradient" size="lg" className="px-7">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a
                href="https://github.com/Orquesta-live/orquesta-oss"
                target="_blank"
                rel="noopener noreferrer"
                className={outlineCta}
              >
                <Github className="h-4 w-4" />
                View Source
              </a>
            </div>
          </div>

          {/* Self-typing terminal — the centerpiece */}
          <div className="animate-rise mx-auto mt-16 max-w-2xl">
            <TypingTerminal />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="mb-14 text-center">
            <Eyebrow>Platform</Eyebrow>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Everything you need</h2>
            <p className="mt-4 text-lg text-zinc-400">A complete platform for AI-assisted development.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="elevated card-glow group rounded-xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-600/10 text-green-400 ring-1 ring-inset ring-green-500/25 transition-colors group-hover:bg-green-600/20 group-hover:text-green-300">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="mb-14 text-center">
            <Eyebrow>Workflow</Eyebrow>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Install, prompt, logged</h2>
            <p className="mt-4 text-lg text-zinc-400">Three steps from clone to a fully tracked execution.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="elevated card-glow flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold text-gradient">{item.step}</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-green-500/40 to-transparent" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                <code className="mt-4 block truncate rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 font-mono text-xs text-green-300/90">
                  {item.code}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="glass elevated relative overflow-hidden rounded-2xl px-6 py-16 text-center">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative mx-auto max-w-xl">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-600/10 text-green-400 ring-1 ring-inset ring-green-500/25 glow-accent">
                <Server className="h-5 w-5" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Ready to <span className="text-gradient">orchestrate?</span>
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Free and open source. Self-host in minutes. Need more?{' '}
                <a
                  href="https://orquesta.live"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline-offset-4 hover:text-green-300 hover:underline"
                >
                  Orquesta Cloud
                </a>{' '}
                adds scheduled prompts, integrations, and analytics.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button variant="gradient" size="lg" className="px-7">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="https://orquesta.live"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={outlineCta}
                >
                  <Zap className="h-4 w-4 text-green-400" />
                  Orquesta Cloud
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 font-mono text-xs text-zinc-600 sm:flex-row">
          <span>Orquesta OSS · MIT License</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com/Orquesta-live/orquesta-oss" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
              GitHub
            </a>
            <a href="https://orquesta.live" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
              orquesta.live
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
