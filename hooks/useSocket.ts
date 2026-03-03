'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  projectId: string
  sessionToken: string
}

export function useSocket({ projectId, sessionToken }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [agentOnline, setAgentOnline] = useState(false)

  useEffect(() => {
    if (!projectId || !sessionToken) return

    const socket = io('/', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join:project', { projectId, sessionToken })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('agent:online', () => setAgentOnline(true))
    socket.on('agent:offline', () => setAgentOnline(false))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [projectId, sessionToken])

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  return { socket: socketRef.current, connected, agentOnline, emit }
}
