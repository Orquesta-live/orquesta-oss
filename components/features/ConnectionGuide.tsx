'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Network, Globe, Shield, Wifi, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface ConnectionGuideProps {
  appUrl: string
  tokenValue?: string // if a token is selected/shown
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="ml-2 shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-zinc-950 px-3 py-2.5">
      <code className="flex-1 text-xs text-zinc-300 font-mono whitespace-pre-wrap break-all">
        {children}
      </code>
      <CopyButton text={children} />
    </div>
  )
}

interface Option {
  id: string
  label: string
  badge: string
  badgeVariant: 'green' | 'blue' | 'default'
  icon: React.ReactNode
  description: string
  steps: { label: string; code?: string }[]
  agentCommand: (token: string) => string
}

export function ConnectionGuide({ appUrl, tokenValue }: ConnectionGuideProps) {
  const isLocalhost = appUrl.includes('localhost') || appUrl.includes('127.0.0.1')
  const [openOption, setOpenOption] = useState<string | null>(isLocalhost ? 'tailscale' : null)
  const token = tokenValue || '<your-token-here>'

  // If already on a public URL — simple view
  if (!isLocalhost) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connect your agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-400">
            Run this on any machine where you want to execute AI prompts:
          </p>
          <CodeBlock>{`ORQUESTA_API_URL=${appUrl} npx orquesta-agent --token ${token}`}</CodeBlock>
          <p className="text-xs text-zinc-500">
            Requires Node.js 20+. The agent auto-detects this is an OSS instance and connects via Socket.io.
          </p>
        </CardContent>
      </Card>
    )
  }

  const options: Option[] = [
    {
      id: 'tailscale',
      label: 'Tailscale',
      badge: 'Recommended',
      badgeVariant: 'green',
      icon: <Shield className="h-4 w-4" />,
      description: 'Private mesh VPN. Both machines get a stable IP. No port forwarding, works through any firewall.',
      steps: [
        { label: 'Install on both machines', code: 'curl -fsSL https://tailscale.com/install.sh | sh && tailscale up' },
        { label: 'Get this machine\'s Tailscale IP', code: 'tailscale ip -4' },
        { label: 'Run the agent on the remote machine (replace IP)', code: `ORQUESTA_API_URL=http://<tailscale-ip>:3000 npx orquesta-agent --token ${token}` },
      ],
      agentCommand: (t) => `ORQUESTA_API_URL=http://<tailscale-ip>:3000 npx orquesta-agent --token ${t}`,
    },
    {
      id: 'cloudflare',
      label: 'Cloudflare Tunnel',
      badge: 'Public HTTPS',
      badgeVariant: 'blue',
      icon: <Globe className="h-4 w-4" />,
      description: 'Get a free public HTTPS URL (e.g. https://xyz.trycloudflare.com). No account needed for quick tunnels.',
      steps: [
        {
          label: 'Install cloudflared on this machine',
          code: 'curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared && chmod +x cloudflared',
        },
        { label: 'Start the tunnel (keep running)', code: './cloudflared tunnel --url http://localhost:3000' },
        { label: 'Copy the printed URL, then run agent on remote machine', code: `ORQUESTA_API_URL=https://<printed-url>.trycloudflare.com npx orquesta-agent --token ${token}` },
      ],
      agentCommand: (t) => `ORQUESTA_API_URL=https://<tunnel-url> npx orquesta-agent --token ${t}`,
    },
    {
      id: 'localip',
      label: 'Local network IP',
      badge: 'Same LAN only',
      badgeVariant: 'default',
      icon: <Network className="h-4 w-4" />,
      description: 'Use your machine\'s local IP. Only works if both machines are on the same network (home/office LAN).',
      steps: [
        { label: 'Find your local IP', code: 'ip addr show | grep "inet " | grep -v 127.0.0.1' },
        { label: 'Open port 3000 if needed', code: 'sudo ufw allow 3000/tcp' },
        { label: 'Run agent on the other machine (replace IP)', code: `ORQUESTA_API_URL=http://<local-ip>:3000 npx orquesta-agent --token ${token}` },
      ],
      agentCommand: (t) => `ORQUESTA_API_URL=http://<local-ip>:3000 npx orquesta-agent --token ${t}`,
    },
    {
      id: 'vps',
      label: 'Deploy to a VPS',
      badge: 'Production',
      badgeVariant: 'default',
      icon: <Wifi className="h-4 w-4" />,
      description: 'Host Orquesta OSS on a public server. Any agent anywhere can connect. Recommended for teams.',
      steps: [
        { label: 'Clone and start with Docker on your VPS', code: 'git clone https://github.com/orquesta/orquesta-oss && cd orquesta-oss && docker compose up -d' },
        { label: 'Set your domain or VPS IP in .env', code: 'BETTER_AUTH_URL=http://<vps-ip>:3000\nNEXT_PUBLIC_APP_URL=http://<vps-ip>:3000' },
        { label: 'Agents connect to the VPS', code: `ORQUESTA_API_URL=http://<vps-ip>:3000 npx orquesta-agent --token ${token}` },
      ],
      agentCommand: (t) => `ORQUESTA_API_URL=http://<vps-ip>:3000 npx orquesta-agent --token ${t}`,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          Connect your agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-0 pb-2">
        <p className="px-5 pb-1 text-sm text-zinc-400">
          Your server is running on <code className="text-green-400">localhost</code>. Choose how to make it reachable from a remote machine:
        </p>

        {options.map((opt) => (
          <div key={opt.id} className="border-t border-zinc-800 first:border-t-0">
            <button
              onClick={() => setOpenOption(openOption === opt.id ? null : opt.id)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-zinc-800/40 transition-colors"
            >
              <span className="text-zinc-400">{opt.icon}</span>
              <span className="flex-1 text-sm font-medium text-white">{opt.label}</span>
              <Badge variant={opt.badgeVariant} className="text-[10px]">{opt.badge}</Badge>
              {openOption === opt.id
                ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              }
            </button>

            {openOption === opt.id && (
              <div className="px-5 pb-4 space-y-3">
                <p className="text-xs text-zinc-500">{opt.description}</p>
                <ol className="space-y-2.5">
                  {opt.steps.map((step, i) => (
                    <li key={i} className="space-y-1">
                      <p className="text-xs text-zinc-400">
                        <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">
                          {i + 1}
                        </span>
                        {step.label}
                      </p>
                      {step.code && <CodeBlock>{step.code}</CodeBlock>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
