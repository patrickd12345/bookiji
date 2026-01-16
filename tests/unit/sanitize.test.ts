
import { describe, it, expect } from 'vitest';
import { safeHTML } from '../../src/lib/sanitize';

describe('safeHTML Sanitization', () => {
  it('should return empty string for null/undefined/empty input', () => {
    // @ts-ignore
    expect(safeHTML(null).__html).toBe('');
    // @ts-ignore
    expect(safeHTML(undefined).__html).toBe('');
    expect(safeHTML('').__html).toBe('');
  });

  it('should preserve allowed tags and attributes', () => {
    const input = '<p>Hello <strong>World</strong> <a href="https://example.com" class="link">Link</a></p>';
    const output = safeHTML(input).__html;
    expect(output).toContain('<p>');
    expect(output).toContain('<strong>World</strong>');
    expect(output).toContain('<a href="https://example.com" class="link">Link</a>');
  });

  it('should strip script tags', () => {
    const input = '<script>alert("xss")</script><p>Content</p>';
    const output = safeHTML(input).__html;
    expect(output).not.toContain('<script>');
    expect(output).toContain('Content');
  });

  it('should strip inline event handlers', () => {
    const input = '<button onclick="alert(1)">Click me</button>';
    const output = safeHTML(input).__html;
    expect(output).not.toContain('onclick');
  });

  it('should strip javascript: URIs', () => {
    const input = '<a href="javascript:alert(1)">Dangerous Link</a>';
    const output = safeHTML(input).__html;
    // DOMPurify removes the attribute entirely
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('href=');
  });

  it('should strip encoded javascript: URIs', () => {
    // This previously FAILED with regex, now should PASS
    const input = '<a href="&#106;avascript:alert(1)">Encoded Link</a>';
    const output = safeHTML(input).__html;

    expect(output).not.toContain('javascript');
    expect(output).not.toContain('&#106;avascript');
    // Ensure the link text remains but the vector is gone
    expect(output).toContain('Encoded Link');
  });

  it('should handle complex nested XSS', () => {
      const input = '<div title=">"><script>alert(1)</script></div>';
      const output = safeHTML(input).__html;
      expect(output).not.toContain('<script>');
  });

  it('should handle image onerror vectors', () => {
      const input = '<img src=x onerror=alert(1)>';
      const output = safeHTML(input).__html;
      expect(output).not.toContain('onerror');
      expect(output).toContain('<img');
  });
});
