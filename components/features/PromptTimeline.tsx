'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { Socket } from 'socket.io-client'

interface Log {
  id: string
  level: string
  type: string
  message: string
  sequence: number
  createdAt: string
}

interface Prompt {
  id: string
  content: string
  status: string
  result?: string
  tokensUsed?: number
  costCents?: number
  createdAt: string
  completedAt?: string
  user?: { name: string; email: string }
  logs?: Log[]
  _count?: { logs: number }
}

interface PromptTimelineProps {
  projectId: string
  socket: Socket | null
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
  return <Clock className="h-4 w-4 text-zinc-500" />
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, 'green' | 'red' | 'yellow' | 'default'> = {
    completed: 'green',
    failed: 'red',
    running: 'yellow',
    pending: 'default',
  }
  return <Badge variant={variantMap[status] ?? 'default'}>{status}</Badge>
}

function PromptItem({ prompt, onExpand }: { prompt: Prompt; onExpand: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [logs, setLogs] = useState<Log[]>(prompt.logs || [])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const toggle = async () => {
    if (!expanded && logs.length === 0) {
      setLoadingLogs(true)
      try {
        const res = await fetch(`/api/prompts/${prompt.id}`)
        if (res.ok) {
          const data = await res.json()
          setLogs(data.logs || [])
        }
      } finally {
        setLoadingLogs(false)
      }
    }
    setExpanded((p) => !p)
    onExpand(prompt.id)
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/50">
      <button
        onClick={toggle}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-zinc-800/40 transition-colors"
      >
        <div className="mt-0.5 shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          )}
        </div>
        <StatusIcon status={prompt.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{prompt.content}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={prompt.status} />
            <span className="text-xs text-zinc-500">{formatRelative(prompt.createdAt)}</span>
            {prompt.user && (
              <span className="text-xs text-zinc-600">{prompt.user.name || prompt.user.email}</span>
            )}
            {prompt.tokensUsed && (
              <span className="text-xs text-zinc-500">{prompt.tokensUsed.toLocaleString()} tokens</span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 pb-4">
          {loadingLogs ? (
            <div className="flex items-center gap-2 pt-3 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading logs…
            </div>
          ) : logs.length === 0 ? (
            <p className="pt-3 text-xs text-zinc-600">No logs yet.</p>
          ) : (
            <div className="mt-3 max-h-96 overflow-y-auto rounded-md bg-zinc-950 p-3 font-mono text-xs space-y-0.5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={
                    log.level === 'error'
                      ? 'text-red-400'
                      : log.type === 'tool_use'
                      ? 'text-blue-400'
                      : log.type === 'result'
                      ? 'text-green-400'
                      : 'text-zinc-300'
                  }
                >
                  {log.message}
                </div>
              ))}
            </div>
          )}
          {prompt.result && (
            <div className="mt-3 rounded-md bg-green-950/40 border border-green-900/50 p-3">
              <p className="text-xs font-medium text-green-400 mb-1">Result</p>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap">{prompt.result}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PromptTimeline({ projectId, socket }: PromptTimelineProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)

  const loadPrompts = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/prompts`)
      if (res.ok) {
        const data = await res.json()
        setPrompts(data.prompts)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrompts()
  }, [projectId])

  // Real-time updates
  useEffect(() => {
    if (!socket) return

    const handleUpdate = (data: { promptId: string; status: string; tokensUsed?: number; costCents?: number }) => {
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === data.promptId
            ? { ...p, status: data.status, tokensUsed: data.tokensUsed, costCents: data.costCents }
            : p
        )
      )
    }

    socket.on('prompt:update', handleUpdate)
    return () => { socket.off('prompt:update', handleUpdate) }
  }, [socket])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading prompts…
      </div>
    )
  }

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-zinc-500">No prompts yet.</p>
        <p className="mt-1 text-sm text-zinc-600">Submit a prompt above to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {prompts.map((p) => (
        <PromptItem key={p.id} prompt={p} onExpand={() => {}} />
      ))}
    </div>
  )
}
