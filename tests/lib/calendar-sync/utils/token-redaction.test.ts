import { describe, it, expect } from 'vitest'
import { redactTokens, safeLog } from '@/lib/calendar-sync/utils/token-redaction'

describe('Token Redaction', () => {
  describe('redactTokens', () => {
    it('redacts access_token', () => {
      const obj = {
        access_token: 'secret-token-123',
        other_field: 'value',
      }
      const redacted = redactTokens(obj) as typeof obj
      expect(redacted.access_token).toBe('[REDACTED]')
      expect(redacted.other_field).toBe('value')
    })

    it('redacts refresh_token', () => {
      const obj = {
        refresh_token: 'secret-refresh-123',
        other_field: 'value',
      }
      const redacted = redactTokens(obj) as typeof obj
      expect(redacted.refresh_token).toBe('[REDACTED]')
      expect(redacted.other_field).toBe('value')
    })

    it('redacts token field', () => {
      const obj = {
        token: 'secret-token-123',
        other_field: 'value',
      }
      const redacted = redactTokens(obj) as typeof obj
      expect(redacted.token).toBe('[REDACTED]')
      expect(redacted.other_field).toBe('value')
    })

    it('redacts nested tokens', () => {
      const obj = {
        user: {
          access_token: 'secret-123',
          name: 'John',
        },
        other_field: 'value',
      }
      const redacted = redactTokens(obj) as typeof obj
      expect((redacted.user as any).access_token).toBe('[REDACTED]')
      expect((redacted.user as any).name).toBe('John')
      expect(redacted.other_field).toBe('value')
    })

    it('redacts tokens in arrays', () => {
      const obj = {
        items: [
          { access_token: 'token-1', name: 'Item 1' },
          { refresh_token: 'token-2', name: 'Item 2' },
        ],
      }
      const redacted = redactTokens(obj) as typeof obj
      expect((redacted.items[0] as any).access_token).toBe('[REDACTED]')
      expect((redacted.items[0] as any).name).toBe('Item 1')
      expect((redacted.items[1] as any).refresh_token).toBe('[REDACTED]')
      expect((redacted.items[1] as any).name).toBe('Item 2')
    })

    it('handles null and undefined', () => {
      expect(redactTokens(null)).toBe(null)
      expect(redactTokens(undefined)).toBe(undefined)
    })

    it('handles non-objects', () => {
      expect(redactTokens('string')).toBe('string')
      expect(redactTokens(123)).toBe(123)
      expect(redactTokens(true)).toBe(true)
    })

    it('redacts case-insensitive token fields', () => {
      const obj = {
        Access_Token: 'secret-123',
        REFRESH_TOKEN: 'secret-456',
      }
      const redacted = redactTokens(obj) as typeof obj
      expect((redacted as any).Access_Token).toBe('[REDACTED]')
      expect((redacted as any).REFRESH_TOKEN).toBe('[REDACTED]')
    })
  })

  describe('safeLog', () => {
    it('logs message without data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      safeLog('Test message')
      expect(consoleSpy).toHaveBeenCalledWith('Test message')
      consoleSpy.mockRestore()
    })

    it('logs message with redacted data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      safeLog('Test message', { access_token: 'secret-123', name: 'John' })
      expect(consoleSpy).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          access_token: '[REDACTED]',
          name: 'John',
        })
      )
      consoleSpy.mockRestore()
    })
  })
})
