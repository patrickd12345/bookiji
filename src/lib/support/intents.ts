export type Intent = 'faq' | 'booking' | 'reschedule' | 'cancel' | 'payment' | 'other';

export function classifyIntent(txt: string): Intent {
  const s = txt.toLowerCase();
  if (/(refund|chargeback|charged|payment|stripe)/.test(s)) return 'payment';
  if (/(reschedul|move|change.*time|another time)/.test(s)) return 'reschedule';
  if (/(cancel|cancellation)/.test(s)) return 'cancel';
  if (/(book|booking|availability|slot)/.test(s)) return 'booking';
  if (/(faq|how do i|help|policy|terms|price)/.test(s)) return 'faq';
  return 'other';
}
