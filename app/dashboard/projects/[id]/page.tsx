'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PromptInput } from '@/components/features/PromptInput'
import { PromptTimeline } from '@/components/features/PromptTimeline'
import { AgentGrid } from '@/components/features/AgentGrid'
import { TeamManager } from '@/components/features/TeamManager'
import { useSocket } from '@/hooks/useSocket'
import {
  ArrowLeft, MessageSquare, LayoutGrid, Users, Key, Copy, Check,
  Plus, Trash2, Wifi, WifiOff,
} from 'lucide-react'

type Tab = 'prompts' | 'grid' | 'team' | 'tokens'

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
}

// Better Auth session cookie is httpOnly, so we read the session token via a helper endpoint
async function getSessionToken(): Promise<string> {
  const res = await fetch('/api/auth/get-session')
  if (!res.ok) return ''
  const data = await res.json()
  return data.session?.token || ''
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('prompts')
  const [project, setProject] = useState<Project | null>(null)
  const [role, setRole] = useState<string>('member')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [sessionToken, setSessionToken] = useState<string>('')
  const [tokens, setTokens] = useState<AgentToken[]>([])
  const [creatingToken, setCreatingToken] = useState(false)
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { socket, connected, agentOnline } = useSocket({ projectId, sessionToken })

  useEffect(() => {
    const init = async () => {
      // Load project
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 404) { router.push('/dashboard'); return }
      if (res.ok) {
        const data = await res.json()
        setProject(data.project)
        setRole(data.role)
      }

      // Get session token for Socket.io auth
      const token = await getSessionToken()
      setSessionToken(token)

      // Get current user
      const sessionRes = await fetch('/api/auth/get-session')
      if (sessionRes.ok) {
        const data = await sessionRes.json()
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

  const copyToken = async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    { id: 'grid', label: 'Agent Grid', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
    { id: 'tokens', label: 'Tokens', icon: <Key className="h-4 w-4" /> },
  ]

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
          </div>
        </div>
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
            <PromptInput
              projectId={projectId}
              agentOnline={agentOnline}
            />
            <PromptTimeline projectId={projectId} socket={socket} />
          </div>
        )}

        {tab === 'grid' && (
          <AgentGrid socket={socket} />
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

            {/* New token reveal */}
            {newTokenValue && (
              <div className="rounded-lg border border-green-900 bg-green-950/30 p-4">
                <p className="text-sm font-medium text-green-400 mb-2">
                  Token created — copy it now, it won't be shown again
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-zinc-900 px-3 py-2 text-xs text-white font-mono break-all">
                    {newTokenValue}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToken(newTokenValue)}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Run your agent with:
                </p>
                <code className="mt-1 block rounded bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                  {`ORQUESTA_API_URL=${window.location.origin} npx orquesta-agent --token ${newTokenValue}`}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => setNewTokenValue(null)}
                >
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
                          <button
                            onClick={() => revokeToken(t.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Connect your agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Run this on any VM or machine where you want to execute AI prompts:
                </p>
                <code className="block rounded-md bg-zinc-950 p-3 text-xs text-zinc-300 overflow-x-auto">
                  {`# Install agent (one-time)\nnpm install -g orquesta-agent\n\n# Connect to this Orquesta OSS instance\nORQUESTA_API_URL=${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'} \\\norquesta-agent --token <your-token-here>`}
                </code>
                <p className="text-xs text-zinc-500">
                  Or use the orquesta-cli:{' '}
                  <code className="text-green-400">
                    ORQUESTA_API_URL={typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'} orquesta --token &lt;cli-token&gt;
                  </code>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
