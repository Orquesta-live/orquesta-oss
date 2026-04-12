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

  // Store agent config from handshake query
  const agentInfo = socket.handshake.query as Record<string, string>
  try {
    await db.agentConfig.upsert({
      where: { agentTokenId: agentToken.id },
      create: {
        agentTokenId: agentToken.id,
        projectId: agentToken.projectId,
        hostname: agentInfo.hostname || null,
        os: agentInfo.os || null,
        nodeVersion: agentInfo.nodeVersion || null,
        agentVersion: agentInfo.agentVersion || null,
        cliPreference: agentInfo.cliPreference || 'auto',
        permissionMode: agentInfo.permissionMode || 'auto',
        workingDir: agentInfo.workingDir || null,
        lastConnectedAt: new Date(),
      },
      update: {
        hostname: agentInfo.hostname || undefined,
        os: agentInfo.os || undefined,
        nodeVersion: agentInfo.nodeVersion || undefined,
        agentVersion: agentInfo.agentVersion || undefined,
        cliPreference: agentInfo.cliPreference || undefined,
        permissionMode: agentInfo.permissionMode || undefined,
        workingDir: agentInfo.workingDir || undefined,
        lastConnectedAt: new Date(),
      },
    })
  } catch (err) {
    console.error('[socket] Failed to save agent config:', err)
  }

  // Notify dashboard that agent came online
  socket.to(room).emit('agent:online', {
    agentTokenId: agentToken.id,
    projectId: agentToken.projectId,
    config: { hostname: agentInfo.hostname, cliPreference: agentInfo.cliPreference, permissionMode: agentInfo.permissionMode },
  })
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

  socket.on('git:commits', async (data: {
    promptId: string
    commits: Array<{
      hash: string
      message: string
      diff?: string
      filesChanged?: number
      insertions?: number
      deletions?: number
    }>
  }) => {
    try {
      for (const commit of data.commits) {
        await db.gitCommit.create({
          data: {
            projectId: agentToken.projectId,
            promptId: data.promptId,
            hash: commit.hash,
            message: commit.message,
            diff: commit.diff,
            filesChanged: commit.filesChanged || 0,
            insertions: commit.insertions || 0,
            deletions: commit.deletions || 0,
          },
        })
      }
      socket.to(room).emit('git:commits', {
        promptId: data.promptId,
        commits: data.commits,
      })
    } catch (err) {
      console.error('[socket] Failed to save git commits:', err)
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

      // Tell dashboard the current agent connection status immediately
      // so it doesn't have to wait for the next connect/disconnect event
      const roomSockets = await global.socketIO!.in(room).fetchSockets()
      const connectedAgents = roomSockets.filter((s) => s.data?.isAgent).length
      socket.emit('agent:status', { connectedAgents, projectId: data.projectId })
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
