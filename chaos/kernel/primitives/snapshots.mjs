import fs from 'node:fs/promises'
import path from 'node:path'

export function snapshotState(state, metadata) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const snapshot = {
    timestamp,
    metadata,
    state: JSON.parse(JSON.stringify(state)) // Deep clone
  }

  return snapshot
}

export async function saveSnapshot(snapshot, outputDir) {
  const dir = outputDir || 'chaos/forensics'
  await fs.mkdir(dir, { recursive: true })
  
  const filename = `snapshot-${snapshot.timestamp}.json`
  const filepath = path.join(dir, filename)
  
  await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2))
  
  return filepath
}

