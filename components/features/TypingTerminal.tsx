'use client'

import { useEffect, useRef, useState } from 'react'

/* A scripted transcript that types itself out on a loop.
   Each line either types character-by-character ($ commands, typed by a "user")
   or streams in whole (agent output). The blinking caret trails the active line. */

type Line = {
  /** how the line is rendered */
  kind: 'prompt' | 'ok' | 'run' | 'edit' | 'push' | 'comment'
  text: string
  /** true = reveal char-by-char (typed), false = appear at once (streamed output) */
  typed: boolean
}

const SCRIPT: Line[] = [
  { kind: 'prompt', text: 'orquesta-agent init --token oat_••••', typed: true },
  { kind: 'ok', text: 'agent online · project "web"', typed: false },
  { kind: 'run', text: 'orquesta run "add rate limiting to the API"', typed: true },
  { kind: 'edit', text: 'editing lib/rate-limit.ts', typed: false },
  { kind: 'edit', text: 'editing app/api/route.ts', typed: false },
  { kind: 'push', text: '3 files changed · pushed to main', typed: false },
]

const TYPE_MS = 42 // per character
const AFTER_TYPED_MS = 600 // pause after a typed command finishes
const AFTER_STREAM_MS = 520 // pause after a streamed line appears
const LOOP_HOLD_MS = 2600 // hold the full transcript before restarting

function prefixFor(kind: Line['kind']) {
  switch (kind) {
    case 'prompt':
    case 'run':
      return <span className="select-none text-green-400">$</span>
    case 'comment':
      return <span className="select-none text-zinc-600">#</span>
    case 'ok':
    case 'push':
      return <span className="select-none text-green-400">✓</span>
    case 'edit':
      return <span className="select-none text-green-500">●</span>
  }
}

function lineTextClass(kind: Line['kind']) {
  switch (kind) {
    case 'prompt':
    case 'run':
      return 'text-zinc-100'
    case 'ok':
    case 'push':
      return 'text-green-300'
    case 'edit':
      return 'text-zinc-400'
    case 'comment':
      return 'text-zinc-600'
  }
}

function RenderedLine({
  line,
  text,
  caret,
}: {
  line: Line
  text: string
  caret: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 leading-relaxed">
      <span className="mt-px shrink-0">{prefixFor(line.kind)}</span>
      <span className={`min-w-0 break-words ${lineTextClass(line.kind)}`}>
        {text}
        {caret && <span className="caret ml-0.5" aria-hidden="true">&nbsp;</span>}
      </span>
    </div>
  )
}

export default function TypingTerminal() {
  const prefersReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // completed lines (fully shown) + the currently-animating line's partial text
  const [completed, setCompleted] = useState<number>(prefersReduced ? SCRIPT.length : 0)
  const [partial, setPartial] = useState<string>('')
  const [activeIdx, setActiveIdx] = useState<number>(prefersReduced ? -1 : 0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (prefersReduced) return

    let cancelled = false
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
      timers.current.push(t)
    }

    const runLine = (idx: number) => {
      if (cancelled) return
      if (idx >= SCRIPT.length) {
        // hold, then reset the loop
        schedule(() => {
          setCompleted(0)
          setPartial('')
          setActiveIdx(0)
          runLine(0)
        }, LOOP_HOLD_MS)
        return
      }

      setActiveIdx(idx)
      const line = SCRIPT[idx]

      if (line.typed) {
        let ch = 0
        const step = () => {
          if (cancelled) return
          ch += 1
          setPartial(line.text.slice(0, ch))
          if (ch < line.text.length) {
            schedule(step, TYPE_MS)
          } else {
            schedule(() => {
              setCompleted(idx + 1)
              setPartial('')
              runLine(idx + 1)
            }, AFTER_TYPED_MS)
          }
        }
        setPartial('')
        schedule(step, TYPE_MS)
      } else {
        // streamed: appears whole
        setPartial(line.text)
        schedule(() => {
          setCompleted(idx + 1)
          setPartial('')
          runLine(idx + 1)
        }, AFTER_STREAM_MS)
      }
    }

    runLine(0)

    return () => {
      cancelled = true
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="glass elevated overflow-hidden rounded-xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <span className="h-3 w-3 rounded-full bg-green-500/70" />
        <span className="ml-2 font-mono text-xs text-zinc-400">bash — orquesta</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-green-300">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 glow-accent" />
          live
        </span>
      </div>

      {/* Transcript */}
      <div className="space-y-2 p-5 font-mono text-sm sm:text-[13px] min-h-[13.5rem]">
        {SCRIPT.map((line, i) => {
          if (i < completed) {
            return <RenderedLine key={i} line={line} text={line.text} caret={false} />
          }
          if (i === activeIdx) {
            const isLastLine = i === SCRIPT.length - 1
            const doneTyping = partial === line.text
            return (
              <RenderedLine
                key={i}
                line={line}
                text={partial}
                caret={line.typed ? !doneTyping || !isLastLine : false}
              />
            )
          }
          return null
        })}

        {/* Trailing prompt with caret once the whole transcript is shown */}
        {completed >= SCRIPT.length && (
          <div className="flex items-center gap-2.5 pt-0.5">
            <span className="select-none text-green-400">$</span>
            <span className="caret" aria-hidden="true">&nbsp;</span>
          </div>
        )}
      </div>
    </div>
  )
}
