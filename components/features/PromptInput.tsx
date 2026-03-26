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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              agentOnline
                ? 'Enter a prompt for your agent… (⌘+Enter to send)'
                : 'Agent offline — connect it first to submit prompts'
            }
            disabled={!agentOnline || loading}
            rows={3}
            className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
          />
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
        <Button
          onClick={submit}
          disabled={!agentOnline || !content.trim() || loading}
          size="icon"
          className="mt-0.5 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${agentOnline ? 'bg-green-500' : 'bg-zinc-600'}`} />
        <span className="text-xs text-zinc-500">
          {agentOnline ? 'Agent online' : 'Agent offline'}
        </span>
      </div>
    </div>
  )
}
