import { describe, it, expect } from 'vitest';
import { searchArticles } from '@/lib/helpArticles';

describe('help article search', () => {
  it('finds articles by keyword in title', () => {
    const res = searchArticles('booking');
    expect(res.some(a => a.slug === 'how-booking-works')).toBe(true);
  });

  it('matches by tag with partial word', () => {
    const res = searchArticles('curr');
    expect(res.some(a => a.slug === 'languages-currency')).toBe(true);
  });

  it('supports fuzzy matching', () => {
    const res = searchArticles('bkg');
    expect(res.some(a => a.slug === 'how-booking-works')).toBe(true);
  });
});
