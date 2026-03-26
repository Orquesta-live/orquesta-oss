'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils'
import {
  ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock,
  Search, Filter, GitCommit as GitCommitIcon, FileCode, Plus, Minus,
  Wrench, DollarSign, Brain, Eye, Edit3, FolderSearch, Terminal,
  Code, Timer, User as UserIcon,
} from 'lucide-react'
import { Socket } from 'socket.io-client'

// ── Types ──────────────────────────────────────────────────────────────────

interface Log {
  id: string
  level: string
  type: string
  message: string
  sequence: number
  createdAt: string
}

interface GitCommitData {
  id: string
  hash: string
  message: string
  diff?: string
  filesChanged: number
  insertions: number
  deletions: number
}

interface Prompt {
  id: string
  content: string
  status: string
  result?: string
  tokensUsed?: number
  costCents?: number
  source?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  user?: { id?: string; name: string; email: string }
  logs?: Log[]
  gitCommits?: GitCommitData[]
  _count?: { logs: number }
}

interface PromptTimelineProps {
  projectId: string
  socket: Socket | null
}

const STATUS_OPTIONS = ['all', 'pending', 'running', 'completed', 'failed'] as const

// ── Helpers ────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
  return <Clock className="h-4 w-4 text-zinc-500" />
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'green' | 'red' | 'yellow' | 'default'> = {
    completed: 'green', failed: 'red', running: 'yellow', pending: 'default',
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function formatCost(cents?: number): string {
  if (!cents) return ''
  return cents < 1 ? '<$0.01' : `$${(cents / 100).toFixed(2)}`
}

function formatDuration(start?: string, end?: string): string {
  if (!start || !end) return ''
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function UserAvatar({ name, email }: { name?: string; email?: string }) {
  const label = name || email || '?'
  const initial = label[0]?.toUpperCase() || '?'
  // Deterministic color from name
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-teal-600', 'bg-indigo-600']
  const idx = label.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  return (
    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${colors[idx]} text-[10px] font-bold text-white shrink-0`} title={label}>
      {initial}
    </div>
  )
}

// ── Parse raw log messages ─────────────────────────────────────────────────
// The paid agent sends raw Claude CLI stream-json lines as log messages.
// We parse them into structured segments for display.

interface ParsedLog {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result' | 'result' | 'system' | 'error'
  content: string
  toolName?: string
  toolInput?: string
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[><=][^\n]*/g, '').trim()
}

function parseLogMessage(log: Log): ParsedLog {
  const msg = stripAnsi(log.message)

  // Skip empty messages
  if (!msg || msg.length === 0) return { type: 'system', content: '' }

  // Already categorized by OSS standalone agent
  if (log.type === 'tool_use') {
    const m = msg.match(/^\[tool: (\w+)\]\s*(.*)/)
    return { type: 'tool_use', content: m?.[2] || msg, toolName: m?.[1] || 'tool' }
  }
  if (log.type === 'result') return { type: 'result', content: msg }
  if (log.type === 'system') return { type: 'system', content: msg }
  if (log.level === 'error') return { type: 'error', content: msg }

  // ── Emoji-prefixed messages from paid agent ────────────────────────────
  const thinkingMatch = msg.match(/💭\s*Thinking:\s*([\s\S]*)/)
  if (thinkingMatch) return { type: 'thinking', content: thinkingMatch[1].trim() }

  const toolMatch = msg.match(/🔧\s*Tool:\s*(\w+)/)
  if (toolMatch) {
    const inputMatch = msg.match(/Input:\s*(\{[\s\S]*)/i)
    return { type: 'tool_use', content: inputMatch?.[1] || msg, toolName: toolMatch[1], toolInput: inputMatch?.[1] }
  }

  const successMatch = msg.match(/✅\s*(?:Result:?\s*)?([\s\S]*)/)
  if (successMatch) return { type: 'result', content: successMatch[1].trim() }

  const errorMatch = msg.match(/❌\s*([\s\S]*)/)
  if (errorMatch) return { type: 'error', content: errorMatch[1].trim() }

  // ── Raw Claude CLI JSON (stream-json format) ───────────────────────────
  if (msg.startsWith('{')) {
    try {
      const parsed = JSON.parse(msg)

      // System init
      if (parsed.type === 'system' && parsed.subtype === 'init') {
        const cwd = parsed.cwd?.split('/').slice(-2).join('/') || parsed.cwd
        return { type: 'system', content: cwd ? `Session started in ${cwd}` : 'Session started' }
      }
      if (parsed.type === 'system') {
        return { type: 'system', content: parsed.subtype || parsed.message || `[${parsed.type}]` }
      }

      // Assistant message with content blocks
      if (parsed.type === 'assistant' && parsed.message?.content) {
        for (const block of parsed.message.content) {
          if (block.type === 'thinking') {
            return { type: 'thinking', content: block.thinking || block.text || '' }
          }
          if (block.type === 'text') {
            return { type: 'text', content: block.text }
          }
          if (block.type === 'tool_use') {
            const summary = getToolSummary(block.name, block.input)
            return {
              type: 'tool_use',
              content: summary,
              toolName: block.name,
              toolInput: JSON.stringify(block.input || {}, null, 2),
            }
          }
        }
      }

      // Tool result (user message with tool_result)
      if (parsed.type === 'user' && parsed.message?.content) {
        const contents = Array.isArray(parsed.message.content) ? parsed.message.content : [parsed.message.content]
        const toolResult = contents.find((c: { type: string }) => c.type === 'tool_result')
        if (toolResult) {
          let text = typeof toolResult.content === 'string' ? toolResult.content : JSON.stringify(toolResult.content)
          // Unescape literal \n to actual newlines for display
          text = text.replace(/\\n/g, '\n')
          if (toolResult.is_error) return { type: 'error', content: text }
          return { type: 'result', content: text }
        }
      }

      // Final result
      if (parsed.type === 'result') {
        if (parsed.subtype === 'success') {
          const text = typeof parsed.result === 'string' ? parsed.result : 'Completed successfully'
          return { type: 'result', content: text }
        }
        if (parsed.subtype === 'error') {
          return { type: 'error', content: parsed.error || 'Execution failed' }
        }
        const text = typeof parsed.result === 'string' ? parsed.result : JSON.stringify(parsed.result)
        return { type: 'result', content: text || 'Done' }
      }

      // Rate limit (skip)
      if (parsed.type === 'rate_limit_event') return { type: 'system', content: '' }

      // Generic
      if (parsed.type) return { type: 'system', content: `[${parsed.type}${parsed.subtype ? `:${parsed.subtype}` : ''}]` }
    } catch {
      // Not valid JSON — fall through
    }
  }

  return { type: 'text', content: msg }
}

// Summarize tool input for collapsed view
function getToolSummary(name: string, input: Record<string, unknown> | null | undefined): string {
  if (!input) return ''
  const n = name?.toLowerCase() || ''
  if ((n === 'read' || n === 'write' || n === 'edit') && input.file_path) {
    return String(input.file_path).split('/').pop() || String(input.file_path)
  }
  if (n === 'glob' && input.pattern) return String(input.pattern)
  if (n === 'grep' && input.pattern) return `"${String(input.pattern).slice(0, 30)}"`
  if (n === 'bash' && input.command) return String(input.command).slice(0, 50)
  if (n === 'websearch' && input.query) return `"${String(input.query).slice(0, 30)}"`
  return Object.keys(input).length > 0 ? JSON.stringify(input).slice(0, 60) : ''
}

// ── Tool icon helper ───────────────────────────────────────────────────────

function ToolIcon({ name }: { name: string }) {
  const n = name.toLowerCase()
  if (n === 'read') return <Eye className="h-3.5 w-3.5 text-blue-400" />
  if (n === 'write') return <Edit3 className="h-3.5 w-3.5 text-green-400" />
  if (n === 'edit') return <Edit3 className="h-3.5 w-3.5 text-yellow-400" />
  if (n === 'glob') return <FolderSearch className="h-3.5 w-3.5 text-purple-400" />
  if (n === 'grep') return <Search className="h-3.5 w-3.5 text-orange-400" />
  if (n === 'bash') return <Terminal className="h-3.5 w-3.5 text-zinc-400" />
  return <Wrench className="h-3.5 w-3.5 text-blue-400" />
}

// ── Single log line ────────────────────────────────────────────────────────

function LogLine({ log }: { log: Log }) {
  const [expanded, setExpanded] = useState(false)
  const parsed = parseLogMessage(log)

  if (parsed.type === 'thinking') {
    return (
      <div className="group">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full text-left"
        >
          {expanded ? <ChevronDown className="h-3 w-3 text-zinc-500" /> : <ChevronRight className="h-3 w-3 text-zinc-500" />}
          <Brain className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-purple-400 text-xs font-medium">Thinking</span>
          {!expanded && (
            <span className="text-zinc-600 text-xs truncate ml-1">{parsed.content.slice(0, 80)}...</span>
          )}
        </button>
        {expanded && (
          <div className="mt-1.5 ml-6 rounded border border-purple-900/30 bg-purple-950/20 p-2.5 text-xs text-purple-300/80 whitespace-pre-wrap leading-relaxed">
            {parsed.content}
          </div>
        )}
      </div>
    )
  }

  if (parsed.type === 'tool_use') {
    return (
      <div className="group">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full text-left"
        >
          {expanded ? <ChevronDown className="h-3 w-3 text-zinc-500" /> : <ChevronRight className="h-3 w-3 text-zinc-500" />}
          <ToolIcon name={parsed.toolName || 'tool'} />
          <span className="text-blue-400 text-xs font-medium">{parsed.toolName}</span>
          {!expanded && (
            <span className="text-zinc-500 text-xs truncate ml-1">{parsed.content.slice(0, 80)}</span>
          )}
        </button>
        {expanded && (
          <pre className="mt-1.5 ml-6 rounded border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all">
            {parsed.toolInput || parsed.content}
          </pre>
        )}
      </div>
    )
  }

  if (parsed.type === 'tool_result' || parsed.type === 'result') {
    const preview = parsed.content.split('\n')[0]?.slice(0, 120) || parsed.content.slice(0, 120)
    const isLong = parsed.content.length > 150 || parsed.content.split('\n').length > 3
    return (
      <div className="group">
        <button
          onClick={() => isLong && setExpanded(!expanded)}
          className={`flex items-center gap-1.5 w-full text-left ${isLong ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {isLong ? (
            expanded ? <ChevronDown className="h-3 w-3 text-zinc-500" /> : <ChevronRight className="h-3 w-3 text-zinc-500" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          )}
          {!isLong && <span className="text-green-400 text-xs">{parsed.content}</span>}
          {isLong && !expanded && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-400 text-xs truncate">{preview}</span>
              <span className="text-zinc-600 text-[10px] shrink-0 ml-1">({parsed.content.split('\n').length} lines)</span>
            </>
          )}
          {isLong && expanded && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-400 text-xs">Output</span>
              <span className="text-zinc-600 text-[10px] shrink-0 ml-1">({parsed.content.split('\n').length} lines)</span>
            </>
          )}
        </button>
        {expanded && (
          <pre className="mt-1.5 ml-6 rounded border border-zinc-800 bg-zinc-900 p-2.5 text-[11px] text-zinc-400 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto font-mono leading-relaxed">
            {parsed.content}
          </pre>
        )}
      </div>
    )
  }

  if (parsed.type === 'error') {
    return <div className="text-red-400 text-xs">{parsed.content}</div>
  }

  if (parsed.type === 'system') {
    return <div className="text-zinc-600 text-xs italic">{parsed.content}</div>
  }

  // Plain text
  return <div className="text-zinc-300 text-xs">{parsed.content}</div>
}

