'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Trash2, UserPlus, User, Bot, Plus, Copy, Check, X } from 'lucide-react'

interface Member {
  id: string
  role: string
  joinedAt: string
  user: { id: string; name: string; email: string; image?: string }
}

interface AgentToken {
  id: string
  name: string
  lastSeenAt?: string
  createdAt: string
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
  const [actionError, setActionError] = useState<string | null>(null)

  // Agent tokens state
  const [tokens, setTokens] = useState<AgentToken[]>([])
  const [creatingToken, setCreatingToken] = useState(false)
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null)
  const [newTokenName, setNewTokenName] = useState('')
  const [copied, setCopied] = useState(false)

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

  const loadTokens = async () => {
    const res = await fetch(`/api/projects/${projectId}/agent-tokens`)
    if (res.ok) {
      const data = await res.json()
      setTokens(data.tokens)
    }
  }

  useEffect(() => {
    loadMembers()
    loadTokens()
  }, [projectId])

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
    setActionError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change role')
      await loadMembers()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const remove = async (memberId: string) => {
    if (!confirm('Remove this member?')) return
    setActionError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove member')
      await loadMembers()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const createToken = async () => {
    setCreatingToken(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/agent-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName.trim() || `Token ${tokens.length + 1}` }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewTokenValue(data.token.rawToken)
        setNewTokenName('')
        await loadTokens()
      }
    } finally {
      setCreatingToken(false)
    }
  }

  const revokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this token? The agent will disconnect.')) return
    await fetch(`/api/projects/${projectId}/agent-tokens/${tokenId}`, { method: 'DELETE' })
    await loadTokens()
  }

  const copyToken = async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

      {actionError && (
        <p className="rounded-md bg-red-950/50 border border-red-900 px-3 py-2 text-sm text-red-400">
          {actionError}
        </p>
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

      {/* ── Agents section ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4" /> Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* New token reveal banner */}
          {newTokenValue && (
            <div className="rounded-lg border border-green-900 bg-green-950/30 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-green-400">
                  Token created — copy it now, it won&apos;t be shown again
                </p>
                <button onClick={() => setNewTokenValue(null)} className="text-zinc-500 hover:text-white shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 rounded bg-zinc-900 px-3 py-2 text-xs text-white font-mono break-all">
                  {newTokenValue}
                </code>
                <button
                  onClick={() => copyToken(newTokenValue)}
                  className="p-2 rounded border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Token list */}
          {tokens.length === 0 ? (
            <p className="text-sm text-zinc-500">No agent tokens yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
              {tokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-zinc-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-zinc-500">
                        {t.lastSeenAt
                          ? `Last seen ${new Date(t.lastSeenAt).toLocaleDateString()}`
                          : `Created ${new Date(t.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => revokeToken(t.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create token */}
          {canManage && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newTokenName}
                onChange={e => setNewTokenName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createToken()}
                placeholder="Token name (e.g. Laptop)"
                className="flex-1 h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <Button size="sm" onClick={createToken} loading={creatingToken}>
                <Plus className="h-4 w-4" /> Create
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
