import HomePageClient from './HomePageClient'
import { detectServerLocale } from '@/lib/i18n/useI18n'
import { headers } from 'next/headers'

export default function HomePage() {
  const locale = detectServerLocale(headers() as unknown as Headers)
  return <HomePageClient initialLocale={locale} />
} 
