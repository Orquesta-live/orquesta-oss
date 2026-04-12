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
  const url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Agents</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {onlineCount > 0
              ? <><span className="text-green-400">{onlineCount} online</span> of {tokens.length} agents</>
              : `${tokens.length} agent${tokens.length !== 1 ? 's' : ''} configured`
            }
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Quick connect */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-4">
          <p className="text-xs text-zinc-500 mb-2">Connect an agent:</p>
          <div className="bg-zinc-950 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto whitespace-nowrap">
            ORQUESTA_API_URL={url} npx orquesta-agent --token {'<token>'} --cli-preference claude
          </div>
        </CardContent>
      </Card>

      {/* Agent list */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-sm">Loading agents...</div>
      ) : tokens.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50 border-dashed">
          <CardContent className="text-center py-16">
            <Bot size={36} className="mx-auto text-zinc-600 mb-3" />
            <h3 className="text-sm font-medium text-zinc-300">No agents</h3>
            <p className="text-xs text-zinc-500 mt-1">Create a token in Project Settings to connect agents</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tokens.map(t => {
            const isExpanded = expandedId === t.id
            const cfg = t.config

            return (
              <Card
                key={t.id}
                className={`border-zinc-800 bg-zinc-900/50 overflow-hidden transition-colors ${
                  t.agentOnline ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-zinc-700'
                }`}
              >
                <CardContent className="p-0">
                  {/* Main row */}
                  <div className="flex items-center justify-between p-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        t.agentOnline ? 'bg-green-500/10' : 'bg-zinc-800'
                      }`}>
                        {t.agentOnline
                          ? <Wifi size={15} className="text-green-400" />
                          : <WifiOff size={15} className="text-zinc-500" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white truncate">{t.name}</span>
                          <Badge variant={t.agentOnline ? 'green' : 'default'} className="text-[10px]">
                            {t.agentOnline ? 'online' : 'offline'}
                          </Badge>
                          {cfg && (
                            <>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                cfg.cliPreference === 'claude'
                                  ? 'bg-orange-500/10 text-orange-400'
                                  : cfg.cliPreference === 'orquesta'
                                  ? 'bg-purple-500/10 text-purple-400'
                                  : 'bg-zinc-700/50 text-zinc-400'
                              }`}>
                                {cfg.cliPreference === 'claude' ? 'Claude CLI' : cfg.cliPreference === 'orquesta' ? 'Orquesta CLI' : 'Auto'}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                cfg.permissionMode === 'supervised'
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : 'bg-zinc-700/50 text-zinc-400'
                              }`}>
                                {cfg.permissionMode === 'supervised' ? 'Supervised' : 'Auto'}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                          <span>{t.projectName}</span>
                          {cfg?.hostname && <span className="text-zinc-600">{cfg.hostname}</span>}
                          {t.lastSeen && <span>{new Date(t.lastSeen).toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                        onClick={() => revokeToken(t.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 bg-zinc-950/50 p-4">
                      {cfg ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <InfoItem icon={<Monitor size={13} />} label="Hostname" value={cfg.hostname || '-'} />
                          <InfoItem icon={<Cpu size={13} />} label="OS" value={cfg.os || '-'} />
                          <InfoItem icon={<Terminal size={13} />} label="Node.js" value={cfg.nodeVersion || '-'} />
                          <InfoItem icon={<Bot size={13} />} label="Agent" value={cfg.agentVersion ? `v${cfg.agentVersion}` : '-'} />
                          <InfoItem icon={<Zap size={13} />} label="LLM Engine" value={
                            cfg.cliPreference === 'claude' ? 'Claude CLI (Anthropic)'
                            : cfg.cliPreference === 'orquesta' ? 'Orquesta CLI (multi-model)'
                            : 'Auto (best available)'
                          } />
                          <InfoItem icon={<Shield size={13} />} label="Permissions" value={
                            cfg.permissionMode === 'supervised' ? 'Supervised (approval required)' : 'Auto (no approval)'
                          } />
                          <InfoItem icon={<GitBranch size={13} />} label="Working Dir" value={cfg.workingDir || '-'} className="col-span-2" />
                          <InfoItem icon={<Clock size={13} />} label="Connected" value={
                            cfg.lastConnectedAt ? new Date(cfg.lastConnectedAt).toLocaleString() : '-'
                          } />
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-zinc-500">No config data — agent hasn&apos;t connected yet or is using an older version</p>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-zinc-800">
                        <p className="text-[11px] text-zinc-600 font-mono">
                          Token ID: {t.id} &middot; Created: {new Date(t.createdAt).toLocaleDateString()}
                        </p>
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

function InfoItem({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-2 ${className || ''}`}>
      <span className="text-zinc-500 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-zinc-300 font-mono">{value}</p>
      </div>
    </div>
  )
}
