'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import type { LayoutItem, ResponsiveLayouts } from 'react-grid-layout'
import { Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Plus, X, Maximize2 } from 'lucide-react'

interface GridCell {
  id: string
}

interface TerminalCellProps {
  cellId: string
  socket: Socket | null
  onClose: () => void
}

function TerminalCell({ cellId, socket, onClose }: TerminalCellProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<import('@xterm/xterm').Terminal | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return

    let term: import('@xterm/xterm').Terminal
    let mounted = true

    async function initTerminal() {
      const xtermModule = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      // Dynamic CSS import — xterm ships its own CSS
      if (typeof document !== 'undefined' && !document.getElementById('xterm-css')) {
        const link = document.createElement('link')
        link.id = 'xterm-css'
        link.rel = 'stylesheet'
        link.href = '/_next/static/css/xterm.css'
        // Fallback: import from node_modules path via a style tag
        try {
          const css = (await fetch('/api/xterm-css').then((r) => r.text()).catch(() => ''))
          if (css) {
            const style = document.createElement('style')
            style.id = 'xterm-css'
            style.textContent = css
            document.head.appendChild(style)
          }
        } catch {}
      }

      if (!mounted || !containerRef.current) return

      term = new xtermModule.Terminal({
        theme: {
          background: '#09090b',
          foreground: '#e4e4e7',
          cursor: '#22c55e',
        },
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 13,
        cursorBlink: true,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      fitAddon.fit()
      termRef.current = term

      const resizeObserver = new ResizeObserver(() => fitAddon.fit())
      resizeObserver.observe(containerRef.current)

      term.writeln('\x1b[32mOrquesta OSS — Interactive Terminal\x1b[0m')
      term.writeln('\x1b[90mWaiting for agent connection…\x1b[0m')
      term.writeln('')

      const sessionId = `sess-${cellId}-${Date.now()}`
      sessionIdRef.current = sessionId
      socket?.emit('session:start', { sessionId, cellId })

      term.onData((data) => {
        socket?.emit('session:input', { sessionId: sessionIdRef.current, data })
      })

      return () => resizeObserver.disconnect()
    }

    const cleanup = initTerminal()

    return () => {
      mounted = false
      cleanup.then((fn) => fn?.())
      term?.dispose()
      if (sessionIdRef.current) {
        socket?.emit('session:force_end', { sessionId: sessionIdRef.current })
      }
    }
  }, [cellId, socket])

  useEffect(() => {
    if (!socket) return

    const handleOutput = (data: { sessionId: string; data: string }) => {
      if (data.sessionId !== sessionIdRef.current) return
      termRef.current?.write(data.data)
    }
    const handleEnded = (data: { sessionId: string }) => {
      if (data.sessionId !== sessionIdRef.current) return
      termRef.current?.writeln('\r\n\x1b[90m[Session ended]\x1b[0m')
    }
    const handleError = (data: { sessionId: string; message: string }) => {
      if (data.sessionId !== sessionIdRef.current) return
      termRef.current?.writeln(`\r\n\x1b[31m[Error: ${data.message}]\x1b[0m`)
    }

    socket.on('session:output', handleOutput)
    socket.on('session:ended', handleEnded)
    socket.on('session:error', handleError)

    return () => {
      socket.off('session:output', handleOutput)
      socket.off('session:ended', handleEnded)
      socket.off('session:error', handleError)
    }
  }, [socket])

  return (
    <div className="flex h-full flex-col rounded-md border border-zinc-800 bg-[#09090b] overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5 drag-handle cursor-grab active:cursor-grabbing">
        <span className="text-xs font-mono text-zinc-400">Terminal {cellId.slice(-4)}</span>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 p-1 overflow-hidden" />
    </div>
  )
}

const STORAGE_KEY = 'orquesta-grid-layout-v2'

interface AgentGridProps {
  socket: Socket | null
}

function AgentGridInner({ socket, containerWidth }: AgentGridProps & { containerWidth: number }) {
  const [cells, setCells] = useState<GridCell[]>([])
  const [layouts, setLayouts] = useState<ResponsiveLayouts>({ lg: [] })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setLayouts(JSON.parse(saved))
    } catch {}
  }, [])

  const addCell = useCallback(() => {
    const id = `cell-${Date.now()}`
    setCells((prev) => [...prev, { id }])
    setLayouts((prev) => {
      const lgLayouts = (prev.lg || []) as LayoutItem[]
      const col = lgLayouts.length % 3
      const newItem: LayoutItem = { i: id, x: col * 4, y: Infinity, w: 4, h: 8, minW: 2, minH: 4 }
      return { ...prev, lg: [...lgLayouts, newItem] }
    })
  }, [])

  const removeCell = useCallback((id: string) => {
    setCells((prev) => prev.filter((c) => c.id !== id))
    setLayouts((prev) => ({
      ...prev,
      lg: ((prev.lg || []) as LayoutItem[]).filter((l) => l.i !== id),
    }))
  }, [])

  const handleLayoutChange = (_layout: unknown, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts))
    } catch {}
  }

  if (cells.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-full bg-zinc-800 p-4 mb-4">
          <Maximize2 className="h-8 w-8 text-zinc-500" />
        </div>
        <p className="text-zinc-400 font-medium">Agent Grid</p>
        <p className="mt-1 text-sm text-zinc-600 max-w-xs">
          Add terminal panels to interact with your agent in parallel sessions.
        </p>
        <Button onClick={addCell} className="mt-6" size="sm">
          <Plus className="h-4 w-4" /> Add Terminal
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={addCell} size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Add Terminal
        </Button>
      </div>

      <ResponsiveGridLayout
        width={containerWidth}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={40}
        onLayoutChange={handleLayoutChange}
        dragConfig={{ enabled: true, handle: '.drag-handle', bounded: true }}
        resizeConfig={{ enabled: true }}
      >
        {cells.map((cell) => (
          <div key={cell.id} className="h-full">
            <TerminalCell
              cellId={cell.id}
              socket={socket}
              onClose={() => removeCell(cell.id)}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}

export function AgentGrid({ socket }: AgentGridProps) {
  const { containerRef, width } = useContainerWidth()

  return (
    <div ref={containerRef}>
      {width > 0 && <AgentGridInner socket={socket} containerWidth={width} />}
    </div>
  )
}
