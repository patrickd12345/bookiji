#!/usr/bin/env node
/**
 * AI-Powered Translation Script
 * Uses built-in translations to translate all missing and untranslated keys
 * No API key required - uses AI knowledge directly
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const localesDir = path.resolve('src/locales')
const baseLocale = 'en-US'
const basePath = path.join(localesDir, `${baseLocale}.json`)
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'))

// Translation mappings for common keys
// These are high-quality translations for the most common untranslated keys
const TRANSLATIONS = {
  'ru-RU': {
    'email.verify_email.subject': 'Подтвердите ваш email',
    'email.verify_email.body': 'Привет, {{name}}, подтвердите ваш email: {{link}}',
    'email.password_reset.subject': 'Сброс пароля',
    'email.password_reset.body': 'Привет, {{name}}, сбросьте пароль: {{link}}',
    'email.booking_created.subject': 'Бронирование подтверждено - {{service}}',
    'email.booking_created.body': 'Привет, {{name}}, ваше бронирование для {{service}} на {{date}} в {{time}} подтверждено.',
    'email.booking_updated.subject': 'Бронирование обновлено - {{service}}',
    'email.booking_updated.body': 'Ваше бронирование для {{service}} на {{date}} было обновлено.',
    'email.booking_cancelled.subject': 'Бронирование отменено - {{service}}',
    'email.booking_cancelled.body': 'Ваше бронирование для {{service}} было отменено.',
    'email.review_reminder.subject': 'Оставьте отзыв',
    'email.review_reminder.body': 'Пожалуйста, найдите время, чтобы оставить отзыв о недавней услуге.',
    'email.rating_prompt.subject': 'Оцените ваше бронирование',
    'email.rating_prompt.body': 'Как вам {{service}}? Оставьте оценку здесь: {{link}}',
    'email.default.subject': 'Уведомление',
    'email.default.body': 'У вас новое уведомление.',
    'sms.verify_email': 'Подтвердите ваш email, {{name}}.',
    'sms.password_reset': 'Сбросьте пароль, {{name}}.',
    'sms.booking_created': 'Бронирование подтверждено для {{service}} на {{date}} в {{time}}.',
    'sms.booking_updated': 'Бронирование обновлено для {{service}} на {{date}}.',
    'sms.booking_cancelled': 'Бронирование для {{service}} отменено.',
    'sms.review_reminder': 'Пожалуйста, оставьте отзыв о недавней услуге.',
    'sms.rating_prompt': 'Оцените ваше бронирование для {{service}}: {{link}}',
    'sms.default': 'Уведомление от Bookiji.',
    'push.booking_confirmed.title': 'Бронирование подтверждено',
    'push.booking_confirmed.body': '{{service}} на {{date}} в {{time}}',
    'push.booking_updated.title': 'Бронирование обновлено',
    'push.booking_updated.body': '{{service}} на {{date}} в {{time}}',
    'push.booking_cancelled.title': 'Бронирование отменено',
    'push.booking_cancelled.body': 'Ваше бронирование было отменено.',
    'push.vendor_welcome.title': 'Добро пожаловать в Bookiji',
    'push.vendor_welcome.body_pending': 'Ваш профиль ожидает проверки.',
    'push.vendor_welcome.body_ready': 'Подтвердите ваш email, чтобы начать.',
    'push.admin_alert.title': 'Предупреждение администратора',
    'push.admin_alert.body': '{{type}}: {{details}}',
    'push.reminder.title': 'Напоминание о встрече',
    'push.review_reminder.title': 'Оставьте отзыв',
    'push.review_reminder.body': 'Пожалуйста, оставьте отзыв о {{service}}.',
    'push.rating_prompt.title': 'Оцените ваше бронирование',
    'push.rating_prompt.body': 'Как вам {{service}}?',
    'push.default.title': 'Уведомление',
    'push.default.body': 'У вас новое уведомление.',
    'error.auth_required': 'Требуется аутентификация.',
    'error.missing_fields': 'Отсутствуют обязательные поля.',
    'error.rating_invalid': 'Оценка должна быть от 1.0 до 5.0 с шагом в ползвезды.',
    'error.rating_comment_too_long': 'Комментарий к оценке слишком длинный.',
    'error.profile_not_found': 'Профиль не найден.',
    'error.booking_not_found': 'Бронирование не найдено.',
    'error.rating_not_allowed': 'Оценка не разрешена для этого бронирования.',
    'error.rating_duplicate': 'Вы уже оценили это бронирование.',
    'error.rating_create_failed': 'Не удалось отправить оценку.',
    'error.rating_fetch_failed': 'Не удалось загрузить оценки.',
    'rating.title': 'Оцените ваше бронирование',
    'rating.subtitle': 'Поделитесь быстрой оценкой этого бронирования.',
    'rating.stars_label': 'Ваша оценка',
    'rating.comment_label': 'Комментарий (необязательно)',
    'rating.comment_placeholder': 'Поделитесь короткой заметкой (необязательно).',
    'rating.submit': 'Отправить оценку',
    'rating.submitting': 'Отправка...',
    'rating.submitted': 'Спасибо за оценку этого бронирования.',
    'rating.already_submitted': 'Вы уже оценили это бронирование.',
    'rating.not_allowed': 'Оценка недоступна для этого бронирования.',
    'rating.load_failed': 'Не удалось загрузить детали оценки.',
    'rating.loading': 'Загрузка оценки...',
    'rating.select_stars': 'Выберите оценку звездами, чтобы продолжить.',
    'rating.rate_booking': 'Оценить бронирование',
    'rating.back_to_bookings': 'Назад к бронированиям'
  },
  'ar-SA': {
    'email.verify_email.subject': 'تحقق من بريدك الإلكتروني',
    'email.verify_email.body': 'مرحباً {{name}}، تحقق من بريدك الإلكتروني: {{link}}',
    'email.password_reset.subject': 'إعادة تعيين كلمة المرور',
    'email.password_reset.body': 'مرحباً {{name}}، أعد تعيين كلمة المرور: {{link}}',
    'email.booking_created.subject': 'تم تأكيد الحجز - {{service}}',
    'email.booking_created.body': 'مرحباً {{name}}، تم تأكيد حجزك لـ {{service}} في {{date}} الساعة {{time}}.',
    'email.booking_updated.subject': 'تم تحديث الحجز - {{service}}',
    'email.booking_updated.body': 'تم تحديث حجزك لـ {{service}} في {{date}}.',
    'email.booking_cancelled.subject': 'تم إلغاء الحجز - {{service}}',
    'email.booking_cancelled.body': 'تم إلغاء حجزك لـ {{service}}.',
    'email.review_reminder.subject': 'اترك تقييماً',
    'email.review_reminder.body': 'يرجى تخصيص لحظة لتقييم خدمتك الأخيرة.',
    'email.rating_prompt.subject': 'قيم حجزك',
    'email.rating_prompt.body': 'كيف كانت {{service}}؟ اترك تقييماً هنا: {{link}}',
    'email.default.subject': 'إشعار',
    'email.default.body': 'لديك إشعار جديد.',
    'sms.verify_email': 'تحقق من بريدك الإلكتروني، {{name}}.',
    'sms.password_reset': 'أعد تعيين كلمة المرور، {{name}}.',
    'sms.booking_created': 'تم تأكيد الحجز لـ {{service}} في {{date}} الساعة {{time}}.',
    'sms.booking_updated': 'تم تحديث الحجز لـ {{service}} في {{date}}.',
    'sms.booking_cancelled': 'تم إلغاء الحجز لـ {{service}}.',
    'sms.review_reminder': 'يرجى تقييم خدمتك الأخيرة.',
    'sms.rating_prompt': 'قيم حجزك لـ {{service}}: {{link}}',
    'sms.default': 'إشعار من Bookiji.',
    'push.booking_confirmed.title': 'تم تأكيد الحجز',
    'push.booking_confirmed.body': '{{service}} في {{date}} الساعة {{time}}',
    'push.booking_updated.title': 'تم تحديث الحجز',
    'push.booking_updated.body': '{{service}} في {{date}} الساعة {{time}}',
    'push.booking_cancelled.title': 'تم إلغاء الحجز',
    'push.booking_cancelled.body': 'تم إلغاء حجزك.',
    'push.vendor_welcome.title': 'مرحباً بك في Bookiji',
    'push.vendor_welcome.body_pending': 'ملفك الشخصي قيد المراجعة.',
    'push.vendor_welcome.body_ready': 'تحقق من بريدك الإلكتروني للبدء.',
    'push.admin_alert.title': 'تنبيه المسؤول',
    'push.admin_alert.body': '{{type}}: {{details}}',
    'push.reminder.title': 'تذكير بالموعد',
    'push.review_reminder.title': 'اترك تقييماً',
    'push.review_reminder.body': 'يرجى تقييم {{service}}.',
    'push.rating_prompt.title': 'قيم حجزك',
    'push.rating_prompt.body': 'كيف كانت {{service}}؟',
    'push.default.title': 'إشعار',
    'push.default.body': 'لديك إشعار جديد.',
    'error.auth_required': 'مطلوب المصادقة.',
    'error.missing_fields': 'الحقول المطلوبة مفقودة.',
    'error.rating_invalid': 'يجب أن تكون التقييم بين 1.0 و 5.0 بزيادات نصف نجمة.',
    'error.rating_comment_too_long': 'تعليق التقييم طويل جداً.',
    'error.profile_not_found': 'الملف الشخصي غير موجود.',
    'error.booking_not_found': 'الحجز غير موجود.',
    'error.rating_not_allowed': 'التقييم غير مسموح لهذا الحجز.',
    'error.rating_duplicate': 'لقد قيمت هذا الحجز بالفعل.',
    'error.rating_create_failed': 'فشل إرسال التقييم.',
    'error.rating_fetch_failed': 'فشل تحميل التقييمات.',
    'rating.title': 'قيم حجزك',
    'rating.subtitle': 'شارك تقييماً سريعاً لهذا الحجز.',
    'rating.stars_label': 'تقييمك',
    'rating.comment_label': 'تعليق (اختياري)',
    'rating.comment_placeholder': 'شارك ملاحظة قصيرة (اختياري).',
    'rating.submit': 'إرسال التقييم',
    'rating.submitting': 'جاري الإرسال...',
    'rating.submitted': 'شكراً لتقييمك هذا الحجز.',
    'rating.already_submitted': 'لقد قيمت هذا الحجز بالفعل.',
    'rating.not_allowed': 'التقييم غير متاح لهذا الحجز.',
    'rating.load_failed': 'تعذر تحميل تفاصيل التقييم.',
    'rating.loading': 'جاري تحميل التقييم...',
    'rating.select_stars': 'اختر تقييماً بالنجوم للمتابعة.',
    'rating.rate_booking': 'قيم الحجز',
    'rating.back_to_bookings': 'العودة إلى الحجوزات'
  }
  // Add more languages as needed - I'll generate them on demand
}

/**
 * Get missing keys for a locale
 */
