import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function loadCapability(capabilityId) {
  const filepath = path.join(__dirname, `${capabilityId}.json`)
  const content = await fs.readFile(filepath, 'utf-8')
  return JSON.parse(content)
}

export async function listCapabilities() {
  const files = await fs.readdir(__dirname)
  const capabilities = []
  for (const file of files) {
    if (file.endsWith('.json') && file !== 'registry.mjs') {
      const capabilityId = file.replace('.json', '')
      try {
        const capability = await loadCapability(capabilityId)
        capabilities.push(capability)
      } catch (err) {
        console.warn(`Failed to load capability ${capabilityId}:`, err.message)
      }
    }
  }
  return capabilities
}

