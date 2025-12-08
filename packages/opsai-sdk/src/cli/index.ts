import { opsai, OpsAI, MetricsKind } from '../client.js'

type CliResult = { code: number; output?: any; error?: string }

function print(obj: any) {
  const text = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)
  console.log(text)
}

function usage(): CliResult {
  print(`OpsAI CLI

Usage:
  opsai summary
  opsai metrics <system|bookings>
  opsai deployments
  opsai incidents
  opsai health
  opsai webhook register <url> [event...]
  opsai webhook test <url>
  opsai helpdesk diagnose <path>
  opsai helpdesk recommend
`)
  return { code: 1 }
}

async function handleMetrics(kind: string, client: OpsAI) {
  if (kind !== 'system' && kind !== 'bookings') {
    return usage()
  }
  const result = await client.metrics(kind as MetricsKind)
  print(result)
  return { code: 0, output: result }
}

async function handleWebhook(args: string[], client: OpsAI) {
  const [action, url, ...events] = args
  if (!action || !url) return usage()
  if (action === 'register') {
    const result = await client.registerWebhook(
      url,
      events.length ? (events as any) : undefined
    )
    print(result)
    return { code: 0, output: result }
  }
  if (action === 'test') {
    const result = await client.triggerTestWebhook(url)
    print(result)
    return { code: 0, output: result }
  }
  return usage()
}

async function handleHelpdesk(args: string[], client: OpsAI) {
  const helpdeskModule = await loadHelpdesk()
  if (helpdeskModule?.runHelpdeskCli) {
    return helpdeskModule.runHelpdeskCli(args)
  }
  print('Helpdesk module unavailable')
  return { code: 1, error: 'Helpdesk module unavailable' }
}

export async function runCli(args = process.argv.slice(2), client: OpsAI = opsai): Promise<CliResult> {
  if (!args.length) return usage()

  const [command, ...rest] = args

  try {
    switch (command) {
      case 'summary': {
        const result = await client.summary()
        print(result)
        return { code: 0, output: result }
      }
      case 'metrics':
        return handleMetrics(rest[0], client)
      case 'deployments': {
        const result = await client.deployments()
        print(result)
        return { code: 0, output: result }
      }
      case 'incidents': {
        const result = await client.incidents()
        print(result)
        return { code: 0, output: result }
      }
      case 'health': {
        const result = await client.health()
        print(result)
        return { code: 0, output: result }
      }
      case 'webhook':
        return handleWebhook(rest, client)
      case 'helpdesk':
        return handleHelpdesk(rest, client)
      default:
        return usage()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(message)
    return { code: 1, error: message }
  }
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  runCli().then((result) => {
    if (result.code !== 0) {
      process.exitCode = result.code
    }
  })
}

async function loadHelpdesk(): Promise<any> {
  const attempts = [
    '../../../opsai-helpdesk/dist/index.js',
    '../../../opsai-helpdesk/dist/cli.js',
    '../../../opsai-helpdesk/src/cli.ts'
  ]
  for (const candidate of attempts) {
    try {
      const mod = await import(candidate)
      if (mod) return mod
    } catch {
      // try next path
    }
  }
  return null
}
