# Orquesta OSS

Self-hosted AI prompt orchestration. Connect AI agents to your own infrastructure, collaborate on prompts in real time, and manage teams — no external cloud services required.

## What it is

Orquesta OSS is the self-hostable version of [Orquesta](https://orquesta.live). You run it on your own server (or laptop), connect `orquesta-agent` from any remote machine, and submit prompts that execute via Claude CLI. Everything streams in real time over Socket.io.

```
Browser  ←→  Next.js + Socket.io server  ←→  orquesta-agent (remote VM)
                       │                              │
                  Prisma (SQLite)              Claude CLI execution
```

## Features

| Feature | Status |
|---------|--------|
| Real-time prompt execution + log streaming | ✅ |
| Agent Grid — drag-and-drop terminal sessions | ✅ |
| Team management (owner / admin / member roles) | ✅ |
| `orquesta-agent` npm package — zero code changes | ✅ |
| `orquesta-cli` npm package — zero code changes | ✅ |
| SQLite by default, Postgres with one env var change | ✅ |
| Docker one-command deploy | ✅ |

---

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/opcastil11/orquesta-oss
cd orquesta-oss

# Generate a secret (required)
openssl rand -hex 32

# Create .env
cat > .env << EOF
BETTER_AUTH_SECRET=paste-your-generated-secret-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=file:/app/data/orquesta.db
EOF

docker compose up
```

App is ready at **http://localhost:3000**. Sign up and create your first project.

### Local development

```bash
git clone https://github.com/opcastil11/orquesta-oss
cd orquesta-oss
npm install

cp .env.example .env
# Edit .env — set BETTER_AUTH_SECRET to a random 32-char string

npm run db:push   # create SQLite schema
npm run dev       # start dev server at http://localhost:3000
```

---

## Connecting an Agent

The agent needs to reach your server over the network. Two modes:

### From the same machine (local testing)

```bash
ORQUESTA_API_URL=http://localhost:3000 npx orquesta-agent --token oat_xxx
```

### From a remote machine

The agent needs a network path to your server. Go to **Project → Tokens** tab — the UI shows setup instructions for each option:

| Option | Best for |
|--------|----------|
| **Tailscale** (recommended) | Any setup — private VPN, no port forwarding |
| **Cloudflare Tunnel** | Public HTTPS URL, no account needed |
| **Local IP** | Both machines on the same LAN |
| **VPS deploy** | Production / team use |

#### Tailscale (easiest for most setups)

```bash
# On both machines
curl -fsSL https://tailscale.com/install.sh | sh && tailscale up

# Get Tailscale IP of the machine running Orquesta OSS
tailscale ip -4  # e.g. 100.x.x.x

# On the remote machine
ORQUESTA_API_URL=http://100.x.x.x:3000 npx orquesta-agent --token oat_xxx
```

#### Cloudflare Tunnel (public HTTPS, no account needed)

```bash
# On the machine running Orquesta OSS
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o cloudflared && chmod +x cloudflared
./cloudflared tunnel --url http://localhost:3000
# Prints a URL like https://xyz.trycloudflare.com

# On the remote machine
ORQUESTA_API_URL=https://xyz.trycloudflare.com npx orquesta-agent --token oat_xxx
```

The agent (`orquesta-agent` v0.2.25+) auto-detects whether it's connecting to OSS or the cloud. No flags needed — just set `ORQUESTA_API_URL`.

---

## Standalone Agent Script

If you don't want to use npm, there's a zero-dependency standalone script in `agent/index.js` (only requires `socket.io-client`):

```bash
node agent/index.js --url http://your-server:3000 --token oat_xxx

# Or with env vars
ORQUESTA_API_URL=http://your-server:3000 ORQUESTA_TOKEN=oat_xxx node agent/index.js
```

The standalone script does everything `orquesta-agent` does:
- Connects via Socket.io
- Executes prompts with `claude --print --output-format stream-json`
- Streams logs in real time
- Supports interactive terminal sessions (node-pty)

---

## Connecting orquesta-cli

```bash
npm install -g orquesta-cli

ORQUESTA_API_URL=http://your-server:3000 orquesta --token oclt_xxx
```

CLI tokens are separate from agent tokens. Create them from the dashboard (coming soon — currently not in the UI, use agent tokens for now).

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `BETTER_AUTH_SECRET` | ✅ | Secret for session signing. Use `openssl rand -hex 32`. | — |
| `BETTER_AUTH_URL` | ✅ | Public URL of your app (used for CORS + auth redirects) | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same as `BETTER_AUTH_URL` | `http://localhost:3000` |
| `DATABASE_URL` | — | SQLite file or Postgres connection string | `file:./data/orquesta.db` |
| `PORT` | — | HTTP port | `3000` |

---

## Switch to Postgres

Change `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/orquesta"
```

Then run migrations instead of db push:

```bash
npm run db:migrate
```

For Docker, add a Postgres service to `docker-compose.yml` and update the env var.

---

## Production on a VPS

```bash
# On your VPS (Ubuntu/Debian)
git clone https://github.com/opcastil11/orquesta-oss
cd orquesta-oss

cat > .env << EOF
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=http://YOUR_VPS_IP:3000
NEXT_PUBLIC_APP_URL=http://YOUR_VPS_IP:3000
DATABASE_URL=file:/app/data/orquesta.db
EOF

docker compose up -d
```

Then on any machine anywhere:

```bash
ORQUESTA_API_URL=http://YOUR_VPS_IP:3000 npx orquesta-agent --token oat_xxx
```

---

## How Transport Auto-Detection Works

When `orquesta-agent` starts, it calls `/api/agent/validate` with the token. The OSS server responds with:

```json
{
  "transport": "socketio",
  "socketUrl": "http://your-server:3000",
  "projectId": "..."
}
```

The agent detects `transport === 'socketio'` and switches from Supabase Realtime to Socket.io. The cloud version returns Supabase credentials instead. This is why the same `npx orquesta-agent` command works with both — no flags needed.

---

## API Reference

These endpoints implement the same contract as the cloud Orquesta, so existing packages work without modification.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/validate` | POST | Validate agent token, return transport config |
| `/api/agent/heartbeat` | POST | Update agent last-seen timestamp |
| `/api/agent/execute` | POST | Emit `execute` event to agent via Socket.io |
| `/api/agent/logs` | POST | Batch-ingest logs from agent |
| `/api/projects` | GET / POST | List / create projects |
| `/api/projects/[id]` | GET / PATCH / DELETE | Project CRUD |
| `/api/projects/[id]/prompts` | GET / POST | List / create prompts |
| `/api/projects/[id]/agent-tokens` | GET / POST | List / create agent tokens |
| `/api/projects/[id]/agent-tokens/[tokenId]` | DELETE | Revoke token |
| `/api/projects/[id]/members` | GET / POST | List / invite members |
| `/api/prompts/[id]` | PATCH | Update prompt status (used by agent) |
| `/api/auth/[...all]` | GET / POST | Better Auth handler |

Socket.io server: `/api/socket` (path). Agents authenticate on connect via `auth: { token }`.

---

## Architecture

```
orquesta-oss/
├── app/
│   ├── (auth)/login + signup       ← Better Auth pages
│   ├── dashboard/                  ← project list
│   ├── dashboard/projects/[id]/    ← Prompts | Agent Grid | Team | Tokens tabs
│   └── api/                        ← REST + auth endpoints
├── components/
│   ├── ui/                         ← Button, Card, Badge, Input (Zinc + green)
│   └── features/
│       ├── PromptInput.tsx
│       ├── PromptTimeline.tsx      ← real-time log streaming
│       ├── AgentGrid.tsx           ← react-grid-layout + xterm.js terminals
│       ├── TeamManager.tsx
│       └── ConnectionGuide.tsx     ← networking setup guide
├── hooks/
│   ├── useSocket.ts                ← socket.io-client React hook
│   └── usePromptLogs.ts
├── lib/
│   ├── auth.ts                     ← Better Auth (email + password)
│   ├── db.ts                       ← Prisma singleton
│   └── socket.ts                   ← Socket.io server instance
├── agent/index.js                  ← standalone agent (no npm needed)
├── prisma/schema.prisma
├── server.ts                       ← custom Next.js + Socket.io server
├── Dockerfile
└── docker-compose.yml
```

**Tech stack**: Next.js 15 · React 19 · Tailwind v4 · Socket.io 4 · Better Auth · Prisma · SQLite/Postgres · xterm.js · react-grid-layout

---

## Token Prefixes

| Prefix | Type | Scope |
|--------|------|-------|
| `oat_` | Agent token | Project-scoped. Used by `orquesta-agent`. |
| `oclt_` | CLI token | Org-scoped. Used by `orquesta-cli`. |

---

## License

MIT
