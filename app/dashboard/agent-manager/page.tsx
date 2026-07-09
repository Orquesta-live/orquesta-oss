'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSocket } from '@/hooks/useSocket'
import {
  Bot, Wifi, WifiOff, Terminal, Cpu, Monitor, Shield, Zap,
  RefreshCw, Play, Square, RotateCcw, ScrollText, Activity,
  Server, CheckCircle2, XCircle, AlertTriangle, ArrowLeft,
  Clock, GitBranch,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────

interface AgentInfo {
  id: string
  name: string
  status: 'online' | 'offline'
  projectId: string
  projectName: string
  hostname: string | null
  os: string | null
  nodeVersion: string | null
  agentVersion: string | null
  cliPreference: string
  permissionMode: string
  workingDir: string | null
  lastConnectedAt: string | null
}

interface LogEntry {
  id: string
  timestamp: string
  level: string
  type: string
  message: string
  agentName?: string
}

interface SystemCheck {
  label: string
  status: 'ok' | 'warn' | 'missing'
  detail: string
}

type TabId = 'agents' | 'logs' | 'system'

// ── Main Component ─────────────────────────────────────────────────

export default function AgentManagerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('agents')
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const { socket, connected, agentOnline } = useSocket({
    projectId: selectedProjectId,
    sessionToken,
  })

  // ── Load session & project ───────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        const sessionRes = await fetch('/api/auth/get-session')
        const sessionData = await sessionRes.json()
        setSessionToken(sessionData.session?.token || '')

        const projRes = await fetch('/api/projects')
        if (projRes.ok) {
          const projData = await projRes.json()
          if (projData.projects?.length > 0) {
            setSelectedProjectId(projData.projects[0].id)
          }
        }
      } catch {}
    }
    init()
  }, [])

  // ── Fetch agents ─────────────────────────────────────────────────

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data = await res.json()
        const mapped: AgentInfo[] = (data.tokens || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: t.name as string,
          status: t.agentOnline ? 'online' : 'offline',
          projectId: t.projectId as string,
          projectName: (t.projectName as string) || 'Unknown',
          hostname: (t.config as Record<string, unknown>)?.hostname as string | null ?? null,
          os: (t.config as Record<string, unknown>)?.os as string | null ?? null,
          nodeVersion: (t.config as Record<string, unknown>)?.nodeVersion as string | null ?? null,
          agentVersion: (t.config as Record<string, unknown>)?.agentVersion as string | null ?? null,
          cliPreference: ((t.config as Record<string, unknown>)?.cliPreference as string) || 'auto',
          permissionMode: ((t.config as Record<string, unknown>)?.permissionMode as string) || 'auto',
          workingDir: (t.config as Record<string, unknown>)?.workingDir as string | null ?? null,
          lastConnectedAt: (t.config as Record<string, unknown>)?.lastConnectedAt as string | null ?? null,
        }))
        setAgents(mapped)
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 8000)
    return () => clearInterval(interval)
  }, [fetchAgents])

  // ── Socket log listener ──────────────────────────────────────────

  useEffect(() => {
    if (!socket) return
    const handleLog = (data: { promptId?: string; level?: string; type?: string; message?: string }) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        level: data.level || 'info',
        type: data.type || 'text',
        message: data.message || '',
      }
      setLogs(prev => [...prev.slice(-199), entry])
    }
    socket.on('log', handleLog)
    return () => { socket.off('log', handleLog) }
  }, [socket])

  // ── System checks ────────────────────────────────────────────────

  useEffect(() => {
    const checks: SystemCheck[] = [
      {
        label: 'Socket Connection',
        status: connected ? 'ok' : 'missing',
        detail: connected ? 'Connected to server' : 'Disconnected',
      },
      {
        label: 'Agent Status',
        status: agentOnline ? 'ok' : 'warn',
        detail: agentOnline ? 'Agent connected and reporting' : 'No agent currently online',
      },
      {
        label: 'Orquesta OSS Server',
        status: 'ok',
        detail: typeof window !== 'undefined' ? window.location.origin : 'localhost:3000',
      },
    ]
    setSystemChecks(checks)
  }, [connected, agentOnline])

  // ── Tabs ─────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'agents', label: 'Agents', icon: <Bot className="h-4 w-4" /> },
    { id: 'logs', label: 'Logs', icon: <ScrollText className="h-4 w-4" /> },
    { id: 'system', label: 'System', icon: <Activity className="h-4 w-4" /> },
  ]

  const onlineCount = agents.filter(a => a.status === 'online').length

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8 animate-rise">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-green-400/80">Manager</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Agent Manager</h1>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'agents' && onlineCount > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-[10px] font-bold text-green-400">
                  {onlineCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'agents' && (
        <AgentsTab agents={agents} loading={loading} onRefresh={fetchAgents} />
      )}
      {activeTab === 'logs' && (
        <LogsTab logs={logs} onClear={() => setLogs([])} />
      )}
      {activeTab === 'system' && (
        <SystemTab checks={systemChecks} agents={agents} />
      )}
    </div>
  )
}