// ── Git commits ────────────────────────────────────────────────────────────

function GitCommits({ commits }: { commits: GitCommitData[] }) {
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  if (commits.length === 0) return null

  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
        <GitCommitIcon className="h-3.5 w-3.5" />
        {commits.length} commit{commits.length !== 1 ? 's' : ''}
      </p>
      <div className="space-y-1">
        {commits.map((c) => (
          <div key={c.id || c.hash}>
            <button
              onClick={() => setExpandedCommit(expandedCommit === c.hash ? null : c.hash)}
              className="flex items-center gap-2 text-left w-full hover:bg-zinc-800/50 rounded px-2 py-1.5 transition-colors"
            >
              <code className="text-[11px] text-yellow-500 font-mono shrink-0">{c.hash.slice(0, 7)}</code>
              <span className="text-xs text-zinc-300 truncate flex-1">{c.message}</span>
              <span className="flex items-center gap-2 text-[11px] shrink-0">
                <span className="text-zinc-500"><FileCode className="h-3 w-3 inline" /> {c.filesChanged}</span>
                {c.insertions > 0 && <span className="text-green-500">+{c.insertions}</span>}
                {c.deletions > 0 && <span className="text-red-500">-{c.deletions}</span>}
              </span>
            </button>
            {expandedCommit === c.hash && c.diff && (
              <pre className="mt-1 ml-2 rounded bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap font-mono">
                {c.diff}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Prompt card ────────────────────────────────────────────────────────────

function PromptCard({ prompt, socket, isLatestRunning }: { prompt: Prompt; socket: Socket | null; isLatestRunning: boolean }) {
  const [expanded, setExpanded] = useState(isLatestRunning)
  const [logs, setLogs] = useState<Log[]>(prompt.logs || [])
  const [gitCommits, setGitCommits] = useState<GitCommitData[]>(prompt.gitCommits || [])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const logsEndRef = useMemo(() => ({ current: null as HTMLDivElement | null }), [])

  // Auto-expand when prompt starts running
  useEffect(() => {
    if (prompt.status === 'running' && !expanded) setExpanded(true)
  }, [prompt.status])

  // Real-time log streaming
  useEffect(() => {
    if (!socket || !expanded) return

    const handleLog = (data: { promptId: string; level: string; type: string; message: string; sequence: number }) => {
      if (data.promptId !== prompt.id) return
      setLogs((prev) => {
        if (prev.some((l) => l.sequence === data.sequence && l.message === data.message)) return prev
        const newLog: Log = {
          id: `live-${data.sequence}-${Date.now()}`,
          level: data.level,
          type: data.type,
          message: data.message,
          sequence: data.sequence,
          createdAt: new Date().toISOString(),
        }
        return [...prev, newLog].sort((a, b) => a.sequence - b.sequence)
      })
      // Only auto-scroll if user is near the bottom (not reading earlier logs)
      setTimeout(() => {
        const container = logsContainerRef.current
        if (!container) return
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
        if (isNearBottom) {
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      }, 50)
    }

    const handleCommits = (data: { promptId: string; commits: GitCommitData[] }) => {
      if (data.promptId !== prompt.id) return
      setGitCommits(data.commits)
    }

    socket.on('log', handleLog)
    socket.on('git:commits', handleCommits)
    return () => {
      socket.off('log', handleLog)
      socket.off('git:commits', handleCommits)
    }
  }, [socket, expanded, prompt.id])

  const toggle = async () => {
    if (!expanded && logs.length === 0) {
      setLoadingLogs(true)
      try {
        const res = await fetch(`/api/prompts/${prompt.id}`)
        if (res.ok) {
          const data = await res.json()
          setLogs(data.logs || [])
          setGitCommits(data.gitCommits || [])
        }
      } finally {
        setLoadingLogs(false)
      }
    }
    setExpanded(!expanded)
  }

  const cost = formatCost(prompt.costCents)
  const duration = formatDuration(prompt.startedAt, prompt.completedAt)
  const userName = prompt.user?.name || prompt.user?.email || 'Unknown'

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button onClick={toggle} className="flex w-full items-start gap-3 p-4 text-left hover:bg-zinc-800/30 transition-colors">
        <div className="mt-0.5 shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
        </div>

        {/* User avatar */}
        <UserAvatar name={prompt.user?.name} email={prompt.user?.email} />

        <div className="flex-1 min-w-0">
          {/* Who + when */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-zinc-300">{userName}</span>
            <span className="text-[11px] text-zinc-600">{formatRelative(prompt.createdAt)}</span>
            {prompt.source && prompt.source !== 'dashboard' && (
              <Badge variant="default" className="text-[9px] px-1.5 py-0">{prompt.source}</Badge>
            )}
          </div>

          {/* Prompt content */}
          <p className="text-sm text-white leading-relaxed">{prompt.content}</p>

          {/* Status bar */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={prompt.status} />
            {duration && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                <Timer className="h-3 w-3" />{duration}
              </span>
            )}
            {prompt.tokensUsed != null && prompt.tokensUsed > 0 && (
              <span className="text-[11px] text-zinc-500">{prompt.tokensUsed.toLocaleString()} tokens</span>
            )}
            {cost && (
              <span className="text-[11px] text-zinc-500">{cost}</span>
            )}
          </div>
        </div>

        <StatusIcon status={prompt.status} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800">
          {/* Logs */}
          <div className="px-4 pb-4">
            {loadingLogs ? (
              <div className="flex items-center gap-2 pt-3 text-xs text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <p className="pt-3 text-xs text-zinc-600">No logs recorded for this prompt.</p>
            ) : (
              <div ref={logsContainerRef} className="mt-3 space-y-1.5 rounded-lg bg-zinc-950 border border-zinc-800 p-3 max-h-[500px] overflow-y-auto">
                {logs.map((log) => {
                  const parsed = parseLogMessage(log)
                  if (!parsed.content) return null
                  return <LogLine key={log.id} log={log} />
                })}
                {prompt.status === 'running' && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-yellow-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Agent is working...
                  </div>
                )}
                <div ref={(el) => { logsEndRef.current = el }} />
              </div>
            )}

            {/* Final result */}
            {prompt.result && (
              <div className="mt-3 rounded-lg bg-green-950/30 border border-green-900/40 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-medium text-green-400">Result</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{prompt.result}</p>
              </div>
            )}

            {/* Git commits */}
            <GitCommits commits={gitCommits} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Timeline ───────────────────────────────────────────────────────────────

export function PromptTimeline({ projectId, socket }: PromptTimelineProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const loadPrompts = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/prompts?limit=100`)
      if (res.ok) {
        const data = await res.json()
        setPrompts(data.prompts)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPrompts() }, [projectId])

  useEffect(() => {
    if (!socket) return

    const handleNew = (prompt: Prompt) => {
      setPrompts((prev) => {
        if (prev.some((p) => p.id === prompt.id)) return prev
        return [prompt, ...prev]
      })
    }

    const handleUpdate = (data: { promptId: string; status: string; tokensUsed?: number; costCents?: number }) => {
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === data.promptId
            ? { ...p, status: data.status, tokensUsed: data.tokensUsed, costCents: data.costCents }
            : p
        )
      )
    }

    socket.on('prompt:new', handleNew)
    socket.on('prompt:update', handleUpdate)
    return () => {
      socket.off('prompt:new', handleNew)
      socket.off('prompt:update', handleUpdate)
    }
  }, [socket])

  const filtered = useMemo(() => {
    let result = prompts
    if (statusFilter !== 'all') result = result.filter((p) => p.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) =>
        p.content.toLowerCase().includes(q) ||
        p.user?.name?.toLowerCase().includes(q) ||
        p.user?.email?.toLowerCase().includes(q)
      )
    }
    return result
  }, [prompts, statusFilter, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading prompts...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search + filter */}
      {prompts.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-zinc-500">No prompts yet.</p>
          <p className="mt-1 text-sm text-zinc-600">Submit a prompt above to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Filter className="h-8 w-8 text-zinc-600 mb-2" />
          <p className="text-zinc-500">No prompts match your filter.</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all') }}
            className="mt-2 text-sm text-green-500 hover:text-green-400"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => (
            <PromptCard
              key={p.id}
              prompt={p}
              socket={socket}
              isLatestRunning={i === 0 && p.status === 'running'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
