import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function readJson<T = any>(relPath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8'))
}

function logSection(title: string) {
  console.log(`\n=== ${title} ===`)
}

function listPackageVersions() {
  const pkg = readJson<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>('package.json')
  const interesting = [
    'next',
    'react',
    'react-dom',
    'typescript',
    'vitest',
    '@playwright/test',
    'tsx',
    'js-yaml',
    '@supabase/supabase-js',
  ]

  logSection('Package versions')
  for (const name of interesting) {
    const version = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]
    if (version) {
      console.log(`- ${name}: ${version}`)
    }
  }
}

function listTsconfigPaths() {
  const tsconfig = readJson<{ compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> } }>('tsconfig.json')
  const baseUrl = tsconfig.compilerOptions?.baseUrl ?? '(none)'
  const paths = tsconfig.compilerOptions?.paths ?? {}

  logSection('TSConfig paths')
  console.log(`- baseUrl: ${baseUrl}`)
  if (Object.keys(paths).length === 0) {
    console.log('- paths: (none)')
    return
  }

  for (const [alias, targets] of Object.entries(paths)) {
    console.log(`- ${alias} -> ${targets.join(', ')}`)
  }
}

function main() {
  console.log('Bookiji Dev Diagnose (read-only)')
  listPackageVersions()
  listTsconfigPaths()
}

main()
