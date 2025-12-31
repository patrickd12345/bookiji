import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function normalizeDockerHostUrl(url: string): string {
  return url.replace(/localhost/gi, 'host.docker.internal').replace(/127\\.0\\.0\\.1/gi, 'host.docker.internal')
}

test.describe('External deterministic chaos harness', () => {
  test('dockerized harness run completes cleanly', async () => {
    test.setTimeout(180_000)

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')

    const supabaseServiceRoleKey = requireEnv('SUPABASE_SECRET_KEY')

    const seed = process.env.CHAOS_SEED ?? '812736'
    const duration = process.env.CHAOS_DURATION ?? '30'
    const maxEvents = process.env.CHAOS_MAX_EVENTS ?? '500'
    const concurrency = process.env.CHAOS_CONCURRENCY ?? '8'
    const targetUrl = process.env.CHAOS_TARGET_URL ?? 'http://host.docker.internal:3000'
    const imageName = process.env.CHAOS_IMAGE ?? 'bookiji-chaos'

    const build = spawnSync('docker', ['build', '-f', 'chaos/Dockerfile', '-t', imageName, 'chaos'], {
      encoding: 'utf8',
    })
    expect(build.status, `docker build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)

    const run = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '-e',
        `SUPABASE_URL=${normalizeDockerHostUrl(supabaseUrl)}`,
        '-e',
        `SUPABASE_SECRET_KEY=${supabaseServiceRoleKey}`,
        imageName,
        '--seed',
        seed,
        '--duration',
        duration,
        '--max-events',
        maxEvents,
        '--concurrency',
        concurrency,
        '--target-url',
        targetUrl,
      ],
      { encoding: 'utf8' }
    )

    expect(run.status, `docker run failed:\n${run.stdout}\n${run.stderr}`).toBe(0)
  })
})
