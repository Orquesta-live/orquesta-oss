# Orquesta OSS

Self-hosted AI prompt orchestration platform. Connect AI agents to your infrastructure and collaborate on prompts in real time.

## Features

- **Prompt execution** — Submit prompts, stream logs in real-time
- **Agent Grid** — Multiple interactive terminal sessions in a drag-and-drop grid
- **Team management** — Roles (owner / admin / member), invite by email
- **orquesta-agent compatible** — Same npm package, zero code changes
- **orquesta-cli compatible** — Same npm package, zero code changes
- **Zero external services** — SQLite by default, swap to Postgres with one env var

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/orquesta/orquesta-oss
cd orquesta-oss

cp .env.example .env
# Edit .env: set BETTER_AUTH_SECRET to a random string

docker compose up
```

App runs at http://localhost:3000.

### Local development

```bash
npm install
cp .env.example .env
# Edit .env

npm run db:push   # create SQLite schema
npm run dev       # start dev server
```

## Connect an Agent

1. Sign up and create a project
2. Go to **Tokens** tab → Create a token
3. On any machine with Claude CLI installed:

```bash
npm install -g orquesta-agent

ORQUESTA_API_URL=http://your-server:3000 \
npx orquesta-agent --token oat_your_token_here
```

Or run the standalone script (only needs `socket.io-client`):

```bash
node agent/index.js --url http://your-server:3000 --token oat_your_token_here
```

## Connect orquesta-cli

```bash
npm install -g orquesta-cli

ORQUESTA_API_URL=http://your-server:3000 \
orquesta --token oclt_your_cli_token
```

## How It Works

```
Browser  ←→  Next.js + Socket.io
                 │
            Prisma (SQLite)
                 │
       orquesta-agent (Socket.io)
       orquesta-cli  (REST)
```

The agent validate endpoint returns `{ transport: 'socketio', socketUrl }`, telling the agent to use Socket.io instead of Supabase Realtime.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite or Postgres connection string | `file:./data/orquesta.db` |
| `BETTER_AUTH_SECRET` | Secret for session signing (required) | — |
| `BETTER_AUTH_URL` | Public URL of the app | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Same as BETTER_AUTH_URL | `http://localhost:3000` |
| `PORT` | Server port | `3000` |

## Switch to Postgres

```env
DATABASE_URL="postgresql://user:password@localhost:5432/orquesta"
```

Then run `npm run db:migrate` instead of `db:push`.

## Architecture

- **Next.js 15** App Router + custom server (`server.ts`)
- **Socket.io** attached to the HTTP server at `/api/socket`
- **Better Auth** for authentication (email + password)
- **Prisma** ORM with SQLite (swappable to Postgres)
- **react-grid-layout** for Agent Grid drag-and-drop
- **xterm.js** for interactive terminals

## License

MIT