function getMissingKeys(locale) {
  const localePath = path.join(localesDir, `${locale}.json`)
  if (!fs.existsSync(localePath)) return []

  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'))
  const baseKeys = Object.keys(base)
  return baseKeys.filter(k => !(k in data))
}

/**
 * Get untranslated keys (keys that exist but match English values)
 */
function getUntranslatedKeys(locale) {
  const localePath = path.join(localesDir, `${locale}.json`)
  if (!fs.existsSync(localePath)) return []

  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'))
  const baseKeys = Object.keys(base)
  
  // For English variants, don't consider them untranslated
  const isEnglishVariant = locale.startsWith('en-')
  
  return baseKeys.filter(k => {
    if (!(k in data)) return false
    // Check if the value is the same as master (untranslated)
    return !isEnglishVariant && base[k] === data[k]
  })
}

/**
 * Generate translation using AI knowledge
 * This is a placeholder - in practice, you'd use an AI API or built-in translations
 */
function generateTranslation(text, targetLocale) {
  // Check if we have a pre-built translation
  const localeTranslations = TRANSLATIONS[targetLocale]
  if (localeTranslations) {
    // Try to find a similar key - this is simplified
    // In practice, we'd need the key to match exactly
    return null // Will be handled by key-based lookup
  }
  
  // For now, return null to use key-based translations
  return null
}

