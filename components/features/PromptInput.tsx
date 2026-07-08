'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Send, Loader2 } from 'lucide-react'

interface PromptInputProps {
  projectId: string
  agentOnline: boolean
  onSubmitted?: (promptId: string) => void
}

export function PromptInput({ projectId, agentOnline, onSubmitted }: PromptInputProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  const submit = async () => {
    const trimmed = content.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit prompt')
      }

      const data = await res.json()
      setContent('')
      toast('success', 'Prompt submitted')
      onSubmitted?.(data.prompt.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      toast('error', msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="elevated rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors focus-within:border-zinc-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">New prompt</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${agentOnline ? 'bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]' : 'bg-zinc-600'}`} />
          <span className="text-xs text-zinc-500">
            {agentOnline ? 'Agent online' : 'Agent offline'}
          </span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          agentOnline
            ? 'Describe a task for your agent…'
            : 'Agent offline — connect it first to submit prompts'
        }
        disabled={!agentOnline || loading}
        rows={3}
        className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-white shadow-inner shadow-black/20 transition-colors placeholder:text-zinc-500 focus:border-green-600/60 focus:outline-none focus:ring-2 focus:ring-green-600/40 disabled:opacity-50"
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-xs text-zinc-600">
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">⌘</kbd>
          <span className="mx-1">+</span>
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Enter</kbd>
          <span className="ml-2 text-zinc-500">to send</span>
        </span>
        <Button
          onClick={submit}
          disabled={!agentOnline || !content.trim() || loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
