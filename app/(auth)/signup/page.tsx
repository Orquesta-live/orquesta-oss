'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || data.error || 'Sign up failed')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="relative flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <Link href="/" className="inline-block mb-4 hover:opacity-90 transition-opacity">
              <Image src="/logo.svg" alt="Orquesta" width={48} height={48} priority />
            </Link>
            <h1 className="text-2xl font-bold text-white">Create account</h1>
            <p className="mt-1 text-sm text-zinc-400">Set up your Orquesta workspace</p>
          </div>

          <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 backdrop-blur p-6">
            <Input
              label="Name"
              type="text"
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {error && (
              <p className="rounded-md bg-red-950/50 border border-red-900 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-green-500 hover:text-green-400 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <footer className="relative py-4 text-center text-xs text-zinc-600">
        <Link href="/" className="hover:text-zinc-400 transition-colors">Orquesta OSS</Link>
        {' '}&middot;{' '}
        <a href="https://github.com/Orquesta-live/orquesta-oss" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
      </footer>
    </div>
  )
}