/**
 * Apply translations to a locale
 */
async function translateLocale(locale, keys, dryRun = false, translateUntranslated = false) {
  console.log(`\n🌍 Translating ${locale}...`)
  const localePath = path.join(localesDir, `${locale}.json`)
  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'))
  
  const localeTranslations = TRANSLATIONS[locale] || {}
  let translated = 0
  let skipped = 0

  for (const key of keys) {
    const englishText = base[key]
    
    // Skip if already translated (exists and different from English)
    if (key in data && data[key] !== englishText && !translateUntranslated) {
      continue
    }

    // If translating untranslated keys, only translate if value matches English
    if (translateUntranslated && key in data && data[key] !== englishText) {
      continue
    }

    // Check if we have a translation for this key
    if (localeTranslations[key]) {
      if (dryRun) {
        const currentValue = data[key] || '(missing)'
        const status = currentValue === englishText ? '[UNTRANSLATED]' : '[MISSING]'
        console.log(`  [DRY RUN] ${status} Would translate: ${key}`)
        console.log(`    English: "${englishText}"`)
        console.log(`    ${locale}: "${localeTranslations[key]}"`)
        translated++
      } else {
        data[key] = localeTranslations[key]
        translated++
        console.log(`  ✅ ${key}`)
      }
    } else {
      skipped++
      if (!dryRun) {
        // Keep English fallback if no translation available
        data[key] = englishText
      }
    }
  }

  if (!dryRun && translated > 0) {
    // Sort keys to match base locale
    const sorted = {}
    Object.keys(base).forEach(k => {
      if (k in data) {
        sorted[k] = data[k]
      }
    })

    fs.writeFileSync(localePath, JSON.stringify(sorted, null, 2) + '\n')
  }

  if (skipped > 0 && !dryRun) {
    console.log(`  ⚠️  ${skipped} keys kept as English (no translation available)`)
  }

  return { translated, skipped }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const translateUntranslated = args.includes('--untranslated') || args.includes('--all')
  const localeFilter = args.find(arg => arg.startsWith('--locale='))?.split('=')[1]

  console.log(`\n🤖 AI-Powered Translation (No API Key Required)`)
  console.log(`📝 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`🎯 Scope: ${translateUntranslated ? 'Missing + Untranslated keys' : 'Missing keys only'}`)
  if (localeFilter) {
    console.log(`🎯 Filter: ${localeFilter}`)
  }

  // Get all locales
  const allLocales = fs.readdirSync(localesDir)
    .filter(file => file.endsWith('.json') && file !== 'en-US.json')
    .map(file => file.replace('.json', ''))

  const localesToProcess = localeFilter 
    ? [localeFilter] 
    : allLocales.filter(locale => {
        const missing = getMissingKeys(locale)
        const untranslated = translateUntranslated ? getUntranslatedKeys(locale) : []
        return missing.length > 0 || untranslated.length > 0
      })

  if (localesToProcess.length === 0) {
    console.log('\n✅ All locales are complete!')
    return
  }

  // Filter to only locales we have translations for
  const availableLocales = localesToProcess.filter(locale => TRANSLATIONS[locale])
  const unavailableLocales = localesToProcess.filter(locale => !TRANSLATIONS[locale])

  if (unavailableLocales.length > 0) {
    console.log(`\n⚠️  No translations available for: ${unavailableLocales.join(', ')}`)
    console.log(`   Available locales: ${Object.keys(TRANSLATIONS).join(', ')}`)
  }

  if (availableLocales.length === 0) {
    console.log('\n❌ No locales with available translations to process')
    return
  }

  console.log(`\n📊 Processing ${availableLocales.length} locale(s)...`)

  let totalTranslated = 0
  let totalSkipped = 0

  for (const locale of availableLocales) {
    const missing = getMissingKeys(locale)
    const untranslated = translateUntranslated ? getUntranslatedKeys(locale) : []
    const allKeys = [...new Set([...missing, ...untranslated])]

    if (allKeys.length === 0) {
      console.log(`\n⏭️  ${locale}: Already complete`)
      continue
    }

    console.log(`\n📋 ${locale}: ${missing.length} missing, ${untranslated.length} untranslated`)
    
    const result = await translateLocale(locale, allKeys, dryRun, translateUntranslated)
    totalTranslated += result.translated
    totalSkipped += result.skipped
  }

  console.log(`\n📊 Summary:`)
  console.log(`  ✅ Translated: ${totalTranslated}`)
  if (totalSkipped > 0) {
    console.log(`  ⚠️  Skipped (no translation): ${totalSkipped}`)
  }
  
  if (dryRun) {
    console.log(`\n💡 Run without --dry-run to apply translations`)
  }
}

main().catch(console.error)












