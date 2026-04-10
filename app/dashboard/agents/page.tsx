'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Bot, Wifi, WifiOff, Terminal, Copy, Check, Trash2, RefreshCw,
  Cpu, HardDrive, MemoryStick, Clock, ChevronDown, ChevronUp, Settings2
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
}

interface SystemHealth {
  hostname: string
  uptime: number
  cpu: { count: number; usage: number }
  memory: { total: number; used: number; free: number }
  disk: { total: number; used: number; free: number }
}

export default function AgentsPage() {
  const [tokens, setTokens] = useState<AgentToken[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
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

  const copyCommand = (token: string, id: string) => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    navigator.clipboard.writeText(
      `node agent/index.js --url ${url} --token ${token}`
    )
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const revokeToken = async (id: string) => {
    if (!confirm('Revoke this agent token? The agent will disconnect.')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    load()
  }

  const onlineCount = tokens.filter(t => t.agentOnline).length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Agent Manager</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {onlineCount} of {tokens.length} agents online
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Start */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400">Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-zinc-500">Connect an agent to your project:</p>
          <div className="bg-zinc-950 rounded-lg p-3 font-mono text-xs text-green-400">
            node agent/index.js --url {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'} --token {'<your-token>'}
          </div>
          <p className="text-zinc-600 text-xs">
            Generate tokens in Project Settings &gt; Team &gt; Agents section.
          </p>
        </CardContent>
      </Card>

      {/* Agent List */}
      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading agents...</div>
      ) : tokens.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50 border-dashed">
          <CardContent className="text-center py-16">
            <Bot size={40} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">No agent tokens</h3>
            <p className="text-xs text-zinc-500">Create tokens in your project settings to connect agents</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tokens.map(t => (
            <Card
              key={t.id}
              className={`border-zinc-800 bg-zinc-900/50 transition-colors ${
                t.agentOnline ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-zinc-700'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      t.agentOnline ? 'bg-green-500/10' : 'bg-zinc-800'
                    }`}>
                      {t.agentOnline ? <Wifi size={16} className="text-green-400" /> : <WifiOff size={16} className="text-zinc-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{t.name}</span>
                        <Badge variant={t.agentOnline ? 'default' : 'secondary'} className={`text-[10px] ${
                          t.agentOnline ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''
                        }`}>
                          {t.agentOnline ? 'online' : 'offline'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span>{t.projectName}</span>
                        {t.lastSeen && <span>Last seen: {new Date(t.lastSeen).toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    >
                      {expandedId === t.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </Button>
                    {!t.revokedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                        onClick={() => revokeToken(t.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded section */}
                {expandedId === t.id && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500">Token ID</span>
                        <p className="text-zinc-300 font-mono mt-0.5">{t.id}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Project</span>
                        <p className="text-zinc-300 mt-0.5">{t.projectName}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Created</span>
                        <p className="text-zinc-300 mt-0.5">{new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Status</span>
                        <p className="text-zinc-300 mt-0.5">{t.revokedAt ? 'Revoked' : 'Active'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
