export function redactPII(txt: string) {
  return txt
    .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi, '***@***')
    .replace(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{1,4})\b/g, (match, g1, g2, g3, g4) => {
      // Check if this is a continuous 16-digit number (no separators)
      if (match.replace(/\D/g, '').length === 16 && !match.includes('-') && !match.includes(' ')) {
        const lastDigit = g4.slice(-1);
        return `****-****-****-****${lastDigit}`;
      }
      // For formatted credit cards, preserve the original separator format
      const separator = match.includes('-') ? '-' : (match.includes(' ') ? ' ' : '');
      return `****${separator}****${separator}****${separator}****`;
    })
    .replace(/\b\d{16,17}\b/g, m => {
      // Handle continuous 16-17 digit numbers (like credit cards)
      const lastDigit = m.slice(-1);
      return `****-****-****-****${lastDigit}`;
    })
    .replace(/\b\+?\d[\d\s().-]{7,}\b/g, m => {
      // Skip if this looks like a credit card number that was already processed
      if (m.includes('****')) return m;
      return m.replace(/\d/g, '*');
    });
}
