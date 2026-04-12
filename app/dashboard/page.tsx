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
import { Plus, FolderOpen, Users, Zap, LogOut, Wifi, WifiOff, LayoutGrid, FolderKanban, Play, Loader2, Bot } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <Image src="/logo-mark.png" alt="Orquesta" width={28} height={28} className="invert" priority />
            <span className="font-semibold text-white">Orquesta <span className="text-zinc-500 font-normal">OSS</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 p-1">
              <button
                onClick={() => setView('projects')}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === 'projects' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FolderKanban className="h-3.5 w-3.5" />
                Projects
              </button>
              <button
                onClick={() => setView('grid')}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </button>
              <button
                onClick={() => setView('agents')}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === 'agents' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                Agents
              </button>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Agent Grid view ── */}
        {view === 'grid' && (
          <div className="space-y-4">
            {!selectedProjectId ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Agent Grid</h1>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {projects.filter(p => p.agentOnline).length} online &middot; {projects.length} total
                    </p>
                  </div>
                </div>

                {/* Status summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
                    <p className="text-2xl font-bold text-white">{projects.length}</p>
                    <p className="text-xs text-zinc-500">Projects</p>
                  </div>
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{projects.filter(p => p.agentOnline).length}</p>
                    <p className="text-xs text-zinc-500">Online</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
                    <p className="text-2xl font-bold text-zinc-400">{projects.filter(p => !p.agentOnline).length}</p>
                    <p className="text-xs text-zinc-500">Offline</p>
                  </div>
                </div>

                {/* Project grid — click to open terminal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projects
                    .sort((a, b) => (b.agentOnline ? 1 : 0) - (a.agentOnline ? 1 : 0))
                    .map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProjectId(p.id); fetchSessionToken(p.id) }}
                      className={`text-left rounded-xl border p-4 transition-all hover:bg-zinc-800/50 ${
                        p.agentOnline
                          ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                          : 'border-zinc-800 bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">{p.name}</span>
                        <div className="flex items-center gap-1.5">
                          {p.agentOnline
                            ? <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-[10px] text-green-400">online</span></>
                            : <><span className="w-2 h-2 rounded-full bg-zinc-600" /><span className="text-[10px] text-zinc-500">offline</span></>
                          }
                        </div>
                      </div>
                      {p.description && <p className="text-xs text-zinc-500 line-clamp-1 mb-2">{p.description}</p>}
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                        <span><Zap className="inline h-3 w-3 mr-0.5" />{p.promptCount} prompts</span>
                        <span><Users className="inline h-3 w-3 mr-0.5" />{p.memberCount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedProjectId('')}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    &larr; Back
                  </button>
                  <h1 className="text-lg font-semibold text-white">
                    {projects.find(p => p.id === selectedProjectId)?.name || 'Terminal'}
                  </h1>
                  <select
                    value={selectedProjectId}
                    onChange={e => { setSelectedProjectId(e.target.value); fetchSessionToken(e.target.value) }}
                    className="ml-auto rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <AgentGrid socket={socket} />
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
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Projects</h1>
                <p className="mt-0.5 text-sm text-zinc-400">
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)} size="sm">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </div>

            {/* Create project modal */}
            {showCreate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                  <h2 className="text-lg font-semibold text-white mb-4">New Project</h2>
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
                      <Button type="submit" loading={creating} disabled={!name.trim()}>
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
                  <div key={i} className="h-40 rounded-lg bg-zinc-900 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="rounded-full bg-zinc-800 p-5 mb-4">
                  <FolderOpen className="h-10 w-10 text-zinc-500" />
                </div>
                <p className="text-zinc-400 font-medium text-lg">Welcome to Orquesta</p>
                <p className="mt-1 text-sm text-zinc-600 max-w-sm">
                  Create a project and connect an agent, or try the demo to see what it looks like in action.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Button onClick={seedDemo} variant="outline" loading={seedingDemo}>
                    <Play className="h-4 w-4" /> Try the Demo
                  </Button>
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4" /> Create Project
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                    <Card className="h-full hover:border-zinc-700 hover:bg-zinc-800/50 transition-all cursor-pointer">
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
                          <span className="flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5" /> {p.promptCount} prompts
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> {p.memberCount} members
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-zinc-600">{formatRelative(p.createdAt)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
