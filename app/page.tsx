import Link from 'next/link'
import Image from 'next/image'
import {
  Terminal, Zap, Users, Shield, GitBranch, Activity,
  ArrowRight, Github, Wifi, FileCode,
} from 'lucide-react'

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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <header className="border-b border-zinc-800/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Orquesta" width={32} height={32} priority />
            <span className="font-semibold">Orquesta <span className="text-zinc-500 font-normal">OSS</span></span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Orquesta-live/orquesta-oss"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs text-zinc-400">
            <Shield className="h-3.5 w-3.5 text-green-500" />
            Self-hosted &middot; Open source &middot; Your data stays yours
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            AI Prompt Orchestration
            <br />
            <span className="text-green-500">for Your Team</span>
          </h1>
          <p className="mt-5 text-lg text-zinc-400 leading-relaxed">
            Install an agent on any machine. Submit prompts from a shared dashboard.
            Claude executes with full system access. Everything is logged and tracked.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-500 transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Orquesta-live/orquesta-oss"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Github className="h-4 w-4" />
              View Source
            </a>
          </div>
        </div>

        {/* Quick start */}
        <div className="mt-16 mx-auto max-w-xl">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-medium text-zinc-400 mb-3">Quick Start</p>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-500 select-none">$</span>
                <span className="text-zinc-300">git clone https://github.com/Orquesta-live/orquesta-oss && cd orquesta-oss</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 select-none">$</span>
                <span className="text-zinc-300">docker compose up</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-zinc-600 select-none">#</span>
                <span className="text-zinc-500">Open http://localhost:3000 and create your first project</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">Everything you need</h2>
            <p className="mt-2 text-zinc-400">A complete platform for AI-assisted development</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600/10 text-green-500">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold mb-12">How it works</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Install the Agent',
                desc: 'Run the agent on any machine — your laptop, a VM, a staging server. It connects to your Orquesta instance via Socket.io.',
                code: 'node agent/index.js --token oat_xxx',
              },
              {
                step: '2',
                title: 'Submit Prompts',
                desc: 'Your team submits prompts from the dashboard. The agent picks them up and executes via Claude CLI.',
                code: '"Fix the login bug in auth.ts"',
              },
              {
                step: '3',
                title: 'Track Everything',
                desc: 'Logs stream in real time. Git commits are tracked. Token usage and costs are recorded per prompt.',
                code: 'completed in 12s — 4,230 tokens',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.desc}</p>
                <code className="mt-3 inline-block rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
                  {item.code}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">Ready to orchestrate?</h2>
          <p className="mt-2 text-zinc-400">
            Free and open source. Self-host in minutes.
            <br />
            Need more? <a href="https://orquesta.live" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400">Orquesta Cloud</a> adds
            scheduled prompts, integrations, analytics, and more.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-500 transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://orquesta.live"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Zap className="h-4 w-4 text-green-500" />
              Orquesta Cloud
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8">
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between text-xs text-zinc-600">
          <span>Orquesta OSS &middot; MIT License</span>
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
