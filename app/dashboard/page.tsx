'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AgentGrid } from '@/components/features/AgentGrid'
import dynamic from 'next/dynamic'
const AgentsView = dynamic(() => import('./agents/page'), { ssr: false })
import { useSocket } from '@/hooks/useSocket'
import { Plus, FolderOpen, Users, Zap, LogOut, Wifi, WifiOff, LayoutGrid, FolderKanban, Play, Bot, Terminal, Activity, ArrowUpRight, Sparkles } from 'lucide-react'
import { formatRelative } from '@/lib/utils'

interface Project {
  id: string
  name: string
  description?: string
  role: string
  agentOnline: boolean
  promptCount: number
  memberCount: number
  tokenCount: number
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [seedingDemo, setSeedingDemo] = useState(false)

  // Dashboard view toggle
  const [view, setView] = useState<'projects' | 'grid' | 'agents'>('projects')

  // For grid view — project picker + socket
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [sessionToken, setSessionToken] = useState('')

  // Always call useSocket (never conditional) — only joins when both are set
  const { socket } = useSocket({ projectId: selectedProjectId, sessionToken })

  const load = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.status === 401) { router.push('/login'); return }
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Fetch session token once (needed for socket auth)
  useEffect(() => {
    fetch('/api/auth/get-session').then(r => r.json()).then(data => {
      setSessionToken(data.session?.token || '')
    }).catch(() => {})
  }, [])

  const fetchSessionToken = async (projectId: string) => {
    if (sessionToken) return
    try {
      const r = await fetch('/api/auth/get-session')
      const data = await r.json()
      setSessionToken(data.session?.token || '')
    } catch {}
  }

  const createProject = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setName('')
      setDescription('')
      setShowCreate(false)
      router.push(`/dashboard/projects/${data.project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  const seedDemo = async () => {
    setSeedingDemo(true)
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        router.push(`/dashboard/projects/${data.projectId}`)
      } else {
        await load()
      }
    } catch {
      setSeedingDemo(false)
    }
  }

  const signOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/login')
  }

  const navItems = [
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
    { id: 'grid' as const, label: 'Grid', icon: LayoutGrid },
    { id: 'agents' as const, label: 'Agents', icon: Bot },
  ]

  // Stats
  const onlineAgents = projects.filter(p => p.agentOnline).length
  const totalPrompts = projects.reduce((sum, p) => sum + p.promptCount, 0)

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* ══════════════════════════════════════════════════════════════════════
          HEADER — Glassmorphism sticky nav
          ══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          {/* Logo + Brand */}
          <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="relative">
              <Image src="/logo-mark.png" alt="Orquesta" width={30} height={30} className="invert" priority />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-2 ring-[#09090b]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-white">Orquesta</span>
              <span className="rounded-md bg-green-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-green-400 ring-1 ring-inset ring-green-500/25">
                OSS
              </span>
            </div>
          </Link>

          {/* Center — Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  view === id
                    ? 'bg-green-500/15 text-green-300 shadow-sm shadow-green-500/10 ring-1 ring-inset ring-green-500/30'
                    : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>

          {/* Right — Actions */}
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:4000"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-green-900/30 transition-all duration-200 hover:from-green-500 hover:to-emerald-500 hover:shadow-green-800/40 hover:scale-[1.02]"
            >
              <Terminal className="h-3.5 w-3.5" />
              Open Terminal
              <ArrowUpRight className="h-3 w-3 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition-all hover:bg-zinc-800/60 hover:text-zinc-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* ══════════════════════════════════════════════════════════════════════
            HERO / STATS — Welcome section with key metrics
            ══════════════════════════════════════════════════════════════════════ */}
        {view === 'projects' && !loading && (
          <div className="mb-8 animate-rise">
            {/* Welcome + Stats row */}
            <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-green-400/70">Dashboard</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Welcome back
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Manage your projects, monitor agents, and orchestrate AI workflows.
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)} variant="gradient" size="default">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/70">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Projects</p>
                    <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-white">{projects.length}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-800/80 p-2.5">
                    <FolderKanban className="h-5 w-5 text-zinc-400" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all duration-300 hover:border-green-500/30 hover:bg-zinc-900/70">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Agents Online</p>
                    <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-green-400">{onlineAgents}</p>
                  </div>
                  <div className="relative rounded-lg bg-green-500/10 p-2.5">
                    <Activity className="h-5 w-5 text-green-400" />
                    {onlineAgents > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/70">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Total Prompts</p>
                    <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-white">{totalPrompts.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-800/80 p-2.5">
                    <Zap className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            CREATE PROJECT MODAL
            ══════════════════════════════════════════════════════════════════════ */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="animate-rise w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">New Project</h2>
              </div>
              <form onSubmit={createProject} className="space-y-4">
                <Input
                  label="Name"
                  id="proj-name"
                  placeholder="My AI Project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Description (optional)"
                  id="proj-desc"
                  placeholder="What will this project do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gradient" loading={creating} disabled={!name.trim()}>
                    Create Project
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PROJECTS VIEW — Premium project cards
            ══════════════════════════════════════════════════════════════════════ */}
        {view === 'projects' && (
          <div className="animate-rise">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 rounded-xl border border-zinc-800/60 bg-zinc-900/40 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              /* Empty state */
              <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 py-20 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent" />
                <div className="relative">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10 shadow-lg shadow-green-900/20">
                    <FolderOpen className="h-8 w-8 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight text-white">Welcome to Orquesta</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                    Create a project and connect an agent, or try the demo to see what it looks like in action.
                  </p>
                  <div className="mt-7 flex items-center justify-center gap-3">
                    <Button onClick={seedDemo} variant="outline" loading={seedingDemo}>
                      <Play className="h-4 w-4" /> Try the Demo
                    </Button>
                    <Button onClick={() => setShowCreate(true)} variant="gradient">
                      <Plus className="h-4 w-4" /> Create Project
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Project cards grid */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="group">
                    <div className="relative h-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all duration-300 hover:border-zinc-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30">
                      {/* Subtle gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      <div className="relative">
                        {/* Top row: title + status */}
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-semibold text-white group-hover:text-green-50 transition-colors">
                            {p.name}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Animated status dot */}
                            <span className="relative flex h-2.5 w-2.5">
                              {p.agentOnline ? (
                                <>
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />
                                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                                </>
                              ) : (
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-zinc-600" />
                              )}
                            </span>
                            <Badge variant={p.role === 'owner' ? 'green' : 'default'} className="text-[10px]">
                              {p.role}
                            </Badge>
                          </div>
                        </div>

                        {/* Description */}
                        {p.description && (
                          <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{p.description}</p>
                        )}

                        {/* Stats row */}
                        <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-green-500/60" />
                            <span className="font-mono tabular-nums text-zinc-300">{p.promptCount}</span> prompts
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="font-mono tabular-nums text-zinc-300">{p.memberCount}</span> members
                          </span>
                        </div>

                        {/* Footer with date + agent status text */}
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-800/60 pt-3">
                          <span className="font-mono text-[11px] text-zinc-600">{formatRelative(p.createdAt)}</span>
                          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${p.agentOnline ? 'text-green-400' : 'text-zinc-600'}`}>
                            {p.agentOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            {p.agentOnline ? 'Agent online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            GRID VIEW — Live agent infrastructure
            ══════════════════════════════════════════════════════════════════════ */}
        {view === 'grid' && (
          <div className="space-y-6 animate-rise">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-green-400/80">Live infrastructure</p>
              <h1 className="mt-1.5 text-4xl font-bold tracking-tight text-white">Agent Grid</h1>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-5 rounded-xl border border-green-500/20 bg-zinc-900/80 px-5 py-3.5 shadow-sm shadow-green-900/10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                </span>
                <span className="text-sm font-semibold text-white">
                  <span className="font-mono tabular-nums text-green-300">{projects.filter(p => p.agentOnline).length}</span> online
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                <span className="text-sm text-zinc-400">
                  <span className="font-mono tabular-nums text-zinc-300">{projects.filter(p => !p.agentOnline).length}</span> offline
                </span>
              </div>
              <span className="ml-auto font-mono text-xs text-zinc-600">click an agent → interactive terminal</span>
            </div>

            {/* All agents grid */}
            {projects.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 text-sm">No projects yet</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects
                  .sort((a, b) => (b.agentOnline ? 1 : 0) - (a.agentOnline ? 1 : 0))
                  .map(p => (
                  <div
                    key={p.id}
                    className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5 ${
                      p.agentOnline
                        ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/20'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    {/* Agent header */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          p.agentOnline ? 'bg-green-500/20' : 'bg-zinc-800'
                        }`}>
                          {p.agentOnline
                            ? <Wifi className="h-3.5 w-3.5 text-green-400" />
                            : <WifiOff className="h-3.5 w-3.5 text-zinc-500" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-zinc-500">{p.promptCount} prompts &middot; {p.memberCount} members</p>
                        </div>
                      </div>
                      <Badge variant={p.agentOnline ? 'green' : 'default'} className="text-[10px] shrink-0">
                        {p.agentOnline ? 'online' : 'offline'}
                      </Badge>
                    </div>

                    {/* Terminal / Actions */}
                    {p.agentOnline ? (
                      <div className="border-t border-green-500/20 px-4 py-2.5 flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedProjectId(p.id); fetchSessionToken(p.id) }}
                          className="flex items-center gap-1.5 rounded-md bg-green-600/20 border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/30 transition-all duration-200"
                        >
                          <LayoutGrid className="h-3 w-3" /> Open Terminal
                        </button>
                        <Link
                          href={`/dashboard/projects/${p.id}`}
                          className="text-[11px] text-zinc-500 hover:text-white transition-colors ml-auto"
                        >
                          Dashboard &rarr;
                        </Link>
                      </div>
                    ) : (
                      <div className="border-t border-zinc-800 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-[11px] text-zinc-600">Agent not connected</span>
                        <Link
                          href={`/dashboard/projects/${p.id}`}
                          className="text-[11px] text-zinc-500 hover:text-white transition-colors ml-auto"
                        >
                          Settings &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Terminal view — when a project is selected */}
            {selectedProjectId && (
              <div className="fixed inset-0 z-50 bg-[#09090b]/95 backdrop-blur-sm flex flex-col">
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedProjectId('')}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      &larr; Close
                    </button>
                    <span className="text-sm font-semibold text-white">
                      {projects.find(p => p.id === selectedProjectId)?.name}
                    </span>
                    <Badge variant="green" className="text-[10px]">Interactive Session</Badge>
                  </div>
                  <select
                    value={selectedProjectId}
                    onChange={e => { setSelectedProjectId(e.target.value); fetchSessionToken(e.target.value) }}
                    className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/50"
                  >
                    {projects.filter(p => p.agentOnline).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <AgentGrid socket={socket} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            AGENTS VIEW
            ══════════════════════════════════════════════════════════════════════ */}
        {view === 'agents' && (
          <AgentsView />
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-zinc-600">
              Orquesta OSS v0.3.0
            </span>
            <span className="text-zinc-800">|</span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
              <span className="relative flex h-1.5 w-1.5">
                {onlineAgents > 0 && <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-green-500 opacity-60" />}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${onlineAgents > 0 ? 'bg-green-500' : 'bg-zinc-600'}`} />
              </span>
              {onlineAgents} agent{onlineAgents !== 1 ? 's' : ''} connected
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/orquesta"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
            >
              GitHub
            </a>
            <a
              href="https://docs.orquesta.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Docs
            </a>
            <a
              href="http://localhost:4000"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Terminal
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
