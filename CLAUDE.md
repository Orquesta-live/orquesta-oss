# Orquesta OSS (Self-Hosted)

**Self-hosted backend infrastructure for Orquesta.** Provides the API, database, WebSocket server, and agent runtime that the Orquesta Terminal product connects to.

**Repo**: https://github.com/Getorquesta/orquesta-oss
**Org**: Getorquesta (https://github.com/Getorquesta)

## Architecture

This is the **backend/infra** layer:
- Next.js server with API routes
- Prisma + SQLite (local database)
- Socket.io (real-time agent ↔ dashboard communication)
- better-auth (authentication for multi-user on shared VMs)
- Agent management (tokens, heartbeat, session routing)

## Sister Repos

| Repo | Purpose |
|------|---------|
| `Getorquesta/orquesta-oss` | This repo — self-hosted backend |
| `Getorquesta/orquesta-terminal` | Terminal product (frontend, connects here) |
| `opcastil11/orquesta` | Private hosted platform (getorquesta.com) |

## Rules

- **Code language**: ALL code in English
- **Port**: Dev runs on port 3000 (`npm run dev`)
- **DB**: Prisma + SQLite at `data/dev.db`
- **Auth**: better-auth (email/password, multi-user)
- **Socket**: Socket.io at `/api/socket` — handles agent connections + dashboard relay
- **Agent**: Agents connect with `oat_` tokens, join project rooms

## Key Files

- `server.ts` — Custom server (Next.js + Socket.io)
- `lib/socket.ts` — Socket.io event handlers (agent ↔ dashboard relay)
- `prisma/schema.prisma` — Database schema
- `app/api/` — REST API routes
- `middleware.ts` — Auth guard
- `agent/index.js` — Reference agent implementation

## Relation to Orquesta Terminal

The OSS is the **infrastructure**. The Terminal is the **product**.

```
┌─────────────────────────┐     WebSocket      ┌─────────────────────────┐
│   Orquesta Terminal     │◄───────────────────►│    Orquesta OSS         │
│   (port 4000)           │     REST API        │    (port 3000)          │
│                         │◄───────────────────►│                         │
│   - Terminal grid       │                     │   - Prisma/SQLite       │
│   - Timeline            │                     │   - Socket.io server    │
│   - Plugins             │                     │   - Agent management    │
│   - Hosted connection   │                     │   - Auth (better-auth)  │
└─────────────────────────┘                     └─────────────────────────┘
                                                          ▲
                                                          │ oat_ token
                                                          │
                                                ┌─────────────────────────┐
                                                │   Agent (node agent/)   │
                                                │   - PTY spawner         │
                                                │   - Hook manager        │
                                                │   - Session detector    │
                                                └─────────────────────────┘
```
