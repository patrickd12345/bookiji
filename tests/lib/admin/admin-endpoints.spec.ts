import fs from 'fs'
import path from 'path'
import { it, expect } from 'vitest'

// Resolve to repository root
const root = path.resolve(__dirname, '..', '..', '..')

const filesToCheck = [
  'src/app/api/admin/bookings/route.ts',
  'src/app/api/admin/payments/route.ts',
  'src/app/api/admin/providers/route.ts',
  'src/app/api/admin/reviews/route.ts',
  'src/app/api/admin/rate-limits/route.ts',
  'src/app/api/admin/abuse-patterns/route.ts',
  'src/app/api/admin/feature-flags/route.ts',
  'src/app/api/admin/kill-switches/route.ts',
  'src/app/api/admin/health/route.ts',
  'src/app/api/admin/services/status/route.ts',
  'src/app/api/admin/errors/route.ts',
  'src/app/api/admin/errors/trends/route.ts',
  'src/app/api/admin/abuse/rate-limit-violations/route.ts',
  'src/app/api/admin/abuse/suspicious-activity/route.ts'
]

it('admin API route files exist', () => {
  for (const f of filesToCheck) {
    const full = path.join(root, f)
    expect(fs.existsSync(full)).toBeTruthy()
  }
})

it('admin API routes include requireAdmin checks', () => {
  for (const f of filesToCheck) {
    const full = path.join(root, f)
    const content = fs.readFileSync(full, 'utf8')
    expect(content.includes('requireAdmin')).toBeTruthy()
  }
})

