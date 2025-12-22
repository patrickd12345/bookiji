import { describe, it, expect } from 'vitest'
import { SUPPORTED_LOCALES, getLocaleInfo } from '@/lib/i18n/config'
import { t } from '@/lib/i18n/server'

const locales = Object.keys(SUPPORTED_LOCALES)

describe('i18n formatting', () => {
  it('formats dates and times for all locales', () => {
    const sample = new Date('2025-01-15T13:45:00Z')
    locales.forEach((locale) => {
      const formatter = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC'
      })
      const output = formatter.format(sample)
      expect(output.length).toBeGreaterThan(0)
    })
  })

  it('formats currency for all locales', () => {
    locales.forEach((locale) => {
      const currency = getLocaleInfo(locale).currency.toUpperCase()
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      })
      const output = formatter.format(1234.56)
      expect(output.length).toBeGreaterThan(0)
    })
  })

  it('supports plural rules for all locales', () => {
    locales.forEach((locale) => {
      const rules = new Intl.PluralRules(locale)
      const categories = rules.resolvedOptions().pluralCategories
      expect(categories.length).toBeGreaterThan(0)
      ;[0, 1, 2, 5].forEach((value) => {
        const category = rules.select(value)
        expect(categories).toContain(category)
      })
    })
  })

  it('falls back to base locale when key is missing', () => {
    const fallback = t('fr-FR', 'missing.key')
    expect(fallback).toBe('missing.key')
  })
})