// ── Agents Tab ─────────────────────────────────────────────────────

function AgentsTab({ agents, loading, onRefresh }: { agents: AgentInfo[]; loading: boolean; onRefresh: () => void }) {
  const onlineCount = agents.filter(a => a.status === 'online').length

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading agents…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={agents.length} icon={<Server className="h-4 w-4" />} />
        <StatCard label="Online" value={onlineCount} icon={<Wifi className="h-4 w-4" />} accent={onlineCount > 0} />
        <StatCard label="Offline" value={agents.length - onlineCount} icon={<WifiOff className="h-4 w-4" />} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {onlineCount > 0
            ? <><span className="font-mono font-semibold text-green-400">{onlineCount}</span> agent{onlineCount !== 1 ? 's' : ''} reporting</>
            : 'No agents currently online'
          }
        </p>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Agent cards */}
      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800/50">
              <Bot className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="text-sm font-medium text-white">No agents configured</h3>
            <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500">
              Connect an agent from the Agents page or run the orquesta-agent CLI.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentInfo }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={`card-glow overflow-hidden border-l-2 transition-all ${
      agent.status === 'online' ? 'border-l-green-500' : 'border-l-zinc-700'
    }`}>
      <CardContent className="p-0">
        {/* Header row */}
        <div
          className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              agent.status === 'online'
                ? 'bg-green-500/12 ring-1 ring-inset ring-green-500/25'
                : 'bg-zinc-800 ring-1 ring-inset ring-zinc-700/60'
            }`}>
              {agent.status === 'online'
                ? <Wifi className="h-4.5 w-4.5 text-green-400" />
                : <WifiOff className="h-4.5 w-4.5 text-zinc-500" />
              }
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">{agent.name}</span>
                <Badge variant={agent.status === 'online' ? 'green' : 'default'}>
                  {agent.status}
                </Badge>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-300 ring-1 ring-inset ring-zinc-700/60">
                  <Zap className="h-3 w-3 text-zinc-500" />
                  {agent.cliPreference === 'claude' ? 'Claude' : agent.cliPreference === 'orquesta' ? 'Orquesta' : agent.cliPreference === 'kimi' ? 'Kimi' : 'Auto'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-300 ring-1 ring-inset ring-zinc-700/60">
                  <Shield className="h-3 w-3 text-zinc-500" />
                  {agent.permissionMode === 'supervised' ? 'Supervised' : 'Auto'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                <span className="text-zinc-400">{agent.projectName}</span>
                {agent.hostname && <span className="font-mono">{agent.hostname}</span>}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {agent.status === 'online' && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-zinc-800 bg-zinc-950/60 p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
              <DetailItem icon={<Monitor className="h-3.5 w-3.5" />} label="Hostname" value={agent.hostname || '—'} />
              <DetailItem icon={<Cpu className="h-3.5 w-3.5" />} label="OS" value={agent.os || '—'} />
              <DetailItem icon={<Terminal className="h-3.5 w-3.5" />} label="Node.js" value={agent.nodeVersion || '—'} />
              <DetailItem icon={<Bot className="h-3.5 w-3.5" />} label="Agent Version" value={agent.agentVersion ? `v${agent.agentVersion}` : '—'} />
              <DetailItem icon={<Zap className="h-3.5 w-3.5" />} label="LLM Engine" value={
                agent.cliPreference === 'claude' ? 'Claude CLI'
                : agent.cliPreference === 'orquesta' ? 'Orquesta CLI'
                : agent.cliPreference === 'kimi' ? 'Kimi CLI'
                : 'Auto'
              } />
              <DetailItem icon={<Shield className="h-3.5 w-3.5" />} label="Permissions" value={
                agent.permissionMode === 'supervised' ? 'Supervised' : 'Auto (no approval)'
              } />
              <DetailItem icon={<GitBranch className="h-3.5 w-3.5" />} label="Working Dir" value={agent.workingDir || '—'} className="col-span-2" />
              <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Last Connected" value={
                agent.lastConnectedAt ? new Date(agent.lastConnectedAt).toLocaleString() : '—'
              } />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


// ── Logs Tab ───────────────────────────────────────────────────────

function LogsTab({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const levelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400'
      case 'warn': return 'text-yellow-400'
      case 'success': return 'text-green-400'
      default: return 'text-zinc-300'
    }
  }

  const levelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-3 w-3 text-red-400" />
      case 'warn': return <AlertTriangle className="h-3 w-3 text-yellow-400" />
      case 'success': return <CheckCircle2 className="h-3 w-3 text-green-400" />
      default: return <Terminal className="h-3 w-3 text-zinc-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-sm text-zinc-400">
            Streaming — <span className="font-mono text-zinc-300">{logs.length}</span> entries
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={logs.length === 0}>
          Clear
        </Button>
      </div>

      {/* Log viewer */}
      <Card className="card-glow">
        <CardContent className="p-0">
          <div
            ref={scrollRef}
            className="h-[500px] overflow-y-auto overflow-x-hidden font-mono text-xs"
          >
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                <ScrollText className="h-8 w-8 text-zinc-700" />
                <p className="text-sm">No logs yet</p>
                <p className="text-[11px] text-zinc-600">Logs will appear here when an agent reports activity</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 px-4 py-2 hover:bg-zinc-800/30 transition-colors">
                    <span className="shrink-0 mt-0.5">{levelIcon(log.level)}</span>
                    <span className="shrink-0 text-[10px] text-zinc-600 font-mono mt-0.5 w-[70px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`break-all ${levelColor(log.level)}`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


// ── System Tab ─────────────────────────────────────────────────────

function SystemTab({ checks, agents }: { checks: SystemCheck[]; agents: AgentInfo[] }) {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="h-5 w-5 text-green-400" />
      case 'warn': return <AlertTriangle className="h-5 w-5 text-yellow-400" />
      default: return <XCircle className="h-5 w-5 text-red-400" />
    }
  }

  const statusBorder = (status: string) => {
    switch (status) {
      case 'ok': return 'border-l-green-500'
      case 'warn': return 'border-l-yellow-500'
      default: return 'border-l-red-500'
    }
  }

  const onlineAgent = agents.find(a => a.status === 'online')

  return (
    <div className="space-y-6">
      {/* System checks */}
      <div>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">System Status</h2>
        <div className="space-y-2">
          {checks.map((check, i) => (
            <Card key={i} className={`card-glow border-l-2 ${statusBorder(check.status)}`}>
              <CardContent className="flex items-center gap-4 p-4">
                {statusIcon(check.status)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{check.label}</p>
                  <p className="text-xs text-zinc-500 font-mono">{check.detail}</p>
                </div>
                <Badge variant={check.status === 'ok' ? 'green' : check.status === 'warn' ? 'yellow' : 'red'}>
                  {check.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Active agent info */}
      {onlineAgent && (
        <div>
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Active Agent Details</h2>
          <Card className="card-glow">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                <DetailItem icon={<Bot className="h-3.5 w-3.5" />} label="Name" value={onlineAgent.name} />
                <DetailItem icon={<Monitor className="h-3.5 w-3.5" />} label="Hostname" value={onlineAgent.hostname || '—'} />
                <DetailItem icon={<Cpu className="h-3.5 w-3.5" />} label="OS" value={onlineAgent.os || '—'} />
                <DetailItem icon={<Terminal className="h-3.5 w-3.5" />} label="Node.js" value={onlineAgent.nodeVersion || '—'} />
                <DetailItem icon={<Zap className="h-3.5 w-3.5" />} label="LLM Engine" value={onlineAgent.cliPreference} />
                <DetailItem icon={<Shield className="h-3.5 w-3.5" />} label="Permissions" value={onlineAgent.permissionMode} />
                <DetailItem icon={<GitBranch className="h-3.5 w-3.5" />} label="Working Dir" value={onlineAgent.workingDir || '—'} className="col-span-2" />
                {onlineAgent.agentVersion && (
                  <DetailItem icon={<Server className="h-3.5 w-3.5" />} label="Version" value={`v${onlineAgent.agentVersion}`} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Environment info */}
      <div>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Environment</h2>
        <Card className="card-glow">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
              <DetailItem icon={<Server className="h-3.5 w-3.5" />} label="Platform" value="Orquesta OSS" />
              <DetailItem icon={<Activity className="h-3.5 w-3.5" />} label="Transport" value="WebSocket (socket.io)" />
              <DetailItem icon={<Monitor className="h-3.5 w-3.5" />} label="Dashboard" value={typeof window !== 'undefined' ? window.location.host : '—'} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Shared Components ──────────────────────────────────────────────

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={`card-glow ${accent ? 'border-green-500/30' : ''}`}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">{label}</p>
          <p className={`mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight ${accent ? 'text-green-400' : 'text-white'}`}>
            {value}
          </p>
        </div>
        <span className={accent ? 'text-green-500/80' : 'text-zinc-600'}>{icon}</span>
      </CardContent>
    </Card>
  )
}

function DetailItem({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-2 ${className || ''}`}>
      <span className="mt-0.5 shrink-0 text-zinc-500">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="truncate font-mono text-xs text-zinc-300">{value}</p>
      </div>
    </div>
  )
}
