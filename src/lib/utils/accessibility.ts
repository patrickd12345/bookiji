/**
 * Accessibility utilities for color contrast and WCAG compliance
 */

/**
 * Calculate relative luminance for a color
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @returns Relative luminance (0-1)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 First color in hex format (e.g., "#ffffff")
 * @param color2 Second color in hex format (e.g., "#000000")
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0]
  }

  const [r1, g1, b1] = hexToRgb(color1)
  const [r2, g2, b2] = hexToRgb(color2)

  const lum1 = getLuminance(r1, g1, b1)
  const lum2 = getLuminance(r2, g2, b2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param color1 First color in hex format
 * @param color2 Second color in hex format
 * @param level WCAG level ('AA' or 'AAA')
 * @param size Text size ('normal' or 'large')
 * @returns true if contrast meets standards
 */
export function meetsWCAGContrast(
  color1: string,
  color2: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(color1, color2)

  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7
  } else {
    // AA level
    return size === 'large' ? ratio >= 3 : ratio >= 4.5
  }
}

/**
 * Common color contrast checks for Bookiji theme
 */
export const CONTRAST_CHECKS = {
  // Primary button colors
  primaryButton: {
    text: '#ffffff',
    background: '#2563eb', // blue-600
    ratio: getContrastRatio('#ffffff', '#2563eb'),
    meetsAA: meetsWCAGContrast('#ffffff', '#2563eb', 'AA', 'normal'),
  },
  // Error text
  errorText: {
    text: '#dc2626', // red-600
    background: '#fef2f2', // red-50
    ratio: getContrastRatio('#dc2626', '#fef2f2'),
    meetsAA: meetsWCAGContrast('#dc2626', '#fef2f2', 'AA', 'normal'),
  },
  // Body text
  bodyText: {
    text: '#111827', // gray-900
    background: '#ffffff', // white
    ratio: getContrastRatio('#111827', '#ffffff'),
    meetsAA: meetsWCAGContrast('#111827', '#ffffff', 'AA', 'normal'),
  },
}
