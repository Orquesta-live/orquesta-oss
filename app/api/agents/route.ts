import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getIO } from '@/lib/socket'

// GET: List all agent tokens with online status
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Get all projects the user has access to
  const memberships = await db.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  })

  const projectIds = memberships.map(m => m.projectId)

  // Get all agent tokens for those projects
  const tokens = await db.agentToken.findMany({
    where: {
      projectId: { in: projectIds },
      revokedAt: null,
    },
    include: { project: { select: { name: true } }, config: true },
    orderBy: { createdAt: 'desc' },
  })

  // Check which agents are online via Socket.io rooms
  const io = getIO()
  const result = tokens.map(t => {
    const room = `project:${t.projectId}`
    const roomSockets = io.sockets.adapter.rooms.get(room)
    // Agent is considered online if there's at least one socket in the room
    // and lastSeenAt is recent (within 3 minutes)
    const recentlySeen = t.lastSeenAt && (Date.now() - new Date(t.lastSeenAt).getTime()) < 3 * 60 * 1000
    const agentOnline = !!recentlySeen

    return {
      id: t.id,
      name: t.name,
      projectId: t.projectId,
      projectName: t.project.name,
      createdAt: t.createdAt.toISOString(),
      revokedAt: t.revokedAt?.toISOString() || null,
      lastSeen: t.lastSeenAt?.toISOString() || null,
      agentOnline,
      config: t.config ? {
        hostname: t.config.hostname,
        os: t.config.os,
        nodeVersion: t.config.nodeVersion,
        agentVersion: t.config.agentVersion,
        cliPreference: t.config.cliPreference,
        permissionMode: t.config.permissionMode,
        workingDir: t.config.workingDir,
        lastConnectedAt: t.config.lastConnectedAt?.toISOString() || null,
      } : null,
    }
  })

  return NextResponse.json({ tokens: result })
}
