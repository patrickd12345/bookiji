import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
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

function collectSrcPathsFromGenome(node: unknown, acc: Set<string>) {
  if (!node) return
  if (typeof node === 'string' && node.startsWith('src/')) {
    acc.add(node)
    return
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectSrcPathsFromGenome(item, acc))
    return
  }

  if (typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectSrcPathsFromGenome(value, acc)
    }
  }
}

function listGenomeExpectations() {
  const genomePath = path.join(repoRoot, 'genome/master-genome.yaml')
  const genome = yaml.load(fs.readFileSync(genomePath, 'utf8')) as any
  const domains = Object.keys(genome?.domains ?? {})

  logSection('Genome domains')
  console.log(domains.length ? `- Domains: ${domains.join(', ')}` : '- Domains: (none found)')

  const srcPaths = new Set<string>()
  collectSrcPathsFromGenome(genome, srcPaths)
  const expectedDirs = Array.from(srcPaths)
    .map((p) => (path.extname(p) ? path.dirname(p) : p))
    .filter((p) => p.startsWith('src/'))

  const uniqueDirs = Array.from(new Set(expectedDirs))
  const missingDirs = uniqueDirs.filter((relPath) => !fs.existsSync(path.join(repoRoot, relPath)))

  logSection('Missing src directories expected by validators')
  if (missingDirs.length === 0) {
    console.log('- none')
    return
  }

  missingDirs.forEach((dir) => console.log(`- ${dir}`))
}

function main() {
  console.log('Bookiji Dev Diagnose (read-only)')
  listPackageVersions()
  listTsconfigPaths()
  listGenomeExpectations()
}

main()
