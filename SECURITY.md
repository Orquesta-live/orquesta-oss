# Security

Orquesta OSS is a backend you run yourself: it holds your accounts, your project
data and the tokens your agents authenticate with. This document says what it
protects, what it does not, and how to report a problem.

## Reporting a vulnerability

Email **security@getorquesta.com** with steps to reproduce. Please do not open a
public issue for anything exploitable. We aim to acknowledge within 72 hours.

## Before you expose it to a network

- **Set `BETTER_AUTH_SECRET` to a value you generated** — `openssl rand -base64 32`.
  It signs every session. Docker Compose refuses to start without one, on
  purpose: a default baked into this repo would be a secret everyone can read.
- **Terminate TLS in front of it.** The server speaks plain HTTP; session
  cookies and agent tokens are only as private as the transport.
- **It binds to `localhost` by default** (`HOSTNAME` env var). Set it to
  `0.0.0.0` only when something in front of it is doing TLS and access control.

## How requests are authenticated

- **Dashboard and project APIs** — better-auth session cookie, checked in each
  route handler. `middleware.ts` additionally redirects unauthenticated page
  loads to `/login`, but it is a convenience, not the boundary; the handlers are.
- **Agent and CLI APIs** (`/api/agent/*`, `/api/orquesta-cli/*`) — a bearer
  `oat_` token, matched against `AgentToken.tokenHash`.
- **Socket.io connections** — agents present the same token in the handshake;
  dashboards must hold a valid session before joining a project room.
- Some routes are deliberate stubs returning empty data (skills, QA
  instructions, credential vault are not part of OSS). They read nothing and
  write nothing.

## Tokens and secrets

- Agent tokens are stored **hashed** (SHA-256, `AgentToken.tokenHash`); the
  plaintext is shown once at creation and never persisted. Revoking sets
  `revokedAt` and the socket layer rejects it immediately.
- `.env`, `.orquesta.json` and `data/` (the SQLite database) are git-ignored.
  Nothing in this repo ships a real secret.
- User passwords are handled by better-auth; this project does not implement
  its own password storage.

## What it does on the host

The reference agent (`agent/index.js`) spawns PTYs and runs the CLIs you
configure, as the user that started it, with that user's environment and file
access. A backend that drives terminals cannot be sandboxed from them — run it
as a user whose blast radius you accept, not as root.
