import { headers } from 'next/headers'
import { detectServerLocale } from '@/lib/i18n/useI18n'
import HomePageClient from './HomePageClient'

export default function HomePage() {
  const locale = detectServerLocale(headers())
  return <HomePageClient initialLocale={locale} />
}
