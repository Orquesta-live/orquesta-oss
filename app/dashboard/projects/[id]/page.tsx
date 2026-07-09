'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PromptInput } from '@/components/features/PromptInput'
import { PromptTimeline } from '@/components/features/PromptTimeline'
import { TeamManager } from '@/components/features/TeamManager'
import { ConnectionGuide } from '@/components/features/ConnectionGuide'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, MessageSquare, Users, Key, Copy, Check,
  Plus, Trash2, Puzzle, Code2, Terminal,
  Package, Loader2, Settings, Save, FileCode, ExternalLink,
  Clock,
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

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#09090b]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">Loading project…</p>
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

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/[0.07] via-transparent to-emerald-600/[0.04]" />
        <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" />
        <div className="relative mx-auto max-w-6xl px-6 py-5">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-all duration-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Link>
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-xl font-bold text-white shadow-lg shadow-green-900/40 ring-1 ring-white/10">
              {project.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{project.name}</h1>
              {project.description && (
                <p className="mt-0.5 text-sm text-zinc-400 truncate">{project.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MessageSquare className="h-3.5 w-3.5" /> Prompts
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Users className="h-3.5 w-3.5" /> Team
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Key className="h-3.5 w-3.5" /> {tokens.length} token{tokens.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  {agentOnline ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                      </span>
                      <span className="text-green-400">Agent online</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex h-2 w-2 rounded-full bg-zinc-600" />
                      <span className="text-zinc-500">Agent offline</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800 bg-[#09090b]">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <nav className="inline-flex gap-1 rounded-xl bg-zinc-900/80 p-1 ring-1 ring-white/5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  tab === t.id
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {tab === 'prompts' && (
          <div className="space-y-6">
            <PromptInput projectId={projectId} agentOnline={agentOnline} />
            <PromptTimeline projectId={projectId} socket={socket} />
          </div>
        )}

        {tab === 'team' && (
          <TeamManager projectId={projectId} currentUserId={currentUserId} />
        )}

        {tab === 'tokens' && (
          <div className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Access</p>
                <h2 className="text-lg font-semibold text-white">Agent Tokens</h2>
                <p className="text-sm text-zinc-400">
                  Connect agents using{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-green-400">
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
              <div className="rounded-xl border border-green-500/30 bg-green-500/[0.08] p-5 shadow-lg shadow-green-900/10 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
                    <Check className="h-4 w-4 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-green-300">
                    Token created — copy it now, it won&apos;t be shown again
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg border border-green-500/20 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-white shadow-inner">
                    {newTokenValue}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyText(newTokenValue, 'token-reveal')} className="transition-all duration-200 hover:border-green-500/50">
                    {copied === 'token-reveal' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-4 font-mono text-xs uppercase tracking-wider text-zinc-400">Run your agent with</p>
                <div className="group relative mt-2">
                  <code className="block overflow-x-auto whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-300">
                    {`ORQUESTA_API_URL=${appUrl} npx orquesta-agent --token ${newTokenValue}`}
                  </code>
                  <button
                    onClick={() => copyText(`ORQUESTA_API_URL=${appUrl} npx orquesta-agent --token ${newTokenValue}`, 'token-cmd')}
                    className="absolute right-2 top-2 rounded-md p-1.5 text-zinc-500 opacity-0 transition-all duration-200 hover:bg-zinc-800 hover:text-white group-hover:opacity-100"
                  >
                    {copied === 'token-cmd' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button variant="ghost" size="sm" className="mt-4 transition-all duration-200" onClick={() => setNewTokenValue(null)}>
                  Dismiss
                </Button>
              </div>
            )}

            {tokens.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-zinc-900/50 px-6 py-16 text-center backdrop-blur-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-800/30">
                  <Key className="h-8 w-8 text-zinc-600" />
                </div>
                <p className="text-base font-medium text-white">No tokens yet</p>
                <p className="mt-1.5 text-sm text-zinc-500">Create one to connect an agent to this project.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {tokens.map((t) => (
                  <div key={t.id} className="group flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-zinc-900/50 px-5 py-4 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/70">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-400 ring-1 ring-white/5">
                        <Key className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${t.lastSeenAt ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-zinc-600'}`} />
                            {t.lastSeenAt ? 'Online' : 'Offline'}
                          </span>
                          <span className="text-zinc-700">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t.lastSeenAt
                              ? `Last seen ${new Date(t.lastSeenAt).toLocaleString()}`
                              : 'Never connected'}
                          </span>
                        </p>
                      </div>
                    </div>
                    {['owner', 'admin'].includes(role) && (
                      <button onClick={() => revokeToken(t.id)} className="shrink-0 rounded-lg p-2 text-zinc-600 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <ConnectionGuide appUrl={appUrl} tokenValue={newTokenValue ?? undefined} />
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Agent Context</p>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <FileCode className="h-5 w-5 text-green-500" /> CLAUDE.md
                </h2>
                <p className="text-sm text-zinc-400">
                  Define coding standards, rules, and context. The agent syncs this before every execution.
                </p>
              </div>
              {['owner', 'admin'].includes(role) && (
                <Button onClick={saveClaudeMd} loading={claudeMdSaving} size="sm">
                  <Save className="h-4 w-4" /> Save
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm">
              {/* Editor Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <FileCode className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="font-mono text-xs text-zinc-400">CLAUDE.md</span>
                </div>
                <span className={`flex items-center gap-1.5 text-xs ${claudeMdSaving ? 'text-yellow-400' : 'text-zinc-600'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${claudeMdSaving ? 'bg-yellow-400' : 'bg-green-500'}`} />
                  {claudeMdSaving ? 'Saving…' : 'Saved'}
                </span>
              </div>
              {/* Editor Body */}
              {claudeMdLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="relative flex">
                  {/* Line Numbers */}
                  <div className="pointer-events-none select-none border-r border-zinc-800/50 bg-zinc-950/50 px-3 py-4 font-mono text-xs leading-relaxed text-zinc-700">
                    {(claudeMd || '\n'.repeat(19)).split('\n').map((_, i) => (
                      <div key={i} className="text-right">{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={claudeMd}
                    onChange={(e) => setClaudeMd(e.target.value)}
                    disabled={!['owner', 'admin'].includes(role)}
                    placeholder={`# Project Rules\n\n- All code must be in TypeScript\n- Use functional components\n- Write tests for new features\n\n# Architecture\n\n- Frontend: React + Next.js\n- Backend: Express API\n- Database: PostgreSQL`}
                    rows={20}
                    className="w-full flex-1 resize-y border-0 bg-transparent p-4 font-mono text-sm leading-relaxed text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:ring-0 disabled:opacity-50"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <FileCode className="h-3.5 w-3.5" />
              Supports Markdown. The agent writes this to CLAUDE.md in the project root before each execution.
            </p>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Connect</p>
              <h2 className="text-lg font-semibold text-white">Integrations</h2>
              <p className="text-sm text-zinc-400">Bring Orquesta into your site or terminal.</p>
            </div>

            {/* Embed Card */}
            <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700">
              <div className="flex items-center gap-4 border-b border-zinc-800/50 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400 ring-1 ring-green-500/20">
                  <Code2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Embed Widget</h3>
                  <p className="mt-0.5 text-sm text-zinc-400">Add the Orquesta prompt widget to any website.</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                {/* Widget Preview */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">Preview</p>
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-600 text-xs font-bold text-white">O</div>
                    <div className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-500">Send a prompt to the agent…</div>
                    <div className="h-7 w-14 rounded-md bg-green-600 text-center text-[10px] font-medium leading-7 text-white">Send</div>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">1. Load the script</p>
                  <div className="group relative">
                    <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                      {`<script src="${appUrl}/embed/v1/orquesta.min.js"></script>`}
                    </pre>
                    <button
                      onClick={() => copyText(`<script src="${appUrl}/embed/v1/orquesta.min.js"></script>`, 'embed-script')}
                      className="absolute right-2 top-2 rounded-md p-1.5 text-zinc-500 opacity-0 transition-all duration-200 hover:bg-zinc-800 hover:text-white group-hover:opacity-100"
                    >
                      {copied === 'embed-script' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">2. Add the widget</p>
                  <div className="group relative">
                    <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">{`<div
  id="orquesta-widget"
  data-project-id="${projectId}"
  data-token="YOUR_EMBED_TOKEN"
></div>`}</pre>
                    <button
                      onClick={() => copyText(`<div\n  id="orquesta-widget"\n  data-project-id="${projectId}"\n  data-token="YOUR_EMBED_TOKEN"\n></div>`, 'embed-div')}
                      className="absolute right-2 top-2 rounded-md p-1.5 text-zinc-500 opacity-0 transition-all duration-200 hover:bg-zinc-800 hover:text-white group-hover:opacity-100"
                    >
                      {copied === 'embed-div' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 border-t border-zinc-800/50 pt-4 text-xs text-zinc-500">
                  <Package className="h-3.5 w-3.5" />
                  Also on npm: <code className="font-mono text-zinc-300">npm install orquesta-embed</code>
                </p>
              </div>
            </div>

            {/* CLI Card */}
            <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700">
              <div className="flex items-center gap-4 border-b border-zinc-800/50 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400 ring-1 ring-green-500/20">
                  <Terminal className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Orquesta CLI</h3>
                  <p className="mt-0.5 text-sm text-zinc-400">Submit prompts and manage projects from your terminal.</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">Install</p>
                  <div className="group relative">
                    <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                      npm install -g orquesta-cli
                    </pre>
                    <button
                      onClick={() => copyText('npm install -g orquesta-cli', 'cli-install')}
                      className="absolute right-2 top-2 rounded-md p-1.5 text-zinc-500 opacity-0 transition-all duration-200 hover:bg-zinc-800 hover:text-white group-hover:opacity-100"
                    >
                      {copied === 'cli-install' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">Connect</p>
                  <div className="group relative">
                    <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                      {`ORQUESTA_API_URL=${appUrl} orquesta --token oclt_YOUR_TOKEN`}
                    </pre>
                    <button
                      onClick={() => copyText(`ORQUESTA_API_URL=${appUrl} orquesta --token oclt_YOUR_TOKEN`, 'cli-connect')}
                      className="absolute right-2 top-2 rounded-md p-1.5 text-zinc-500 opacity-0 transition-all duration-200 hover:bg-zinc-800 hover:text-white group-hover:opacity-100"
                    >
                      {copied === 'cli-connect' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
