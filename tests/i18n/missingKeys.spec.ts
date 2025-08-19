import { describe, it, expect } from 'vitest'
import en from '@/locales/en-US.json'
import fr from '@/locales/fr-FR.json'
import de from '@/locales/de-DE.json'

function flatten(obj: Record<string, any>, prefix: string[] = [], out: Record<string, true> = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const path = [...prefix, k]
    if (v && typeof v === 'object') flatten(v, path, out)
    else out[path.join('.')] = true
  }
  return out
}

describe('i18n missing keys check', () => {
  it('fr-FR and de-DE contain all keys present in en-US (allow extra keys)', () => {
    const base = flatten(en as any)
    const frFlat = flatten(fr as any)
    const deFlat = flatten(de as any)
    const missingFr = Object.keys(base).filter(k => !frFlat[k])
    const missingDe = Object.keys(base).filter(k => !deFlat[k])
    expect(missingFr).toEqual([])
    expect(missingDe).toEqual([])
  })
})


