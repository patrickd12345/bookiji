// Shared utilities for AdSense approval mode
export const ADSENSE_APPROVAL_MODE =
  process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true' ||
  process.env.ADSENSE_APPROVAL_MODE === 'true'
