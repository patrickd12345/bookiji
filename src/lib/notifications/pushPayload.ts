import { t } from '@/lib/i18n/server'

export interface PushPayload {
  title: string
  body: string
  icon: string
  badge: string
  tag?: string
  data?: Record<string, unknown>
}

export function buildPushPayload(template: string, data: Record<string, unknown>): PushPayload {
  const locale = typeof data.locale === 'string' ? data.locale : undefined
  const service = typeof data.service === 'string' ? data.service : ''
  const date = typeof data.date === 'string' ? data.date : ''
  const time = typeof data.time === 'string' ? data.time : ''
  const expectations = typeof data.expectations === 'string' ? data.expectations : ''

  const mapping: Record<string, PushPayload> = {
    booking_confirmation: {
      title: t(locale, 'push.booking_confirmed.title'),
      body: t(locale, 'push.booking_confirmed.body', { service, date, time }),
      icon: '/icons/confirm.png',
      badge: '/icons/icon-72x72.png'
    },
    booking_created: {
      title: t(locale, 'push.booking_confirmed.title'),
      body: t(locale, 'push.booking_confirmed.body', { service, date, time }),
      icon: '/icons/confirm.png',
      badge: '/icons/icon-72x72.png'
    },
    booking_updated: {
      title: t(locale, 'push.booking_updated.title'),
      body: t(locale, 'push.booking_updated.body', { service, date, time }),
      icon: '/icons/update.png',
      badge: '/icons/icon-72x72.png'
    },
    booking_cancelled: {
      title: t(locale, 'push.booking_cancelled.title'),
      body: t(locale, 'push.booking_cancelled.body'),
      icon: '/icons/cancel.png',
      badge: '/icons/icon-72x72.png'
    },
    vendor_welcome: {
      title: t(locale, 'push.vendor_welcome.title'),
      body: data.requires_approval
        ? t(locale, 'push.vendor_welcome.body_pending')
        : t(locale, 'push.vendor_welcome.body_ready'),
      icon: '/icons/welcome.png',
      badge: '/icons/icon-72x72.png'
    },
    admin_alert: {
      title: t(locale, 'push.admin_alert.title'),
      body: t(locale, 'push.admin_alert.body', {
        type: typeof data.type === 'string' ? data.type : '',
        details: typeof data.details === 'string' ? data.details : ''
      }),
      icon: '/icons/alert.png',
      badge: '/icons/icon-72x72.png'
    },
    reminder: {
      title: t(locale, 'push.reminder.title'),
      body: t(locale, 'push.reminder.body', { service, time, expectations }),
      icon: '/icons/reminder.png',
      badge: '/icons/icon-72x72.png'
    },
    review_reminder: {
      title: t(locale, 'push.review_reminder.title'),
      body: t(locale, 'push.review_reminder.body', { service }),
      icon: '/icons/reminder.png',
      badge: '/icons/icon-72x72.png'
    },
    rating_prompt: {
      title: t(locale, 'push.rating_prompt.title'),
      body: t(locale, 'push.rating_prompt.body', { service }),
      icon: '/icons/rating.png',
      badge: '/icons/icon-72x72.png'
    }
  }

  return (
    mapping[template] || {
      title: t(locale, 'push.default.title'),
      body: t(locale, 'push.default.body'),
      icon: '/icons/default.png',
      badge: '/icons/icon-72x72.png'
    }
  )
}
