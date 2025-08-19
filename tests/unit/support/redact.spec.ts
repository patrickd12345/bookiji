import { describe, it, expect } from 'vitest';
import { redactPII } from '@/lib/support/redact';

describe('PII Redaction', () => {
  it('redacts email addresses', () => {
    const input = 'Please contact me at user@example.com for more details';
    const expected = 'Please contact me at ***@*** for more details';
    expect(redactPII(input)).toBe(expected);
  });

  it('redacts phone numbers in various formats', () => {
    const inputs = [
      'Call me at 123-456-7890',
      'My number is +1 (123) 456 7890',
      'Contact: 1234567890'
    ];
    
    const expected = [
      'Call me at ***-***-****',
      'My number is +* (***) *** ****',
      'Contact: **********'
    ];
    
    inputs.forEach((input, i) => {
      expect(redactPII(input)).toBe(expected[i]);
    });
  });

  it('redacts credit card numbers', () => {
    const inputs = [
      'My card is 4111-1111-1111-1111',
      'Card: 4111 1111 1111 1111',
      '41111111111111112'
    ];
    
    const expected = [
      'My card is ****-****-****-****',
      'Card: **** **** **** ****',
      '****-****-****-****2'
    ];
    
    inputs.forEach((input, i) => {
      expect(redactPII(input)).toBe(expected[i]);
    });
  });

  it('preserves regular text', () => {
    const input = 'This is a normal sentence with no PII.';
    expect(redactPII(input)).toBe(input);
  });
});
