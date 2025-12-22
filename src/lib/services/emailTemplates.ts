interface TemplateData {
  [key: string]: unknown;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

import { t } from '@/lib/i18n/server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export function getEmailTemplate(template: string, data: TemplateData): EmailTemplate {
  const locale = typeof data.locale === 'string' ? data.locale : undefined
  const name = typeof data.name === 'string' ? data.name : ''
  const service = typeof data.service === 'string' ? data.service : ''
  const date = typeof data.date === 'string' ? data.date : ''
  const time = typeof data.time === 'string' ? data.time : ''
  switch (template) {
    case 'verify_email':
      return {
        subject: t(locale, 'email.verify_email.subject'),
        html: t(locale, 'email.verify_email.body', {
          name,
          link: `${BASE_URL}/auth/verify?token=${data.token}`
        })
      };
    case 'password_reset':
      return {
        subject: t(locale, 'email.password_reset.subject'),
        html: t(locale, 'email.password_reset.body', {
          name,
          link: `${BASE_URL}/auth/reset?token=${data.token}`
        })
      };
    case 'booking_created':
      return {
        subject: t(locale, 'email.booking_created.subject', { service }),
        html: t(locale, 'email.booking_created.body', {
          name: typeof data.customer_name === 'string' ? data.customer_name : name,
          service,
          date,
          time
        })
      };
    case 'booking_updated':
      return {
        subject: t(locale, 'email.booking_updated.subject', { service }),
        html: t(locale, 'email.booking_updated.body', {
          service,
          date
        })
      };
    case 'booking_cancelled':
      return {
        subject: t(locale, 'email.booking_cancelled.subject', { service }),
        html: t(locale, 'email.booking_cancelled.body', { service })
      };
    case 'review_reminder':
      return {
        subject: t(locale, 'email.review_reminder.subject'),
        html: t(locale, 'email.review_reminder.body')
      };
    case 'rating_prompt':
      return {
        subject: t(locale, 'email.rating_prompt.subject'),
        html: t(locale, 'email.rating_prompt.body', {
          service,
          link: typeof data.rating_link === 'string' ? data.rating_link : `${BASE_URL}/customer/dashboard?tab=bookings`
        })
      };
    default:
      return {
        subject: t(locale, 'email.default.subject'),
        html: t(locale, 'email.default.body')
      };
  }
}

