import { describe, it, expect } from 'vitest';
import { getEmailTemplate } from '@/lib/services/emailTemplates';

describe('auth email templates', () => {
  it('includes token in verify link', () => {
    const { html } = getEmailTemplate('verify_email', { name: 'A', token: '123' });
    expect(html).toContain('/auth/verify?token=123');
  });
  it('includes token in reset link', () => {
    const { html } = getEmailTemplate('password_reset', { name: 'A', token: 'abc' });
    expect(html).toContain('/auth/reset?token=abc');
  });
});
