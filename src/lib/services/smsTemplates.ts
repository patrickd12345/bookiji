import { t } from '@/lib/i18n/server'

interface TemplateData {
  [key: string]: unknown;
}

export function getSmsTemplate(template: string, data: TemplateData): string {
  const locale = typeof data.locale === 'string' ? data.locale : undefined
  const name = typeof data.name === 'string' ? data.name : ''
  const service = typeof data.service === 'string' ? data.service : ''
  const date = typeof data.date === 'string' ? data.date : ''
  const time = typeof data.time === 'string' ? data.time : ''
  switch (template) {
    case 'verify_email':
      return t(locale, 'sms.verify_email', { name });
    case 'password_reset':
      return t(locale, 'sms.password_reset', { name });
    case 'booking_created':
      return t(locale, 'sms.booking_created', { service, date, time });
    case 'booking_updated':
      return t(locale, 'sms.booking_updated', { service, date });
    case 'booking_cancelled':
      return t(locale, 'sms.booking_cancelled', { service });
    case 'review_reminder':
      return t(locale, 'sms.review_reminder');
    case 'rating_prompt':
      return t(locale, 'sms.rating_prompt', {
        service,
        link: typeof data.rating_link === 'string' ? data.rating_link : ''
      });
    case 'jarvis_incident':
      // Jarvis incident SMS - use message directly from data
      return typeof data.message === 'string' ? data.message : 'Jarvis incident alert';
    case 'jarvis_confirmation':
      // Jarvis confirmation SMS
      return typeof data.message === 'string' ? data.message : 'Jarvis action confirmed';
    default:
      return t(locale, 'sms.default');
  }
}

