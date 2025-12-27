/**
 * Sanitization Utility Tests
 * 
 * Tests that ensure XSS protection works correctly.
 */

import { describe, it, expect } from 'vitest'
import { sanitizeHTML, safeHTML, isHTML } from './sanitize'

describe('XSS Sanitization', () => {
  describe('sanitizeHTML', () => {
    it('removes script tags', () => {
      const malicious = '<script>alert("XSS")</script><p>Safe content</p>'
      const sanitized = sanitizeHTML(malicious)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('Safe content')
    })

    it('removes event handlers', () => {
      const malicious = '<p onclick="alert(\'XSS\')">Click me</p>'
      const sanitized = sanitizeHTML(malicious)
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).toContain('Click me')
    })

    it('removes javascript: URLs', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Link</a>'
      const sanitized = sanitizeHTML(malicious)
      expect(sanitized).not.toContain('javascript:')
    })

    it('allows safe HTML tags', () => {
      const safe = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>'
      const sanitized = sanitizeHTML(safe)
      expect(sanitized).toContain('<p>')
      expect(sanitized).toContain('<strong>')
      expect(sanitized).toContain('<em>')
    })

    it('allows safe attributes', () => {
      const safe = '<a href="https://example.com" title="Link">Link</a>'
      const sanitized = sanitizeHTML(safe)
      expect(sanitized).toContain('href=')
      expect(sanitized).toContain('title=')
    })

    it('removes unsafe attributes', () => {
      const unsafe = '<div style="background: url(javascript:alert(1))">Content</div>'
      const sanitized = sanitizeHTML(unsafe)
      // Style attribute should be removed or sanitized
      expect(sanitized).not.toContain('javascript:')
    })

    it('preserves content when stripping dangerous tags', () => {
      const malicious = '<script>alert("XSS")</script>Hello World'
      const sanitized = sanitizeHTML(malicious)
      expect(sanitized).toContain('Hello World')
    })
  })

  describe('safeHTML', () => {
    it('returns object with __html property', () => {
      const result = safeHTML('<p>Test</p>')
      expect(result).toHaveProperty('__html')
      expect(typeof result.__html).toBe('string')
    })

    it('sanitizes content in __html', () => {
      const malicious = '<script>alert("XSS")</script>'
      const result = safeHTML(malicious)
      expect(result.__html).not.toContain('<script>')
    })
  })

  describe('isHTML', () => {
    it('detects HTML content', () => {
      expect(isHTML('<p>Content</p>')).toBe(true)
      expect(isHTML('<div>Test</div>')).toBe(true)
    })

    it('detects plain text', () => {
      expect(isHTML('Plain text')).toBe(false)
      expect(isHTML('No tags here')).toBe(false)
    })

    it('handles edge cases', () => {
      expect(isHTML('')).toBe(false)
      expect(isHTML('<')).toBe(false)
      expect(isHTML('>')).toBe(false)
    })
  })
})

