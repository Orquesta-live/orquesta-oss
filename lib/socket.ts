import { Server as SocketIOServer, Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { db } from './db'
import crypto from 'crypto'

// Store on global so all Next.js module bundle instances share the same reference
declare global {
  // eslint-disable-next-line no-var
  var socketIO: SocketIOServer | undefined
}

export function getIO(): SocketIOServer {
  if (!global.socketIO) throw new Error('Socket.io not initialized. Call initSocketIO first.')
  return global.socketIO
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  if (global.socketIO) return global.socketIO

  global.socketIO = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/api/socket',
  })

  global.socketIO.on('connection', (socket: Socket) => {
    const clientType = socket.handshake.query.type as string | undefined

    if (clientType === 'agent') {
      handleAgentConnection(socket)
    } else {
      handleDashboardConnection(socket)
    }
  })

  console.log('[socket] Socket.io server initialized')
  return global.socketIO
}

// ── Agent connections ─────────────────────────────────────────────────────────

async function handleAgentConnection(socket: Socket) {
  const rawToken = socket.handshake.auth?.token as string | undefined
  if (!rawToken) {
    socket.emit('error', { message: 'No token provided' })
    socket.disconnect()
    return
  }

  const tokenHash = hashToken(rawToken)
  const agentToken = await db.agentToken.findFirst({
    where: { tokenHash, revokedAt: null },
    include: { project: true },
  })

  if (!agentToken) {
    socket.emit('error', { message: 'Invalid or revoked token' })
    socket.disconnect()
    return
  }

  const room = `project-${agentToken.projectId}`
  socket.join(room)
  socket.join(`agent-${agentToken.id}`)
  socket.data.agentTokenId = agentToken.id
  socket.data.projectId = agentToken.projectId
  socket.data.isAgent = true

  // Update lastSeenAt
  await db.agentToken.update({
    where: { id: agentToken.id },
    data: { lastSeenAt: new Date() },
  })

  // Notify dashboard that agent came online
  socket.to(room).emit('agent:online', { agentTokenId: agentToken.id, projectId: agentToken.projectId })
  console.log(`[socket] Agent connected: ${agentToken.name} (project ${agentToken.projectId})`)

  // ── Agent → Server events ─────────────────────────────────────────────────

  socket.on('log', async (data: {
    promptId: string
    level: string
    type: string
    message: string
    sequence: number
  }) => {
    try {
      await db.agentLog.create({
        data: {
          promptId: data.promptId,
          level: data.level || 'info',
          type: data.type || 'text',
          message: data.message,
          sequence: data.sequence || 0,
        },
      })
      // Forward to dashboard
      socket.to(room).emit('log', data)
    } catch (err) {
      console.error('[socket] Failed to save log:', err)
    }
  })

  socket.on('complete', async (data: {
    promptId: string
    exitCode: number
    tokensUsed?: number
    costCents?: number
    result?: string
  }) => {
    try {
      const status = data.exitCode === 0 ? 'completed' : 'failed'
      await db.prompt.update({
        where: { id: data.promptId },
        data: {
          status,
          completedAt: new Date(),
          tokensUsed: data.tokensUsed,
          costCents: data.costCents,
          result: data.result,
        },
      })
      socket.to(room).emit('prompt:update', {
        promptId: data.promptId,
        status,
        tokensUsed: data.tokensUsed,
        costCents: data.costCents,
      })
      console.log(`[socket] Prompt ${data.promptId} ${status}`)
    } catch (err) {
      console.error('[socket] Failed to update prompt on complete:', err)
    }
  })

  // Interactive session events — forward to dashboard
  socket.on('session:started', (data) => socket.to(room).emit('session:started', data))
  socket.on('session:output', (data) => socket.to(room).emit('session:output', data))
  socket.on('session:ended', (data) => socket.to(room).emit('session:ended', data))
  socket.on('session:error', (data) => socket.to(room).emit('session:error', data))

  socket.on('disconnect', () => {
    socket.to(room).emit('agent:offline', { agentTokenId: agentToken.id, projectId: agentToken.projectId })
    console.log(`[socket] Agent disconnected: ${agentToken.name}`)
  })
}

// ── Dashboard connections ─────────────────────────────────────────────────────

async function handleDashboardConnection(socket: Socket) {
  // Dashboard joins a project room after auth check
  socket.on('join:project', async (data: { projectId: string; sessionToken: string }) => {
    try {
      // Validate session token
      const session = await db.session.findFirst({
        where: { token: data.sessionToken, expiresAt: { gt: new Date() } },
        include: { user: true },
      })

      if (!session) {
        socket.emit('error', { message: 'Invalid session' })
        return
      }

      // Verify user is member of this project
      const member = await db.projectMember.findFirst({
        where: { userId: session.userId, projectId: data.projectId },
      })

      if (!member) {
        socket.emit('error', { message: 'Access denied' })
        return
      }

      const room = `project-${data.projectId}`
      socket.join(room)
      socket.data.userId = session.userId
      socket.data.projectId = data.projectId
      socket.emit('joined', { projectId: data.projectId })
    } catch (err) {
      console.error('[socket] Dashboard join error:', err)
    }
  })

  // Dashboard → Agent: interactive session
  socket.on('session:start', (data) => {
    const room = `project-${socket.data.projectId}`
    socket.to(room).emit('session:start', data)
  })
  socket.on('session:input', (data) => {
    const room = `project-${socket.data.projectId}`
    socket.to(room).emit('session:input', data)
  })
  socket.on('session:resize', (data) => {
    const room = `project-${socket.data.projectId}`
    socket.to(room).emit('session:resize', data)
  })
  socket.on('session:force_end', (data) => {
    const room = `project-${socket.data.projectId}`
    socket.to(room).emit('session:force_end', data)
  })
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
