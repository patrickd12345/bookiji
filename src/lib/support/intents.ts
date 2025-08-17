export type Intent = 'faq' | 'booking' | 'phone-support' | 'payment' | 'other';

export function classifyIntent(txt: string): Intent {
  const s = txt.toLowerCase();
  if (/(refund|chargeback|charged|payment|stripe)/.test(s)) return 'payment';
  if (/(reschedul|move|change.*time|another time|cancel|cancellation)/.test(s)) return 'phone-support';
  if (/(book|booking|availability|slot)/.test(s)) return 'booking';
  if (/(faq|how do i|help|policy|terms|price)/.test(s)) return 'faq';
  return 'other';
}
