import { describe, it, expect } from 'vitest';
import { SeoManager } from '@/lib/seo/seoManager';

describe('SeoManager', () => {
  it('calls Abel and returns confirmation', () => {
    const result = SeoManager.callAbel();
    expect(result).toBe('Abel called');
  });
});
