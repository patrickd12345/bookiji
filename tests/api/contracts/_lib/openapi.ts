import Ajv from 'ajv'
import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'

type AnyRecord = Record<string, any>

let openApiSpec: AnyRecord = {}

export function getOpenApiSpec(): AnyRecord {
  if (Object.keys(openApiSpec).length) return openApiSpec

  try {
    openApiSpec = yaml.load(
      fs.readFileSync(path.join(process.cwd(), 'openapi/bookiji.yaml'), 'utf-8')
    ) as AnyRecord
  } catch (error) {
     
    console.warn('Could not load OpenAPI spec:', error)
    openApiSpec = {}
  }

  return openApiSpec
}

function resolveJsonPointer(root: AnyRecord, pointer: string): any {
  // Supports refs like "#/components/schemas/Foo"
  const clean = pointer.replace(/^#\//, '')
  const parts = clean.split('/').filter(Boolean).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'))

  let cur: any = root
  for (const part of parts) {
    if (cur == null) return undefined
    cur = cur[part]
  }
  return cur
}

function derefSchema(schema: any, root: AnyRecord, seen = new Map<string, any>()): any {
  if (!schema || typeof schema !== 'object') return schema

  if (typeof schema.$ref === 'string') {
    const ref = schema.$ref
    if (seen.has(ref)) return seen.get(ref)

    const resolved = resolveJsonPointer(root, ref)
    if (!resolved) return schema

    // Track before recursion to handle cycles gracefully
    const placeholder: any = {}
    seen.set(ref, placeholder)
    const derefResolved = derefSchema(resolved, root, seen)
    Object.assign(placeholder, derefResolved)
    return placeholder
  }

  if (Array.isArray(schema)) return schema.map((v) => derefSchema(v, root, seen))

  const out: AnyRecord = {}
  for (const [k, v] of Object.entries(schema)) {
    out[k] = derefSchema(v, root, seen)
  }
  return out
}

export function createAjv(): Ajv {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
  })

  // OpenAPI-specific keywords (non-JSONSchema) that commonly appear in specs.
  for (const kw of ['example', 'nullable', 'deprecated']) {
    try {
      ajv.addKeyword(kw)
    } catch {
      // Keyword may already exist depending on Ajv build/options; ignore.
    }
  }

  return ajv
}

export function getResolvedSchema(schema: any): any {
  const spec = getOpenApiSpec()
  return derefSchema(schema, spec)
}


