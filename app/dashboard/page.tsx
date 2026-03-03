'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, FolderOpen, Users, Zap, LogOut, Wifi, WifiOff } from 'lucide-react'
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

  const signOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white">
              O
            </div>
            <span className="font-semibold text-white">Orquesta OSS</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
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
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreate(false)}
                  >
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
            <p className="text-zinc-400 font-medium text-lg">No projects yet</p>
            <p className="mt-1 text-sm text-zinc-600">Create your first project to get started.</p>
            <Button onClick={() => setShowCreate(true)} className="mt-6">
              <Plus className="h-4 w-4" /> Create Project
            </Button>
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
      </main>
    </div>
  )
}
