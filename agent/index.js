#!/usr/bin/env node
/**
 * Orquesta OSS — Standalone Agent Script
 *
 * Zero npm dependencies beyond socket.io-client.
 *
 * Usage:
 *   node agent/index.js --url http://localhost:3000 --token oat_xxx
 *
 * Or with environment variables:
 *   ORQUESTA_URL=http://localhost:3000 ORQUESTA_TOKEN=oat_xxx node agent/index.js
 */

const { io } = require('socket.io-client')
const { spawn } = require('child_process')
const path = require('path')

// ── Parse args ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) result.url = args[++i]
    if (args[i] === '--token' && args[i + 1]) result.token = args[++i]
  }
  return {
    url: result.url || process.env.ORQUESTA_API_URL || process.env.ORQUESTA_URL || 'http://localhost:3000',
    token: result.token || process.env.ORQUESTA_TOKEN || '',
  }
}

const { url: serverUrl, token: agentToken } = parseArgs()

if (!agentToken) {
  console.error('[agent] Error: token required. Use --token oat_xxx or ORQUESTA_TOKEN env var')
  process.exit(1)
}

// ── Socket.io connection ──────────────────────────────────────────────────────

console.log(`[agent] Connecting to ${serverUrl}…`)

const socket = io(serverUrl, {
  path: '/api/socket',
  query: { type: 'agent' },
  auth: { token: agentToken },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 30000,
})

socket.on('connect', () => {
  console.log(`[agent] Connected (id: ${socket.id})`)
})

socket.on('disconnect', (reason) => {
  console.log(`[agent] Disconnected: ${reason}`)
})

socket.on('error', (err) => {
  console.error(`[agent] Error: ${err.message}`)
})

socket.on('connect_error', (err) => {
  console.error(`[agent] Connection error: ${err.message}`)
})

// ── Execute prompt ────────────────────────────────────────────────────────────

let currentProcess = null

socket.on('execute', async ({ promptId, content }) => {
  if (currentProcess) {
    console.log('[agent] Already executing, queuing not yet supported. Skipping.')
    socket.emit('complete', { promptId, exitCode: 1, result: 'Agent busy' })
    return
  }

  console.log(`[agent] Executing prompt ${promptId}: ${content.slice(0, 80)}…`)

  let sequence = 0
  let outputBuffer = ''
  let tokensUsed = 0
  let costCents = 0

  const emitLog = (level, type, message) => {
    socket.emit('log', { promptId, level, type, message, sequence: sequence++ })
  }

  try {
    await new Promise((resolve, reject) => {
      // Use claude CLI if available, otherwise echo for demo
      const claudePath = process.env.CLAUDE_PATH || 'claude'
      const proc = spawn(
        claudePath,
        ['--print', '--output-format', 'stream-json', '-p', content],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
        }
      )

      currentProcess = proc

      let stderrBuf = ''

      proc.stdout.on('data', (chunk) => {
        outputBuffer += chunk.toString()
        const lines = outputBuffer.split('\n')
        outputBuffer = lines.pop() // keep incomplete line

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const parsed = JSON.parse(trimmed)
            handleStreamEvent(parsed, emitLog, (t, c) => { tokensUsed = t; costCents = c })
          } catch {
            // Non-JSON output — emit as text
            emitLog('info', 'text', trimmed)
          }
        }
      })

      proc.stderr.on('data', (chunk) => {
        stderrBuf += chunk.toString()
        emitLog('error', 'text', chunk.toString().trim())
      })

      proc.on('exit', (code) => {
        currentProcess = null
        if (code === 0) {
          resolve({ code, tokensUsed, costCents })
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderrBuf}`))
        }
      })

      proc.on('error', (err) => {
        currentProcess = null
        if (err.code === 'ENOENT') {
          const msg = `Claude CLI not found at "${claudePath}". Install it with: npm install -g @anthropic-ai/claude-code  (or set CLAUDE_PATH env var)`
          console.error(`[agent] ${msg}`)
          emitLog('error', 'system', msg)
          reject(new Error(msg))
        } else {
          reject(err)
        }
      })
    })

    socket.emit('complete', {
      promptId,
      exitCode: 0,
      tokensUsed: tokensUsed || undefined,
      costCents: costCents || undefined,
    })
    console.log(`[agent] Prompt ${promptId} completed`)
  } catch (err) {
    currentProcess = null
    socket.emit('complete', {
      promptId,
      exitCode: 1,
      result: err.message,
    })
    console.error(`[agent] Prompt ${promptId} failed:`, err.message)
  }
})

function handleStreamEvent(event, emitLog, setTokens) {
  if (!event || !event.type) return

  switch (event.type) {
    case 'assistant':
      if (event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text') {
            emitLog('info', 'text', block.text)
          } else if (block.type === 'tool_use') {
            emitLog('info', 'tool_use', `[tool: ${block.name}] ${JSON.stringify(block.input).slice(0, 200)}`)
          }
        }
        if (event.message.usage) {
          const input = event.message.usage.input_tokens || 0
          const output = event.message.usage.output_tokens || 0
          setTokens(input + output, Math.round((input * 0.003 + output * 0.015) / 1000 * 100))
        }
      }
      break

    case 'tool_result':
      if (event.content) {
        for (const block of event.content) {
          if (block.type === 'text') {
            emitLog('info', 'result', block.text)
          }
        }
      }
      break

    case 'result':
      if (event.result) {
        emitLog('info', 'result', typeof event.result === 'string' ? event.result : JSON.stringify(event.result))
      }
      if (event.usage) {
        const input = event.usage.input_tokens || 0
        const output = event.usage.output_tokens || 0
        setTokens(input + output, Math.round((input * 0.003 + output * 0.015) / 1000 * 100))
      }
      break

    case 'system':
      emitLog('info', 'system', event.subtype || event.message || JSON.stringify(event))
      break

    default:
      break
  }
}

// ── Interactive session (node-pty) ────────────────────────────────────────────

const sessions = new Map()

socket.on('session:start', ({ sessionId, cellId, rows = 24, cols = 80 }) => {
  try {
    const pty = require('node-pty')
    const shell = process.env.SHELL || (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash')

    const term = pty.spawn(shell, [], {
      name: 'xterm-color',
      rows,
      cols,
      cwd: process.env.HOME || process.cwd(),
      env: process.env,
    })

    sessions.set(sessionId, term)

    term.onData((data) => {
      socket.emit('session:output', { sessionId, data })
    })

    term.onExit(() => {
      sessions.delete(sessionId)
      socket.emit('session:ended', { sessionId })
    })

    socket.emit('session:started', { sessionId, pid: term.pid })
    console.log(`[agent] Session started: ${sessionId}`)
  } catch (err) {
    console.error('[agent] node-pty not available:', err.message)
    socket.emit('session:error', {
      sessionId,
      message: 'node-pty not installed. Run: npm install -g node-pty',
    })
  }
})

socket.on('session:input', ({ sessionId, data }) => {
  const term = sessions.get(sessionId)
  if (term) term.write(data)
})

socket.on('session:resize', ({ sessionId, rows, cols }) => {
  const term = sessions.get(sessionId)
  if (term) term.resize(cols, rows)
})

socket.on('session:force_end', ({ sessionId }) => {
  const term = sessions.get(sessionId)
  if (term) {
    term.kill()
    sessions.delete(sessionId)
  }
})

// ── Heartbeat ─────────────────────────────────────────────────────────────────

setInterval(async () => {
  try {
    await fetch(`${serverUrl}/api/agent/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: agentToken }),
    })
  } catch {}
}, 20000)

console.log('[agent] Ready. Waiting for prompts…')
