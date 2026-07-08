'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Trash2, UserPlus, Bot, Plus, Copy, Check, X } from 'lucide-react'

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

function MemberAvatar({ name, email }: { name?: string; email?: string }) {
  const label = name || email || '?'
  const initial = label.trim()[0]?.toUpperCase() || '?'
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-teal-600', 'bg-indigo-600']
  const idx = label.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colors[idx]} text-sm font-bold text-white`} title={label}>
      {initial}
    </div>
  )
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
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white transition-colors hover:border-zinc-600 focus:border-green-600/60 focus:outline-none focus:ring-2 focus:ring-green-600/40"
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
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-400">
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
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-800/30">
                  <MemberAvatar name={m.user.name} email={m.user.email} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
                      {m.user.name || m.user.email}
                      {m.user.id === currentUserId && (
                        <span className="font-mono text-[10px] text-zinc-500">you</span>
                      )}
                    </p>
                    <p className="truncate font-mono text-xs text-zinc-500">{m.user.email}</p>
                  </div>
                  <RoleBadge role={m.role} />
                  {canManage && m.role !== 'owner' && m.user.id !== currentUserId && (
                    <div className="ml-2 flex items-center gap-1">
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                        className="h-8 rounded-lg border border-zinc-700 bg-zinc-800 px-2 text-xs text-white transition-colors hover:border-zinc-600 focus:border-green-600/60 focus:outline-none focus:ring-2 focus:ring-green-600/40"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => remove(m.id)}
                        title="Remove member"
                        className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-950/40 hover:text-red-400"
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

              {/* Connection modes */}
              <div className="mt-3 space-y-2">
                <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">Connect with</p>
                <div className="space-y-1.5 text-xs">
                  <div className="rounded bg-zinc-900 border border-zinc-800 p-2">
                    <p className="text-zinc-300 font-medium mb-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Claude CLI <span className="text-zinc-500">(Anthropic API)</span>
                    </p>
                    <code className="text-green-400 text-[11px] break-all">
                      ORQUESTA_API_URL={typeof window !== 'undefined' ? window.location.origin : ''} npx orquesta-agent --token {newTokenValue} --cli-preference claude
                    </code>
                  </div>
                  <div className="rounded bg-zinc-900 border border-zinc-800 p-2">
                    <p className="text-zinc-300 font-medium mb-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Orquesta CLI <span className="text-zinc-500">(multi-model, Batuta proxy)</span>
                    </p>
                    <code className="text-green-400 text-[11px] break-all">
                      ORQUESTA_API_URL={typeof window !== 'undefined' ? window.location.origin : ''} npx orquesta-agent --token {newTokenValue} --cli-preference orquesta
                    </code>
                  </div>
                  <div className="rounded bg-zinc-900 border border-zinc-800 p-2">
                    <p className="text-zinc-300 font-medium mb-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Auto <span className="text-zinc-500">(picks best available)</span>
                    </p>
                    <code className="text-green-400 text-[11px] break-all">
                      ORQUESTA_API_URL={typeof window !== 'undefined' ? window.location.origin : ''} npx orquesta-agent --token {newTokenValue}
                    </code>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600">
                  Add <code className="text-zinc-500">--daemon</code> for auto-restart &middot; Add <code className="text-zinc-500">--permission-mode supervised</code> to require approval
                </p>
              </div>
            </div>
          )}

          {/* Token list */}
          {tokens.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center">
              <Bot className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
              <p className="text-sm text-zinc-500">No agent tokens yet.</p>
              <p className="mt-0.5 text-xs text-zinc-600">Create one below to connect an agent.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
              {tokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-zinc-800/30">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 text-zinc-500">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-white">{t.name}</p>
                      <p className="font-mono text-xs text-zinc-500">
                        {t.lastSeenAt
                          ? `Last seen ${new Date(t.lastSeenAt).toLocaleDateString()}`
                          : `Created ${new Date(t.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => revokeToken(t.id)}
                      title="Revoke token"
                      className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-950/40 hover:text-red-400"
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
                className="h-9 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white transition-colors placeholder:text-zinc-500 hover:border-zinc-600 focus:border-green-600/60 focus:outline-none focus:ring-2 focus:ring-green-600/40"
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
