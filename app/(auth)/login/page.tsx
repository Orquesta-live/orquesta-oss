'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Cloud, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useHostedAuth } from '@/hooks/useHostedAuth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hosted (Orquesta Cloud) login state
  const hosted = useHostedAuth()
  const [hostedToken, setHostedToken] = useState('')
  const [hostedUrl, setHostedUrl] = useState('https://getorquesta.com')
  const [showHostedUrl, setShowHostedUrl] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || data.error || 'Login failed')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const submitHosted = async (e: FormEvent) => {
    e.preventDefault()
    const token = hostedToken.trim()
    if (!token) return
    try {
      await hosted.login(token, hostedUrl)
      // After hosted login, still go to local dashboard
      // (the hosted projects are now stored for the terminal)
      router.push('/dashboard')
    } catch {
      // error is set in the hook
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
          Sign in
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Sign in to your Orquesta workspace.
        </p>
      </div>

      {/* Local auth (self-hosted) */}
      <form
        onSubmit={submit}
        className="elevated space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <Input
          label="Email"
          type="email"
          id="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          id="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <p className="flex items-start gap-2 rounded-lg border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        )}
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-[11px] uppercase tracking-wider text-zinc-600">or connect to cloud</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Hosted (Orquesta Cloud) auth */}
      {hosted.isLoggedIn ? (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-white">
                Connected to Orquesta Cloud
              </p>
              <p className="text-xs text-zinc-400">
                {hosted.auth!.organizationName} · {hosted.auth!.projects.length} project{hosted.auth!.projects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {hosted.auth!.projects.map(p => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-zinc-200">{p.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            Your terminals can now report to these projects. Select a project per terminal in the workspace.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => router.push('/dashboard')}
              size="sm"
              className="flex-1"
            >
              Go to workspace
            </Button>
            <Button
              onClick={hosted.logout}
              size="sm"
              variant="outline"
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={submitHosted}
          className="elevated space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-green-400" />
            <p className="text-sm font-medium text-white">Sign in with Orquesta Cloud</p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Connect to report terminal sessions to your hosted projects.
            Each terminal can target a different project.
          </p>

          {/* OAuth login — primary option */}
          <Button
            type="button"
            className="w-full"
            onClick={() => hosted.loginWithBrowser(hostedUrl).then(() => router.push('/dashboard')).catch(() => {})}
            disabled={hosted.loading}
          >
            {hosted.loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for authorization…</>
            ) : (
              <><Cloud className="h-4 w-4" /> Sign in with browser</>
            )}
          </Button>

          {/* Token-based login — alternative */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">or use a token</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="hosted-token" className="text-xs font-medium text-zinc-400">
                CLI Token
              </label>
              <a
                href={`${hostedUrl}/dashboard/settings`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-green-400/80 hover:text-green-300"
              >
                Get a token <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <input
              id="hosted-token"
              type="password"
              value={hostedToken}
              onChange={e => setHostedToken(e.target.value)}
              placeholder="oclt_…"
              autoComplete="off"
              className="mt-1 h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-green-600/60 focus:outline-none focus:ring-1 focus:ring-green-600/40"
            />
          </div>

          {showHostedUrl ? (
            <div>
              <label htmlFor="hosted-url" className="text-xs font-medium text-zinc-400">
                Hosted URL
              </label>
              <input
                id="hosted-url"
                type="url"
                value={hostedUrl}
                onChange={e => setHostedUrl(e.target.value)}
                placeholder="https://getorquesta.com"
                className="mt-1 h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs text-white placeholder:text-zinc-600 focus:border-green-600/60 focus:outline-none focus:ring-1 focus:ring-green-600/40"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowHostedUrl(true)}
              className="text-[11px] text-zinc-600 hover:text-zinc-400"
            >
              Custom hosted URL? →
            </button>
          )}

          {hosted.error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{hosted.error}</span>
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            variant="outline"
            loading={hosted.loading}
            disabled={!hostedToken.trim() || hosted.loading}
          >
            {hosted.loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
            ) : (
              <><Cloud className="h-4 w-4" /> Connect to Cloud</>
            )}
          </Button>
        </form>
      )}

      <p className="text-sm text-zinc-500">
        No account?{' '}
        <Link
          href="/signup"
          className="font-medium text-green-500 transition-colors hover:text-green-400"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
