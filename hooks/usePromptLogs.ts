'use client'

import { useEffect, useState, useRef } from 'react'
import { Socket } from 'socket.io-client'

export interface LogEntry {
  promptId: string
  level: string
  type: string
  message: string
  sequence: number
}

export function usePromptLogs(socket: Socket | null, promptId: string | null) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const seenRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!socket || !promptId) return

    const handleLog = (data: LogEntry) => {
      if (data.promptId !== promptId) return
      const key = `${data.sequence}-${data.message.slice(0, 20)}`
      if (seenRef.current.has(key)) return
      seenRef.current.add(key)
      setLogs((prev) => [...prev, data])
    }

    socket.on('log', handleLog)
    return () => { socket.off('log', handleLog) }
  }, [socket, promptId])

  const clearLogs = () => {
    setLogs([])
    seenRef.current.clear()
  }

  return { logs, clearLogs }
}
