<p align="center">
  <img src="https://raw.githubusercontent.com/Getorquesta/orquesta-oss/main/public/logo-mark.png" width="80" height="80" alt="Orquesta OSS" />
</p>

<h1 align="center">Orquesta OSS</h1>

<p align="center">
  <strong>Self-hosted AI agent infrastructure.</strong><br/>
  The backend that powers Orquesta Terminal. Manage projects, agents, and teams.<br/>
  Run on your own machine or a shared VM.
</p>

<p align="center">
  <a href="https://getorquesta.com">Orquesta Cloud</a> ·
  <a href="https://github.com/Getorquesta/orquesta-terminal">Terminal Product</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a>
</p>

---

## What is this?

Orquesta OSS is the **self-hosted backend** for the Orquesta ecosystem. It provides:

- A project/agent management dashboard
- WebSocket server for real-time agent ↔ terminal communication
- Authentication (multi-user, for teams on shared VMs)
- Agent token management and session routing
- Local database (SQLite via Prisma)

It's the infrastructure layer that [Orquesta Terminal](https://github.com/Getorquesta/orquesta-terminal) connects to.

## Quick Start

```bash
git clone https://github.com/Getorquesta/orquesta-oss.git
cd orquesta-oss
npm install
npx prisma db push
npm run dev
```

Open **http://localhost:3000** — create an account, create a project, generate an agent token.

Then connect an agent:
```bash
node agent/index.js --token oat_YOUR_TOKEN_HERE
```

## Features

### 📋 Project Management
Create projects, invite team members, assign roles. Each project gets its own agent tokens and prompt history.

### 🤖 Agent Runtime
Agents connect via WebSocket with `oat_` tokens. The server routes terminal sessions, relays events, and tracks heartbeats.

### 👥 Multi-User Auth
Built on better-auth — email/password login. Designed for teams sharing a dev VM where each person needs their own identity.

### 🔌 Socket.io Server
Real-time event relay between agents and the Terminal frontend:
- `session:start/input/output` — PTY lifecycle
- `hook:init-project` — Hook enrollment
- `sessions:external-*` — Import detection
- Agent online/offline status

### 📊 Prompt History
Every prompt executed through the system is logged with status, tokens used, git branch, and metadata.

### 🔑 Agent Tokens
Generate `oat_` tokens per project. Tokens authenticate agents and scope them to specific projects.

## Architecture

```
┌─────────────────────────────┐
│     Orquesta Terminal       │  ← The product (github.com/Getorquesta/orquesta-terminal)
│     (connects here)         │
└──────────────┬──────────────┘
               │
               ▼
┌═══════════════════════════════════════════════════════════┐
║              Orquesta OSS (this repo)                    ║
║                                                          ║
║  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  ║
║  │ Next.js  │  │  Socket.io   │  │  Prisma + SQLite  │  ║
║  │  API     │  │  Server      │  │  (data/dev.db)    │  ║
║  └──────────┘  └──────────────┘  └───────────────────┘  ║
║                                                          ║
║  ┌──────────────────┐  ┌──────────────────────────────┐  ║
║  │  better-auth     │  │  Agent relay & routing       │  ║
║  │  (multi-user)    │  │  (session:*, hook:*, etc.)   │  ║
║  └──────────────────┘  └──────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════╝
               ▲
               │ oat_ token
               │
┌──────────────┴──────────────┐
│     Agent (agent/index.js)  │
│     Runs on your machine    │
└─────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 |
| Database | Prisma + SQLite |
| Auth | better-auth |
| Realtime | Socket.io |
| PTY | @homebridge/node-pty |
| Styling | Tailwind CSS v4 |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="file:./data/dev.db"
BETTER_AUTH_SECRET="your-secret-here"
BETTER_AUTH_URL="http://localhost:3000"
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npx prisma db push` | Apply schema to database |
| `npx prisma studio` | Browse database |

## Related

- [orquesta-terminal](https://github.com/Getorquesta/orquesta-terminal) — Terminal workspace product
- [getorquesta.com](https://getorquesta.com) — Hosted platform (cloud alternative)

## License

MIT
