'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PromptInput } from '@/components/features/PromptInput'
import { PromptTimeline } from '@/components/features/PromptTimeline'
import { TeamManager } from '@/components/features/TeamManager'
import { ConnectionGuide } from '@/components/features/ConnectionGuide'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, MessageSquare, Users, Key, Copy, Check,
  Plus, Trash2, Wifi, WifiOff, Puzzle, Code2, Terminal,
  Package, Globe, Loader2, Settings, Save, FileCode,
} from 'lucide-react'

type Tab = 'prompts' | 'team' | 'tokens' | 'integrations' | 'settings'

interface AgentToken {
  id: string
  name: string
  lastSeenAt?: string
  createdAt: string
}

interface Project {
  id: string
  name: string
  description?: string
  publishedToFeed?: boolean
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('prompts')
  const [project, setProject] = useState<Project | null>(null)
  const [role, setRole] = useState<string>('member')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [sessionToken, setSessionToken] = useState<string>('')
  const [appUrl, setAppUrl] = useState('http://localhost:3000')
  const [tokens, setTokens] = useState<AgentToken[]>([])
  const [creatingToken, setCreatingToken] = useState(false)
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishMsg, setPublishMsg] = useState<string | null>(null)
  const [claudeMd, setClaudeMd] = useState('')
  const [claudeMdLoading, setClaudeMdLoading] = useState(false)
  const [claudeMdSaving, setClaudeMdSaving] = useState(false)
  const { toast } = useToast()

  const { socket, agentOnline } = useSocket({ projectId, sessionToken })

  useEffect(() => {
    setAppUrl(window.location.origin)
  }, [])

  useEffect(() => {
    const init = async () => {
      const [projectRes, sessionRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch('/api/auth/get-session'),
      ])

      if (projectRes.status === 401) { router.push('/login'); return }
      if (projectRes.status === 404) { router.push('/dashboard'); return }
      if (projectRes.ok) {
        const data = await projectRes.json()
        setProject(data.project)
        setRole(data.role)
      }

      if (sessionRes.ok) {
        const data = await sessionRes.json()
        setSessionToken(data.session?.token || '')
        setCurrentUserId(data.session?.user?.id || '')
      }
    }
    init()
  }, [projectId])

  const loadTokens = async () => {
    const res = await fetch(`/api/projects/${projectId}/agent-tokens`)
    if (res.ok) {
      const data = await res.json()
      setTokens(data.tokens)
    }
  }

  useEffect(() => {
    if (tab === 'tokens') loadTokens()
    if (tab === 'settings') {
      setClaudeMdLoading(true)
      fetch(`/api/projects/${projectId}/settings`)
        .then(r => r.json())
        .then(d => setClaudeMd(d.claudeMd || ''))
        .catch(() => {})
        .finally(() => setClaudeMdLoading(false))
    }
  }, [tab])

  const createToken = async () => {
    setCreatingToken(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/agent-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Token ${tokens.length + 1}` }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewTokenValue(data.token.rawToken)
        await loadTokens()
      }
    } finally {
      setCreatingToken(false)
    }
  }

  const revokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this token? The agent using it will disconnect.')) return
    await fetch(`/api/projects/${projectId}/agent-tokens/${tokenId}`, { method: 'DELETE' })
    await loadTokens()
  }

  const saveClaudeMd = async () => {
    setClaudeMdSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeMd }),
      })
      if (res.ok) {
        toast('success', 'CLAUDE.md saved — agent will use it on next execution')
      } else {
        const data = await res.json()
        toast('error', data.error || 'Failed to save')
      }
    } catch {
      toast('error', 'Failed to save CLAUDE.md')
    } finally {
      setClaudeMdSaving(false)
    }
  }

  const copyText = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const publishToFeed = async () => {
    setPublishing(true)
    setPublishMsg(null)
    try {
      const promptCount = 0 // could fetch real count
      const res = await fetch('https://orquesta.live/api/oss/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: project?.name,
          description: project?.description,
          instance_url: appUrl,
          prompt_count: promptCount,
        }),
      })
      if (res.ok) {
        setPublishMsg('Published! Your instance is now visible at orquesta.live/feed')
        setProject(p => p ? { ...p, publishedToFeed: true } : p)
      } else {
        setPublishMsg('Failed to publish. Try again later.')
      }
    } catch {
      setPublishMsg('Could not reach orquesta.live. Check your internet connection.')
    } finally {
      setPublishing(false)
    }
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'prompts', label: 'Prompts', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
    { id: 'tokens', label: 'Tokens', icon: <Key className="h-4 w-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Puzzle className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ]

  const isOwner = role === 'owner'

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Link>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-600 text-xs font-bold text-white">
              {project.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white truncate">{project.name}</h1>
              {project.description && (
                <p className="text-xs text-zinc-500 truncate">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {agentOnline ? (
              <Badge variant="green" className="gap-1">
                <Wifi className="h-3 w-3" /> Agent online
              </Badge>
            ) : (
              <Badge variant="default" className="gap-1 text-zinc-500">
                <WifiOff className="h-3 w-3" /> Agent offline
              </Badge>
            )}
            {/* Publish to community */}
            {isOwner && (
              <Button
                size="sm"
                variant={project.publishedToFeed ? 'ghost' : 'outline'}
                onClick={publishToFeed}
                disabled={publishing}
                className={project.publishedToFeed ? 'text-green-400 border-green-800' : ''}
              >
                {publishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                {project.publishedToFeed ? 'Published' : 'Publish to community'}
              </Button>
            )}
          </div>
        </div>
        {/* Publish feedback */}
        {publishMsg && (
          <div className="mx-auto max-w-6xl px-6 pb-2">
            <p className="text-xs text-green-400">{publishMsg}</p>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-6xl px-6">
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors border-b-2 ${
                  tab === t.id
                    ? 'border-green-500 text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        {tab === 'prompts' && (
          <div className="space-y-4">
            <PromptInput projectId={projectId} agentOnline={agentOnline} />
            <PromptTimeline projectId={projectId} socket={socket} />
          </div>
        )}

        {tab === 'team' && (
          <TeamManager projectId={projectId} currentUserId={currentUserId} />
        )}

        {tab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Agent Tokens</h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Connect agents using{' '}
                  <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-green-400">
                    ORQUESTA_API_URL
                  </code>{' '}
                  and these tokens.
                </p>
              </div>
              {['owner', 'admin'].includes(role) && (
                <Button onClick={createToken} loading={creatingToken} size="sm">
                  <Plus className="h-4 w-4" /> New Token
                </Button>
              )}
            </div>

            {newTokenValue && (
              <div className="rounded-lg border border-green-900 bg-green-950/30 p-4">
                <p className="text-sm font-medium text-green-400 mb-2">
                  Token created — copy it now, it won&apos;t be shown again
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-zinc-900 px-3 py-2 text-xs text-white font-mono break-all">
                    {newTokenValue}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyText(newTokenValue, 'token-reveal')}>
                    {copied === 'token-reveal' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-zinc-500">Run your agent with:</p>
                <code className="mt-1 block rounded bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                  {`ORQUESTA_API_URL=${appUrl} npx orquesta-agent --token ${newTokenValue}`}
                </code>
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setNewTokenValue(null)}>
                  Dismiss
                </Button>
              </div>
            )}

            <Card>
              <CardContent className="p-0">
                {tokens.length === 0 ? (
                  <p className="p-5 text-sm text-zinc-500">No tokens yet. Create one to connect an agent.</p>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {tokens.map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{t.name}</p>
                          <p className="text-xs text-zinc-500">
                            {t.lastSeenAt
                              ? `Last seen ${new Date(t.lastSeenAt).toLocaleString()}`
                              : 'Never connected'}
                          </p>
                        </div>
                        {['owner', 'admin'].includes(role) && (
                          <button onClick={() => revokeToken(t.id)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <ConnectionGuide appUrl={appUrl} tokenValue={newTokenValue ?? undefined} />
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-green-500" /> CLAUDE.md
                </h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Define coding standards, rules, and context. The agent syncs this before every execution.
                </p>
              </div>
              {['owner', 'admin'].includes(role) && (
                <Button onClick={saveClaudeMd} loading={claudeMdSaving} size="sm">
                  <Save className="h-4 w-4" /> Save
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                {claudeMdLoading ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                  </div>
                ) : (
                  <textarea
                    value={claudeMd}
                    onChange={(e) => setClaudeMd(e.target.value)}
                    disabled={!['owner', 'admin'].includes(role)}
                    placeholder={`# Project Rules\n\n- All code must be in TypeScript\n- Use functional components\n- Write tests for new features\n\n# Architecture\n\n- Frontend: React + Next.js\n- Backend: Express API\n- Database: PostgreSQL`}
                    rows={20}
                    className="w-full resize-y rounded-lg bg-zinc-950 p-4 font-mono text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                  />
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-zinc-600">
              Supports Markdown. The agent writes this to CLAUDE.md in the project root before each execution.
            </p>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="space-y-6">
            {/* Embed Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" /> Embed Widget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-400">Add the Orquesta prompt widget to any website.</p>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">1. Load the script</p>
                  <div className="group relative">
                    <pre className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-300 font-mono overflow-x-auto">
                      {`<script src="${appUrl}/embed/v1/orquesta.min.js"></script>`}
                    </pre>
                    <button
                      onClick={() => copyText(`<script src="${appUrl}/embed/v1/orquesta.min.js"></script>`, 'embed-script')}
                      className="absolute right-2 top-2 rounded p-1.5 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied === 'embed-script' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">2. Add the widget</p>
                  <div className="group relative">
                    <pre className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-300 font-mono overflow-x-auto">{`<div
  id="orquesta-widget"
  data-project-id="${projectId}"
  data-token="YOUR_EMBED_TOKEN"
></div>`}</pre>
                    <button
                      onClick={() => copyText(`<div\n  id="orquesta-widget"\n  data-project-id="${projectId}"\n  data-token="YOUR_EMBED_TOKEN"\n></div>`, 'embed-div')}
                      className="absolute right-2 top-2 rounded p-1.5 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied === 'embed-div' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Package className="h-3.5 w-3.5" />
                  Also on npm: <code className="font-mono text-zinc-300">npm install orquesta-embed</code>
                </p>
              </CardContent>
            </Card>

            {/* CLI Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" /> Orquesta CLI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-400">Submit prompts and manage projects from your terminal.</p>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">Install</p>
                  <div className="group relative">
                    <pre className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-300 font-mono">
                      npm install -g orquesta-cli
                    </pre>
                    <button
                      onClick={() => copyText('npm install -g orquesta-cli', 'cli-install')}
                      className="absolute right-2 top-2 rounded p-1.5 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied === 'cli-install' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">Connect</p>
                  <div className="group relative">
                    <pre className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-300 font-mono">
                      {`ORQUESTA_API_URL=${appUrl} orquesta --token oclt_YOUR_TOKEN`}
                    </pre>
                    <button
                      onClick={() => copyText(`ORQUESTA_API_URL=${appUrl} orquesta --token oclt_YOUR_TOKEN`, 'cli-connect')}
                      className="absolute right-2 top-2 rounded p-1.5 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied === 'cli-connect' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
