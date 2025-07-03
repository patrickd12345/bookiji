import HomePageClient from './HomePageClient'
import { detectLocaleFromHeaders, DEFAULT_LOCALE } from '@/lib/i18n/config'
import { headers } from 'next/headers'

export default async function HomePage() {
  const hdrs = await headers()
  const acceptLanguage = hdrs.get('accept-language') || undefined
  const detected = detectLocaleFromHeaders(acceptLanguage)
  const locale = detected?.code || DEFAULT_LOCALE
  return <HomePageClient initialLocale={locale} />
} 
