'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Trash2, UserPlus, Shield, User } from 'lucide-react'

interface Member {
  id: string
  role: string
  joinedAt: string
  user: { id: string; name: string; email: string; image?: string }
}

interface TeamManagerProps {
  projectId: string
  currentUserId: string
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'owner') return <Badge variant="green">owner</Badge>
  if (role === 'admin') return <Badge variant="blue">admin</Badge>
  return <Badge variant="default">member</Badge>
}

export function TeamManager({ projectId, currentUserId }: TeamManagerProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [callerRole, setCallerRole] = useState<string>('member')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const loadMembers = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members)
        setCallerRole(data.callerRole)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMembers() }, [projectId])

  const invite = async () => {
    if (!email.trim()) return
    setInviting(true)
    setInviteError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmail('')
      await loadMembers()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setInviting(false)
    }
  }

  const changeRole = async (memberId: string, role: string) => {
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) await loadMembers()
  }

  const remove = async (memberId: string) => {
    if (!confirm('Remove this member?')) return
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    })
    if (res.ok) await loadMembers()
  }

  const canManage = ['owner', 'admin'].includes(callerRole)

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Invite Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && invite()}
                className="flex-1"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button onClick={invite} loading={inviting} disabled={!email.trim()}>
                Invite
              </Button>
            </div>
            {inviteError && <p className="mt-2 text-xs text-red-400">{inviteError}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm text-zinc-500">Loading…</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {m.user.name || m.user.email}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{m.user.email}</p>
                  </div>
                  <RoleBadge role={m.role} />
                  {canManage && m.role !== 'owner' && m.user.id !== currentUserId && (
                    <div className="flex items-center gap-1 ml-2">
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                        className="h-7 rounded border border-zinc-700 bg-zinc-800 px-2 text-xs text-white focus:outline-none"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => remove(m.id)}
                        className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
