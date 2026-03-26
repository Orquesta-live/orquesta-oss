<p align="center">
  <img src="public/logo.svg" width="80" height="80" alt="Orquesta OSS" />
</p>

<h1 align="center">Orquesta OSS</h1>

<p align="center">
  Self-hosted AI prompt orchestration.<br/>
  Connect agents to any machine. Submit prompts from a shared dashboard.<br/>
  Claude executes with full system access. Everything is logged.
</p>

<p align="center">
  <a href="https://orquesta.live">Website</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#connecting-an-agent">Connect Agent</a> &middot;
  <a href="https://orquesta.live/docs">Docs</a>
</p>

---

## What is Orquesta?

Orquesta lets you install an AI agent on any machine (your laptop, a VM, a staging server), then submit prompts from a shared dashboard that execute via Claude CLI. Logs stream in real time, git commits are tracked, and your team collaborates on a single timeline.

```
Browser  <-->  Next.js + Socket.io  <-->  orquesta-agent (any machine)
                     |                           |
                Prisma (SQLite)           Claude CLI execution
```

**This is the open-source, self-hosted version.** The hosted version at [orquesta.live](https://orquesta.live) adds scheduled prompts, integrations (Linear, GitHub, Vercel), performance analytics, guardrails, and more.

---

## Features

| Feature | Description |
|---------|-------------|
| **Real-time execution** | Submit prompts, watch logs stream live via Socket.io |
| **Agent Grid** | Drag-and-drop terminal sessions with xterm.js |
| **CLAUDE.md Sync** | Define coding standards in the dashboard, agent syncs before every execution |
| **Git commit tracking** | See diffs, file changes, and commit messages per prompt |
| **Team collaboration** | Invite members with roles (owner / admin / member) |
| **Prompt search & filter** | Search by content, filter by status |
| **Cost tracking** | Token usage and estimated cost per prompt |
| **Interactive sessions** | Full terminal access to agent machines via node-pty |
| **Demo project** | First-time users get a pre-populated project showing what it looks like in action |
| **Docker deploy** | One command to get running |
| **SQLite or Postgres** | SQLite by default, switch to Postgres with one env var |

---

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/Orquesta-live/orquesta-oss
cd orquesta-oss

# Create .env
cat > .env << EOF
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=file:/app/data/orquesta.db
EOF

docker compose up
```

Open **http://localhost:3000**, sign up, and click **"Try the Demo"** to see what it looks like with sample data.

### Local development

```bash
git clone https://github.com/Orquesta-live/orquesta-oss
cd orquesta-oss
npm install

cp .env.example .env
# Edit .env — set BETTER_AUTH_SECRET to a random 32-char string

npm run db:push   # create SQLite schema
npm run dev       # http://localhost:3000
```

---

## Connecting an Agent

Create a project, go to the **Tokens** tab, and create an agent token. Then:

### Same machine (local testing)

```bash
npx orquesta-agent --token oat_xxx --mode claude
```

### Remote machine

The agent needs a network path to your server:

| Option | Best for |
|--------|----------|
| **Tailscale** (recommended) | Any setup — private VPN, no port forwarding |
| **Cloudflare Tunnel** | Public HTTPS URL, no account needed |
| **Local IP** | Both machines on the same LAN |
| **VPS** | Production / team use |

```bash
# Tailscale example
ORQUESTA_API_URL=http://100.x.x.x:3000 npx orquesta-agent --token oat_xxx --mode claude

# Cloudflare Tunnel example
ORQUESTA_API_URL=https://xyz.trycloudflare.com npx orquesta-agent --token oat_xxx --mode claude
```

The `--mode claude` flag ensures the agent uses Claude CLI. The agent auto-detects OSS vs cloud — no other flags needed.

### Standalone agent (no npm)

```bash
node agent/index.js --url http://your-server:3000 --token oat_xxx
```

Zero npm dependencies beyond `socket.io-client`. Does everything the npm package does: prompt execution, log streaming, interactive sessions.

---

## CLAUDE.md Sync

Define coding standards, rules, and context in the **Settings** tab of your project. The agent automatically writes this to `CLAUDE.md` in the working directory before every execution, so Claude follows your team's conventions.

```markdown
# Project Rules

- All code must be in TypeScript
- Use functional components
- Write tests for new features
- Use conventional commits
```

---

## How It Works

1. **Install the agent** on any machine with Claude CLI installed
2. **Submit prompts** from the dashboard — your team sees them in real time
3. **Agent executes** via `claude --print --output-format stream-json`
4. **Logs stream** to all connected dashboards via Socket.io
5. **Git commits** are captured and displayed with diffs per prompt
6. **Results** show token usage, cost, and execution duration

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `BETTER_AUTH_SECRET` | Yes | Session signing secret (`openssl rand -hex 32`) | — |
| `BETTER_AUTH_URL` | Yes | Public URL of your app | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as above (client-side) | `http://localhost:3000` |
| `DATABASE_URL` | No | SQLite file or Postgres connection string | `file:./data/orquesta.db` |
| `PORT` | No | HTTP port | `3000` |

### Switch to Postgres

```env
DATABASE_URL="postgresql://user:password@localhost:5432/orquesta"
```

Then: `npm run db:migrate`

---

## Project Structure

```
orquesta-oss/
├── app/
│   ├── page.tsx                       # Landing page
│   ├── (auth)/login + signup          # Auth pages
│   ├── dashboard/                     # Project list + Agent Grid
│   ├── dashboard/projects/[id]/       # Prompts | Team | Tokens | Settings
│   └── api/                           # REST + auth + agent endpoints
├── components/
│   ├── ui/                            # Button, Card, Badge, Input, Toast, Logo
│   └── features/
│       ├── PromptTimeline.tsx         # Real-time logs, search, filter, git commits
│       ├── AgentGrid.tsx              # Drag-drop terminal grid (xterm.js)
│       ├── PromptInput.tsx            # Prompt submission
│       ├── TeamManager.tsx            # Members + roles
│       └── ConnectionGuide.tsx        # Agent networking setup
├── hooks/
│   ├── useSocket.ts                   # Socket.io React hook
│   └── usePromptLogs.ts              # Real-time log subscription
├── lib/
│   ├── auth.ts                        # Better Auth config
│   ├── db.ts                          # Prisma singleton
│   └── socket.ts                      # Socket.io server + event handlers
├── agent/index.js                     # Standalone agent script
├── prisma/schema.prisma               # SQLite/Postgres schema
├── server.ts                          # Custom Next.js + Socket.io server
├── Dockerfile + docker-compose.yml    # One-command deploy
└── public/                            # Logo, favicon
```

---

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4
- **Backend**: Prisma ORM, Better Auth, Socket.io 4
- **Database**: SQLite (default) or PostgreSQL
- **Terminal**: xterm.js + node-pty
- **Grid**: react-grid-layout
- **AI**: Claude CLI (Anthropic)

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/validate` | POST | Validate agent token, return transport config |
| `/api/agent/heartbeat` | POST | Update agent last-seen timestamp |
| `/api/agent/claude-md` | GET | Agent fetches CLAUDE.md for its project |
| `/api/projects` | GET / POST | List / create projects |
| `/api/projects/[id]` | GET / PATCH / DELETE | Project CRUD |
| `/api/projects/[id]/prompts` | GET / POST | List / create prompts |
| `/api/projects/[id]/settings` | GET / PATCH | Project settings (CLAUDE.md) |
| `/api/projects/[id]/agent-tokens` | GET / POST | List / create tokens |
| `/api/projects/[id]/members` | GET / POST | List / invite members |
| `/api/prompts/[id]` | GET / PATCH | Prompt details + update status |
| `/api/demo/seed` | POST | Seed demo project for new users |

**Socket.io**: `/api/socket` path. Agents auth via `auth: { token }`.

---

## Token Types

| Prefix | Type | Scope |
|--------|------|-------|
| `oat_` | Agent token | Project-scoped — used by `orquesta-agent` |
| `oclt_` | CLI token | Org-scoped — used by `orquesta-cli` |

---

## Orquesta Cloud

Need more? [Orquesta Cloud](https://orquesta.live) is the hosted version with:

- Scheduled prompts (cron-based automation)
- Integrations (Linear, GitHub, Vercel, Telegram)
- Performance dashboard (cost trends, execution stats)
- Quality gates & signoff workflows
- Supervision & guardrails
- VM provisioning from dashboard
- Embed SDK for third-party websites
- Batuta autonomous agent (4 execution modes)

---

## Contributing

Contributions welcome! Open an issue or PR on GitHub.

```bash
# Run locally
npm install
npm run db:push
npm run dev

# Run tests (coming soon)
npm test
```

---

## License

[MIT](LICENSE)
