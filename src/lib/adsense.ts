// Shared utilities for AdSense approval mode
const isOn = (v?: string) => (v ?? '').toLowerCase() === 'true'

export const ADSENSE_APPROVAL_MODE =
  isOn(process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE) ||
  isOn(process.env.ADSENSE_APPROVAL_MODE)

export const ADSENSE_GLOBAL_OFF = isOn(process.env.NEXT_PUBLIC_ADSENSE_GLOBAL_OFF)