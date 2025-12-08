import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const sourceDir = new URL('../public', import.meta.url)
const targetDir = path.resolve(process.cwd(), '../../dist/voice-console')

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

copyRecursive(fileURLToPath(sourceDir), targetDir)
console.log(`Copied voice console assets to ${targetDir}`)
