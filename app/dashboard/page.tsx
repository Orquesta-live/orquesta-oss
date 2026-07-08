'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgentGrid } from '@/components/features/AgentGrid'
import dynamic from 'next/dynamic'
const AgentsView = dynamic(() => import('./agents/page'), { ssr: false })
import { useSocket } from '@/hooks/useSocket'
import { Plus, FolderOpen, Users, Zap, LogOut, Wifi, WifiOff, LayoutGrid, FolderKanban, Play, Loader2, Bot, Terminal } from 'lucide-react'
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
    if (sessionToken) return // Already have it
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
        await load() // reload in case of 409 (already seeded)
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

  return (
    <div className="min-h-screen bg-console">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <Image src="/logo-mark.png" alt="Orquesta" width={28} height={28} className="invert" priority />
            <span className="text-[15px] font-bold tracking-tight text-white">
              Orquesta <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-green-400/80">OSS</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    view === id
                      ? 'glow-accent bg-green-500/15 text-green-300 ring-1 ring-inset ring-green-500/40'
                      : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <Link href="/dashboard/terminal">
              <Button variant="gradient" size="sm">
                <Terminal className="h-4 w-4" /> Terminal
              </Button>
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Agent Grid view — show ALL agents at once ── */}
        {view === 'grid' && (
          <div className="space-y-6 animate-rise">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-green-400/80">Live infrastructure</p>
              <h1 className="mt-1.5 text-4xl font-bold tracking-tight text-white">Agent Grid</h1>
            </div>

            {/* Status bar */}
            <div className="glow-accent flex items-center gap-5 rounded-xl border border-green-500/20 bg-zinc-900/80 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                </span>
                <span className="text-sm font-semibold text-white"><span className="font-mono tabular-nums text-green-300">{projects.filter(p => p.agentOnline).length}</span> online</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                <span className="text-sm text-zinc-400"><span className="font-mono tabular-nums text-zinc-300">{projects.filter(p => !p.agentOnline).length}</span> offline</span>
              </div>
              <span className="ml-auto font-mono text-xs text-zinc-600">click an agent → interactive terminal</span>
            </div>

            {/* All agents grid — each project with agent is a card */}
            {projects.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 text-sm">No projects yet</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects
                  .sort((a, b) => (b.agentOnline ? 1 : 0) - (a.agentOnline ? 1 : 0))
                  .map(p => (
                  <div
                    key={p.id}
                    className={`card-glow elevated rounded-xl border overflow-hidden ${
                      p.agentOnline
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-zinc-800 bg-zinc-900/50'
                    }`}
                  >
                    {/* Agent header */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
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
                          className="flex items-center gap-1.5 rounded-md bg-green-600/20 border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/30 transition-colors"
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
              <div className="fixed inset-0 z-50 bg-zinc-950/95 flex flex-col">
                <div className="glass flex items-center justify-between border-x-0 border-t-0 px-4 py-3">
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
                    className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:outline-none"
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

        {/* ── Agents view ── */}
        {view === 'agents' && (
          <AgentsView />
        )}

        {/* ── Projects view ── */}
        {view === 'projects' && (
          <div className="animate-rise">
            <div className="flex items-end justify-between mb-7">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-green-400/80">Workspace</p>
                <h1 className="mt-1.5 text-4xl font-bold tracking-tight text-white">Projects</h1>
                <p className="mt-1.5 font-mono text-xs text-zinc-500">
                  <span className="tabular-nums text-zinc-300">{projects.length}</span> project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)} variant="gradient">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </div>

            {/* Create project modal */}
            {showCreate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="glass animate-rise w-full max-w-md rounded-2xl p-6">
                  <h2 className="mb-5 text-xl font-bold tracking-tight text-white">New Project</h2>
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

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-xl border border-zinc-800/60 bg-zinc-900 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="elevated flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 py-24 text-center">
                <div className="glow-accent mb-5 rounded-2xl border border-green-500/25 bg-green-500/10 p-5">
                  <FolderOpen className="h-9 w-9 text-green-400" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-white">Welcome to Orquesta</p>
                <p className="mt-2 text-sm text-zinc-500 max-w-sm">
                  Create a project and connect an agent, or try the demo to see what it looks like in action.
                </p>
                <div className="mt-7 flex items-center gap-3">
                  <Button onClick={seedDemo} variant="outline" loading={seedingDemo}>
                    <Play className="h-4 w-4" /> Try the Demo
                  </Button>
                  <Button onClick={() => setShowCreate(true)} variant="gradient">
                    <Plus className="h-4 w-4" /> Create Project
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                    <Card className="card-glow h-full cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{p.name}</CardTitle>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.agentOnline ? (
                              <Wifi className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <WifiOff className="h-3.5 w-3.5 text-zinc-600" />
                            )}
                            <Badge variant={p.role === 'owner' ? 'green' : 'default'} className="text-[10px]">
                              {p.role}
                            </Badge>
                          </div>
                        </div>
                        {p.description && (
                          <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-green-500/70" /> <span className="font-mono tabular-nums text-zinc-300">{p.promptCount}</span> prompts
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-zinc-500" /> <span className="font-mono tabular-nums text-zinc-300">{p.memberCount}</span> members
                          </span>
                        </div>
                        <p className="mt-2.5 font-mono text-[11px] text-zinc-600">{formatRelative(p.createdAt)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
