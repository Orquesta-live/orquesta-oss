'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Wifi, WifiOff, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Terminal, Cpu, Monitor, GitBranch, Clock, Shield, Zap, Bot
} from 'lucide-react'

interface AgentToken {
  id: string
  name: string
  projectId: string
  projectName: string
  createdAt: string
  revokedAt: string | null
  lastSeen: string | null
  agentOnline: boolean
  config?: {
    hostname: string | null
    os: string | null
    nodeVersion: string | null
    agentVersion: string | null
    cliPreference: string
    permissionMode: string
    workingDir: string | null
    lastConnectedAt: string | null
  }
}

export default function AgentsPage() {
  const [tokens, setTokens] = useState<AgentToken[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const revokeToken = async (id: string) => {
    if (!confirm('Revoke this agent token? The agent will disconnect.')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    load()
  }

  const onlineCount = tokens.filter(t => t.agentOnline).length
  const offlineCount = tokens.length - onlineCount
  const url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  return (
    <div className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-green-400/80">Fleet</p>
          <h1 className="text-4xl font-bold tracking-tight text-white">Agents</h1>
          <p className="text-sm text-zinc-400">
            {onlineCount > 0
              ? <><span className="font-mono font-semibold tabular-nums text-green-400">{onlineCount} online</span> of <span className="font-mono tabular-nums text-zinc-300">{tokens.length}</span> configured</>
              : `${tokens.length} agent${tokens.length !== 1 ? 's' : ''} configured`
            }
          </p>
        </div>
        <Button variant="gradient" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status summary */}
      {tokens.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total" value={tokens.length} icon={<Bot className="h-4 w-4" />} />
          <StatTile label="Online" value={onlineCount} icon={<Wifi className="h-4 w-4" />} accent={onlineCount > 0} />
          <StatTile label="Offline" value={offlineCount} icon={<WifiOff className="h-4 w-4" />} />
        </div>
      )}

      {/* Quick connect */}
      <Card className="card-glow">
        <CardContent className="p-4">
          <div className="mb-2.5 flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-green-500/80" />
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">Connect an agent</p>
          </div>
          <div className="overflow-x-auto whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs text-green-400 shadow-inner shadow-black/40">
            ORQUESTA_API_URL={url} npx orquesta-agent --token {'<token>'} --cli-preference claude
          </div>
        </CardContent>
      </Card>

      {/* Agent list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading agents…
        </div>
      ) : tokens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800/50">
              <Bot className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="text-sm font-medium text-white">No agents connected</h3>
            <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500">
              Mint a token in Project Settings, then run the connect command above to bring an agent online.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {tokens.map(t => {
            const isExpanded = expandedId === t.id
            const cfg = t.config

            return (
              <Card
                key={t.id}
                className={`card-glow overflow-hidden border-l-2 ${
                  t.agentOnline ? 'border-l-green-500' : 'border-l-zinc-700'
                }`}
              >
                <CardContent className="p-0">
                  {/* Main row */}
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        t.agentOnline ? 'bg-green-500/12 ring-1 ring-inset ring-green-500/25' : 'bg-zinc-800'
                      }`}>
                        {t.agentOnline
                          ? <Wifi className="h-4 w-4 text-green-400" />
                          : <WifiOff className="h-4 w-4 text-zinc-500" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-white">{t.name}</span>
                          <Badge variant={t.agentOnline ? 'green' : 'default'}>
                            {t.agentOnline ? 'online' : 'offline'}
                          </Badge>
                          {cfg && (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-300 ring-1 ring-inset ring-zinc-700/60">
                                <Zap className="h-3 w-3 text-zinc-500" />
                                {cfg.cliPreference === 'claude' ? 'Claude CLI' : cfg.cliPreference === 'orquesta' ? 'Orquesta CLI' : 'Auto'}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-300 ring-1 ring-inset ring-zinc-700/60">
                                <Shield className="h-3 w-3 text-zinc-500" />
                                {cfg.permissionMode === 'supervised' ? 'Supervised' : 'Auto'}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                          <span className="text-zinc-400">{t.projectName}</span>
                          {cfg?.hostname && <span className="font-mono text-zinc-500">{cfg.hostname}</span>}
                          {t.lastSeen && <span>{new Date(t.lastSeen).toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                        onClick={() => revokeToken(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 bg-zinc-950/60 p-4">
                      {cfg ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                          <InfoItem icon={<Monitor className="h-3.5 w-3.5" />} label="Hostname" value={cfg.hostname || '—'} />
                          <InfoItem icon={<Cpu className="h-3.5 w-3.5" />} label="OS" value={cfg.os || '—'} />
                          <InfoItem icon={<Terminal className="h-3.5 w-3.5" />} label="Node.js" value={cfg.nodeVersion || '—'} />
                          <InfoItem icon={<Bot className="h-3.5 w-3.5" />} label="Agent" value={cfg.agentVersion ? `v${cfg.agentVersion}` : '—'} />
                          <InfoItem icon={<Zap className="h-3.5 w-3.5" />} label="LLM Engine" value={
                            cfg.cliPreference === 'claude' ? 'Claude CLI (Anthropic)'
                            : cfg.cliPreference === 'orquesta' ? 'Orquesta CLI (multi-model)'
                            : 'Auto (best available)'
                          } />
                          <InfoItem icon={<Shield className="h-3.5 w-3.5" />} label="Permissions" value={
                            cfg.permissionMode === 'supervised' ? 'Supervised (approval required)' : 'Auto (no approval)'
                          } />
                          <InfoItem icon={<GitBranch className="h-3.5 w-3.5" />} label="Working Dir" value={cfg.workingDir || '—'} className="col-span-2" />
                          <InfoItem icon={<Clock className="h-3.5 w-3.5" />} label="Connected" value={
                            cfg.lastConnectedAt ? new Date(cfg.lastConnectedAt).toLocaleString() : '—'
                          } />
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-xs text-zinc-500">No config reported yet — the agent hasn&apos;t connected or is running an older version.</p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-800 pt-3 font-mono text-[11px] text-zinc-600">
                        <span>Token ID: <span className="text-zinc-500">{t.id}</span></span>
                        <span className="text-zinc-700">&middot;</span>
                        <span>Created: <span className="text-zinc-500">{new Date(t.createdAt).toLocaleDateString()}</span></span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={`card-glow ${accent ? 'glow-accent border-green-500/30' : ''}`}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">{label}</p>
          <p className={`mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight ${accent ? 'text-green-400' : 'text-white'}`}>{value}</p>
        </div>
        <span className={accent ? 'text-green-500/80' : 'text-zinc-600'}>{icon}</span>
      </CardContent>
    </Card>
  )
}

function InfoItem({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
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
