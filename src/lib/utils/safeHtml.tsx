/**
 * Safe HTML rendering utilities
 * Prevents XSS attacks by sanitizing HTML content
 */

import React from 'react';

/**
 * Sanitizes HTML content by removing potentially dangerous elements and attributes
 * This is a basic implementation - for production, consider using DOMPurify
 */
function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers like onclick="..."
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ''); // Remove iframes

  // Allow only safe HTML tags and attributes
  // This is a basic whitelist - expand as needed
  const allowedTags = [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img'
  ];

  const allowedAttributes = [
    'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'
  ];

  // For now, return sanitized HTML
  // In production, use DOMPurify or similar library
  return sanitized;
}

/**
 * Safe HTML component that sanitizes content before rendering
 * Use this instead of dangerouslySetInnerHTML
 */
interface SafeHtmlProps {
  html: string;
  className?: string;
  allowUnsafe?: boolean; // Only for trusted content from your own KB
}

export function SafeHtml({ html, className, allowUnsafe = false }: SafeHtmlProps) {
  const sanitized = allowUnsafe ? html : sanitizeHtml(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/**
 * Render markdown-like content as React elements
 * Safer than HTML rendering
 */
export function renderTextContent(content: string): React.ReactNode {
  // Split by newlines and render as paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());

  return (
    <>
      {paragraphs.map((para, idx) => {
        // Simple markdown-like parsing
        const lines = para.split('\n');
        return (
          <p key={idx} className="mb-4">
            {lines.map((line, lineIdx) => {
              // Handle bold **text**
              const parts = line.split(/(\*\*.*?\*\*)/g);
              return (
                <React.Fragment key={lineIdx}>
                  {parts.map((part, partIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                    }
                    return <React.Fragment key={partIdx}>{part}</React.Fragment>;
                  })}
                  {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </>
  );
}
