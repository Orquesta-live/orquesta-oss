import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

// Sample prompts that show what the product does
const DEMO_PROMPTS = [
  {
    content: 'Add a health check endpoint at GET /api/health that returns { status: "ok", uptime: process.uptime() }',
    status: 'completed',
    result: 'Created /api/health/route.ts with health check endpoint. Returns JSON with status and uptime. Added tests.',
    tokensUsed: 3420,
    costCents: 8,
    logs: [
      { level: 'info', type: 'system', message: 'Starting execution...' },
      { level: 'info', type: 'text', message: 'I\'ll create a health check endpoint for you.' },
      { level: 'info', type: 'tool_use', message: '[tool: Write] {"path": "app/api/health/route.ts", "content": "..."}' },
      { level: 'info', type: 'result', message: 'File created: app/api/health/route.ts' },
      { level: 'info', type: 'text', message: 'Health check endpoint created at GET /api/health. Returns status and uptime.' },
    ],
    commits: [
      { hash: 'a1b2c3d', message: 'feat: add health check endpoint', filesChanged: 1, insertions: 12, deletions: 0 },
    ],
    minutesAgo: 180,
  },
  {
    content: 'Fix the login form — password field doesn\'t show validation errors when under 8 characters',
    status: 'completed',
    result: 'Fixed password validation in LoginForm component. Added minLength check with inline error message.',
    tokensUsed: 2180,
    costCents: 5,
    logs: [
      { level: 'info', type: 'system', message: 'Starting execution...' },
      { level: 'info', type: 'text', message: 'Let me look at the login form to find the validation issue.' },
      { level: 'info', type: 'tool_use', message: '[tool: Read] {"path": "components/LoginForm.tsx"}' },
      { level: 'info', type: 'result', message: 'File contents loaded (42 lines)' },
      { level: 'info', type: 'text', message: 'Found the issue — the password input is missing minLength and the error state.' },
      { level: 'info', type: 'tool_use', message: '[tool: Edit] {"path": "components/LoginForm.tsx", "old": "...", "new": "..."}' },
      { level: 'info', type: 'result', message: 'File updated: components/LoginForm.tsx' },
      { level: 'info', type: 'text', message: 'Fixed. The password field now shows a red error message when under 8 characters.' },
    ],
    commits: [
      { hash: 'e4f5g6h', message: 'fix: password validation in login form', filesChanged: 1, insertions: 8, deletions: 2 },
    ],
    minutesAgo: 60,
  },
  {
    content: 'Refactor the user service to use a repository pattern and add unit tests',
    status: 'completed',
    result: 'Extracted UserRepository from UserService. Added 12 unit tests covering CRUD operations and edge cases. All tests passing.',
    tokensUsed: 8750,
    costCents: 21,
    logs: [
      { level: 'info', type: 'system', message: 'Starting execution...' },
      { level: 'info', type: 'text', message: 'I\'ll refactor the user service into a repository pattern and add comprehensive tests.' },
      { level: 'info', type: 'tool_use', message: '[tool: Read] {"path": "lib/services/user.ts"}' },
      { level: 'info', type: 'result', message: 'File contents loaded (87 lines)' },
      { level: 'info', type: 'tool_use', message: '[tool: Write] {"path": "lib/repositories/user.ts"}' },
      { level: 'info', type: 'result', message: 'File created: lib/repositories/user.ts' },
      { level: 'info', type: 'tool_use', message: '[tool: Edit] {"path": "lib/services/user.ts"}' },
      { level: 'info', type: 'result', message: 'File updated: lib/services/user.ts' },
      { level: 'info', type: 'tool_use', message: '[tool: Write] {"path": "tests/user.test.ts"}' },
      { level: 'info', type: 'result', message: 'File created: tests/user.test.ts' },
      { level: 'info', type: 'tool_use', message: '[tool: Bash] {"command": "npm test -- --run tests/user.test.ts"}' },
      { level: 'info', type: 'result', message: '12 tests passed, 0 failed' },
      { level: 'info', type: 'text', message: 'Refactoring complete. Created UserRepository, updated UserService to use it, and added 12 passing tests.' },
    ],
    commits: [
      { hash: 'i7j8k9l', message: 'refactor: extract UserRepository from UserService', filesChanged: 2, insertions: 45, deletions: 30 },
      { hash: 'm0n1o2p', message: 'test: add unit tests for user repository', filesChanged: 1, insertions: 96, deletions: 0 },
    ],
    minutesAgo: 30,
  },
  {
    content: 'What\'s the current project structure? Give me a high-level overview.',
    status: 'completed',
    result: 'The project follows a standard Next.js structure with app router, feature components, and a lib directory for shared utilities.',
    tokensUsed: 1540,
    costCents: 3,
    logs: [
      { level: 'info', type: 'system', message: 'Starting execution...' },
      { level: 'info', type: 'tool_use', message: '[tool: Bash] {"command": "find . -type f -name \'*.ts\' -o -name \'*.tsx\' | head -30"}' },
      { level: 'info', type: 'result', message: './app/page.tsx\n./app/layout.tsx\n./app/api/health/route.ts\n./components/LoginForm.tsx\n./lib/services/user.ts\n./lib/repositories/user.ts\n./tests/user.test.ts' },
      { level: 'info', type: 'text', message: 'Here\'s the project overview:\n\n- app/ — Next.js pages and API routes\n- components/ — React components\n- lib/ — Services, repositories, utilities\n- tests/ — Unit tests\n\n7 TypeScript files total. Clean separation of concerns.' },
    ],
    commits: [],
    minutesAgo: 10,
  },
]

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id

    // Check if user already has any projects — only seed on first use
    const existingProjects = await db.projectMember.count({
      where: { userId },
    })
    if (existingProjects > 0) {
      return NextResponse.json({ error: 'Demo already seeded or user has projects' }, { status: 409 })
    }

    // Create demo project
    const project = await db.project.create({
      data: {
        name: 'Demo Project',
        description: 'Sample project showing what Orquesta looks like in action. Connect a real agent to start using it!',
        claudeMd: `# Demo Project Rules\n\n## Code Style\n- Use TypeScript for all files\n- Prefer functional components\n- Use named exports\n\n## Testing\n- Write unit tests for all new features\n- Minimum 80% coverage\n\n## Git\n- Use conventional commits (feat:, fix:, refactor:, test:)\n- Keep commits small and focused`,
      },
    })

    // Add user as owner
    await db.projectMember.create({
      data: { userId, projectId: project.id, role: 'owner' },
    })

    // Seed prompts with logs and commits
    for (const demo of DEMO_PROMPTS) {
      const now = new Date()
      const createdAt = new Date(now.getTime() - demo.minutesAgo * 60 * 1000)
      const completedAt = new Date(createdAt.getTime() + 12000) // 12s execution

      const prompt = await db.prompt.create({
        data: {
          projectId: project.id,
          userId,
          content: demo.content,
          status: demo.status,
          result: demo.result,
          tokensUsed: demo.tokensUsed,
          costCents: demo.costCents,
          source: 'dashboard',
          createdAt,
          startedAt: createdAt,
          completedAt,
        },
      })

      // Seed logs
      for (let i = 0; i < demo.logs.length; i++) {
        const log = demo.logs[i]
        await db.agentLog.create({
          data: {
            promptId: prompt.id,
            level: log.level,
            type: log.type,
            message: log.message,
            sequence: i,
            createdAt: new Date(createdAt.getTime() + i * 2000),
          },
        })
      }

      // Seed git commits
      for (const commit of demo.commits) {
        await db.gitCommit.create({
          data: {
            projectId: project.id,
            promptId: prompt.id,
            hash: commit.hash + 'e4f5a6b7c8d9' + Math.random().toString(36).slice(2, 8),
            message: commit.message,
            diff: `${commit.filesChanged} file${commit.filesChanged !== 1 ? 's' : ''} changed, ${commit.insertions} insertions(+), ${commit.deletions} deletions(-)`,
            filesChanged: commit.filesChanged,
            insertions: commit.insertions,
            deletions: commit.deletions,
          },
        })
      }
    }

    return NextResponse.json({ projectId: project.id })
  } catch (err) {
    console.error('[api/demo/seed]', err)
    return NextResponse.json({ error: 'Failed to seed demo' }, { status: 500 })
  }
}
